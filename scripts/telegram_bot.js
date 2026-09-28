/**
 * telegram_bot.js
 * Antigravity Personal Assistant Bot (Telegram Bridge)
 * Permite a Alejandro comunicarse con Antigravity desde su celular para:
 * - Consultas libres de IA y desarrollo
 * - Control remoto y estado de la PC / Proyectos (/cmd, git, pc)
 * - Guardar notas y tareas rápidas (/nota)
 * - Monitoreo en tiempo real del Libro de Lau (/libro)
 */

import https from 'https';
import os from 'os';
import { exec } from 'child_process';
import path from 'path';

// Firebase Realtime Database
const FIREBASE_URL = 'https://libro-lau-default-rtdb.firebaseio.com';

class AntigravityTelegramBot {
  constructor(token) {
    this.token = token;
    this.offset = 0;
    this.isRunning = false;
    this.allowedChatId = null;
    this.geminiApiKey = process.env.GEMINI_API_KEY || null;
  }

  async init() {
    // Intentar cargar chatId y geminiApiKey de Firebase
    try {
      const config = await this.fetchJson(`${FIREBASE_URL}/config.json`);
      if (config?.telegram?.chatId) {
        this.allowedChatId = config.telegram.chatId;
      }
      if (config?.geminiApiKey) {
        this.geminiApiKey = config.geminiApiKey;
      }
    } catch (e) {}
  }

  start() {
    this.isRunning = true;
    console.log('⚡ [Antigravity Bot] Conectado a Telegram. Esperando mensajes...');
    this.poll();
  }

  stop() {
    this.isRunning = false;
  }

  async fetchJson(url) {
    return new Promise((resolve) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });
  }

  async makeRequest(method, payload = {}) {
    const url = `https://api.telegram.org/bot${this.token}/${method}`;
    const bodyStr = JSON.stringify(payload);

    return new Promise((resolve, reject) => {
      const req = https.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ ok: false, error: e.message });
          }
        });
      });

      req.on('error', reject);
      req.write(bodyStr);
      req.end();
    });
  }

  async poll() {
    while (this.isRunning) {
      try {
        const res = await this.makeRequest('getUpdates', {
          offset: this.offset,
          timeout: 25
        });

        if (res.ok && res.result && res.result.length > 0) {
          for (const update of res.result) {
            this.offset = update.update_id + 1;
            await this.handleUpdate(update);
          }
        }
      } catch (err) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }

  async handleUpdate(update) {
    if (update.message) {
      await this.handleMessage(update.message);
    } else if (update.callback_query) {
      await this.handleCallback(update.callback_query);
    }
  }

  async handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    const senderName = msg.from?.first_name || 'Alejandro';

    // Vincular Chat ID de forma permanente al primer mensaje
    if (!this.allowedChatId) {
      this.allowedChatId = chatId;
      await this.saveTelegramConfig(chatId);
      console.log(`✅ [Antigravity Bot] Creador vinculado: ${senderName} (Chat ID: ${chatId})`);
    }

    // 1. Comando /start, menu o saludos
    if (text.startsWith('/start') || text.toLowerCase() === 'menu' || text.toLowerCase() === 'hola') {
      await this.saveTelegramConfig(chatId);
      await this.sendMainMenu(chatId, senderName);
      return;
    }

    // 2. Comandos de Terminal / Ejecución en PC (/cmd ...)
    if (text.startsWith('/cmd ') || text.startsWith('/run ') || text.startsWith('$ ')) {
      const command = text.replace(/^(\/cmd|\/run|\$)\s+/, '');
      await this.executeShellCommand(chatId, command);
      return;
    }

    // 3. Estado de la PC y Proyectos (/pc o /status)
    if (text === '/pc' || text === '/status' || text.toLowerCase() === 'estado pc') {
      await this.sendPcStatus(chatId);
      return;
    }

    // 4. Gestión de Notas Rápidas (/nota <texto>, /notas)
    if (text.startsWith('/nota ')) {
      const noteText = text.replace(/^\/nota\s+/, '');
      await this.saveNote(chatId, noteText);
      return;
    }
    if (text === '/notas' || text.toLowerCase() === 'mis notas') {
      await this.listNotes(chatId);
      return;
    }

    // 5. Configurar clave de Gemini AI (/setkey <clave>)
    if (text.startsWith('/setkey ')) {
      const key = text.replace(/^\/setkey\s+/, '').trim();
      await this.setGeminiApiKey(chatId, key);
      return;
    }

    // 6. Sección del Libro de Lau (/libro o palabras clave)
    if (text === '/libro' || text.toLowerCase() === 'libro' || text.toLowerCase() === 'lau') {
      await this.sendLauMenu(chatId);
      return;
    }

    if (text.toLowerCase() === 'reporte' || text.toLowerCase() === 'reporte lau') {
      await this.sendTelemetryReport(chatId);
      return;
    }

    if (text.toLowerCase().includes('musica') || text.toLowerCase().includes('taylor')) {
      await this.sendMusicReport(chatId);
      return;
    }

    if (text.toLowerCase().includes('dispositivo')) {
      await this.sendDeviceReport(chatId);
      return;
    }

    // 7. Pregunta o mensaje libre -> Responder con IA (Gemini) o asistente inteligente
    await this.processAiQuery(chatId, text);
  }

  async handleCallback(query) {
    const chatId = query.message.chat.id;
    const data = query.data;

    await this.makeRequest('answerCallbackQuery', { callback_query_id: query.id });

    if (data === 'cmd_main_menu') {
      await this.sendMainMenu(chatId);
    } else if (data === 'cmd_pc_status') {
      await this.sendPcStatus(chatId);
    } else if (data === 'cmd_notes') {
      await this.listNotes(chatId);
    } else if (data === 'cmd_lau_menu') {
      await this.sendLauMenu(chatId);
    } else if (data === 'cmd_lau_report') {
      await this.sendTelemetryReport(chatId);
    } else if (data === 'cmd_lau_music') {
      await this.sendMusicReport(chatId);
    } else if (data === 'cmd_lau_device') {
      await this.sendDeviceReport(chatId);
    } else if (data === 'cmd_quick_cmds') {
      await this.sendQuickCommandsHelp(chatId);
    } else if (data === 'cmd_ai_help') {
      await this.sendAiHelp(chatId);
    }
  }

  // --- MENÚ PRINCIPAL ---
  async sendMainMenu(chatId, name = 'Alejandro') {
    const text = `⚡ *¡Hola, ${name}! Soy Antigravity.*\n` +
      `Tu asistente personal de IA conectado a tu PC y a tus proyectos.\n\n` +
      `Puedes pedirme lo que quieras directamente desde este chat:\n` +
      `• 🧠 *Consultas libres y desarrollo:* Pregúntame dudas, código o ideas.\n` +
      `• 💻 *Control de tu PC:* Ejecuta comandos con \`/cmd <comando>\` o consulta estado.\n` +
      `• 📝 *Notas y pendientes:* Guarda ideas rápidas con \`/nota <texto>\`.\n` +
      `• 📖 *Libro de Lau:* Revisa visitas y actividad en vivo.\n\n` +
      `👇 *Toca una opción o escríbeme directamente:*`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🧠 Consultar a la IA', callback_data: 'cmd_ai_help' },
          { text: '💻 Estado de mi PC', callback_data: 'cmd_pc_status' }
        ],
        [
          { text: '📖 Libro de Lau (Métricas)', callback_data: 'cmd_lau_menu' },
          { text: '📝 Mis Notas Rápidas', callback_data: 'cmd_notes' }
        ],
        [
          { text: '⚡ Comandos de Terminal', callback_data: 'cmd_quick_cmds' },
          { text: '🌐 Dashboard en Vivo', url: 'https://alejandro18000.github.io/libro-lau/stats.html' }
        ]
      ]
    };

    await this.makeRequest('sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  // --- SUBMENÚ LIBRO DE LAU ---
  async sendLauMenu(chatId) {
    const text = `📖 *Módulo: Libro Homenaje para Lau*\n\n` +
      `Aquí puedes consultar en tiempo real las estadísticas de lectura de Lau y sus interacciones:\n\n` +
      `Elige una opción:`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📊 ¿Lau ya vio el libro?', callback_data: 'cmd_lau_report' },
          { text: '🎵 ¿Sonó la música?', callback_data: 'cmd_lau_music' }
        ],
        [
          { text: '📱 Dispositivo & Ubicación', callback_data: 'cmd_lau_device' },
          { text: '🌐 Abrir el Libro Web', url: 'https://alejandro18000.github.io/libro-lau/' }
        ],
        [
          { text: '⬅️ Volver al Menú Principal', callback_data: 'cmd_main_menu' }
        ]
      ]
    };

    await this.makeRequest('sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  // --- ESTADO DE LA PC ---
  async sendPcStatus(chatId) {
    const totalMem = Math.round(os.totalmem() / (1024 * 1024 * 1024));
    const freeMem = Math.round(os.freemem() / (1024 * 1024 * 1024));
    const usedMem = totalMem - freeMem;
    const uptimeHours = Math.floor(os.uptime() / 3600);
    const uptimeMins = Math.floor((os.uptime() % 3600) / 60);

    // Obtener rama y commit actual de git
    exec('git branch --show-current && git rev-parse --short HEAD', { cwd: process.cwd() }, async (err, stdout) => {
      const gitLines = (stdout || '').trim().split('\n');
      const branch = gitLines[0] || 'main';
      const commit = gitLines[1] || 'actualizado';

      const statusText = `💻 *ESTADO DE TU ENTORNO (PC)*\n\n` +
        `• 🖥️ *Equipo:* \`${os.hostname()}\` (${os.platform()} ${os.arch()})\n` +
        `• ⏱️ *Tiempo encendido:* ${uptimeHours}h ${uptimeMins}m\n` +
        `• 🧠 *Memoria RAM:* ${usedMem} GB usados de ${totalMem} GB (${freeMem} GB libres)\n` +
        `• 🌿 *Git Branch:* \`${branch}\` (${commit})\n` +
        `• 🤖 *Motor IA:* ${this.geminiApiKey ? '✅ Gemini Pro/Flash Activo' : '⚙️ Modo Básico (usa /setkey)'}\n\n` +
        `💡 _Puedes ejecutar comandos en tu PC enviando \`/cmd <comando>\`_`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🔄 Actualizar Estado', callback_data: 'cmd_pc_status' },
            { text: '⬅️ Menú Principal', callback_data: 'cmd_main_menu' }
          ]
        ]
      };

      await this.makeRequest('sendMessage', {
        chat_id: chatId,
        text: statusText,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    });
  }

  // --- EJECUCIÓN REMOTA DE TERMINAL ---
  async executeShellCommand(chatId, command) {
    if (!command) {
      await this.makeRequest('sendMessage', {
        chat_id: chatId,
        text: '⚠️ Debes especificar el comando. Ejemplo:\n`/cmd git status`',
        parse_mode: 'Markdown'
      });
      return;
    }

    await this.makeRequest('sendMessage', {
      chat_id: chatId,
      text: `⏳ *Ejecutando en tu PC:* \`${command}\`...`,
      parse_mode: 'Markdown'
    });

    exec(command, { cwd: process.cwd(), timeout: 30000 }, async (error, stdout, stderr) => {
      let output = stdout || stderr || (error ? error.message : '(Sin salida de texto)');
      if (output.length > 3800) {
        output = output.substring(0, 3800) + '\n... [Salida truncada]';
      }

      const response = `🖥️ *Resultado de:* \`${command}\`\n\n` +
        '```text\n' + output + '\n```';

      await this.makeRequest('sendMessage', {
        chat_id: chatId,
        text: response,
        parse_mode: 'Markdown'
      });
    });
  }

  // --- GESTIÓN DE NOTAS RÁPIDAS ---
  async saveNote(chatId, noteText) {
    if (!noteText) return;
    try {
      const payload = JSON.stringify({
        text: noteText,
        createdAt: new Date().toISOString()
      });

      await new Promise((resolve) => {
        const u = new URL(`${FIREBASE_URL}/notes.json`);
        const req = https.request(u, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, () => resolve());
        req.on('error', () => resolve());
        req.write(payload);
        req.end();
      });

      await this.makeRequest('sendMessage', {
        chat_id: chatId,
        text: `✅ *Nota guardada:* "${noteText}"\n\nUsa \`/notas\` para ver todas tus notas.`,
        parse_mode: 'Markdown'
      });
    } catch (e) {
      await this.makeRequest('sendMessage', {
        chat_id: chatId,
        text: '❌ Error guardando nota.',
        parse_mode: 'Markdown'
      });
    }
  }

  async listNotes(chatId) {
    const notesData = await this.fetchJson(`${FIREBASE_URL}/notes.json`);
    if (!notesData || Object.keys(notesData).length === 0) {
      await this.makeRequest('sendMessage', {
        chat_id: chatId,
        text: '📝 *Mis Notas:* No tienes notas guardadas.\n\nPara crear una nota, escribe:\n`/nota Comprar flores`',
        parse_mode: 'Markdown'
      });
      return;
    }

    const notesList = Object.values(notesData).map((n, i) => {
      const d = new Date(n.createdAt);
      const timeStr = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
      return `${i + 1}. *${n.text}* _(${timeStr})_`;
    }).join('\n');

    await this.makeRequest('sendMessage', {
      chat_id: chatId,
      text: `📝 *TUS NOTAS Y TAREAS PENDIENTES:*\n\n${notesList}\n\n💡 _Para agregar otra: \`/nota <texto>\`_`,
      parse_mode: 'Markdown'
    });
  }

  // --- CONFIGURAR GEMINI API KEY ---
  async setGeminiApiKey(chatId, key) {
    this.geminiApiKey = key;
    try {
      const payload = JSON.stringify({ geminiApiKey: key });
      await new Promise((resolve) => {
        const req = https.request(`${FIREBASE_URL}/config.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' }
        }, () => resolve());
        req.on('error', () => resolve());
        req.write(payload);
        req.end();
      });
    } catch (e) {}

    await this.makeRequest('sendMessage', {
      chat_id: chatId,
      text: '🤖 ✅ *¡Google Gemini API vinculado con éxito!*\n\nAhora puedes hacerme cualquier pregunta técnica, de código o general en este chat y te responderé con la máxima inteligencia artificial de Google.',
      parse_mode: 'Markdown'
    });
  }

  // --- RESPUESTA CON IA O ASISTENTE INTELIGENTE ---
  async processAiQuery(chatId, prompt) {
    await this.makeRequest('sendChatAction', { chat_id: chatId, action: 'typing' });

    // Si tiene clave de Gemini API configurada, llamamos a Gemini 1.5 Flash
    if (this.geminiApiKey) {
      try {
        const reply = await this.callGeminiApi(prompt);
        await this.makeRequest('sendMessage', {
          chat_id: chatId,
          text: reply,
          parse_mode: 'Markdown'
        });
        return;
      } catch (err) {
        console.error('Error llamando Gemini:', err);
      }
    }

    // Respuesta inteligente local si aún no tiene API Key de Gemini
    const defaultResponse = `⚡ *Antigravity AI:*\n\n` +
      `He recibido tu mensaje: _"${prompt}"_\n\n` +
      `🛠️ *Comandos útiles desde tu celular:*\n` +
      `• \`/cmd <comando>\` -> Ejecuta comandos en tu PC (ej: \`/cmd git status\`)\n` +
      `• \`/pc\` -> Muestra memoria, CPU y estado del proyecto\n` +
      `• \`/nota <texto>\` -> Guarda una nota o tarea pendiente\n` +
      `• \`/libro\` -> Consulta las métricas de lectura de Lau\n\n` +
      `✨ *¿Quieres respuestas libres de IA ilimitadas?*\n` +
      `Solo envía tu clave gratuita de Google AI Studio con:\n` +
      `\`/setkey <tu_api_key>\``;

    await this.makeRequest('sendMessage', {
      chat_id: chatId,
      text: defaultResponse,
      parse_mode: 'Markdown'
    });
  }

  async callGeminiApi(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`;
    const payload = JSON.stringify({
      contents: [{
        parts: [{
          text: `Eres Antigravity, un asistente de IA experto en programación y productividad, ayudando a tu creador Alejandro desde su celular en Telegram. Responde de forma concisa, clara y profesional con buen formato Markdown.\n\nUsuario: ${prompt}`
        }]
      }]
    });

    return new Promise((resolve, reject) => {
      const req = https.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) resolve(text);
            else resolve('No pude generar una respuesta clara.');
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  // --- REPORTES TELEMETRÍA (LIBRO DE LAU) ---
  async fetchSessions() {
    const data = await this.fetchJson(`${FIREBASE_URL}/sessions.json`);
    if (!data) return [];
    return Object.values(data).sort((a, b) => {
      const tA = new Date(a.lastActiveAt || a.startedAt || 0).getTime();
      const tB = new Date(b.lastActiveAt || b.startedAt || 0).getTime();
      return tB - tA;
    });
  }

  async sendTelemetryReport(chatId) {
    const sessions = await this.fetchSessions();
    if (sessions.length === 0) {
      await this.makeRequest('sendMessage', {
        chat_id: chatId,
        text: '📖 *Estado del Libro:*\n\nAún no hay lecturas registradas. En cuanto Lau abra el enlace, te lo notificaré aquí de inmediato.',
        parse_mode: 'Markdown'
      });
      return;
    }

    const latest = sessions[0];
    const dateObj = new Date(latest.startedAt || latest.lastActiveAt);
    const dateStr = dateObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    const timeStr = dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    const mins = Math.floor((latest.totalSeconds || 0) / 60);
    const secs = (latest.totalSeconds || 0) % 60;
    const durStr = mins > 0 ? `${mins}m ${secs}s` : `${secs} segundos`;
    const isLau = latest.device === 'iPhone' || !latest.isIgnored;

    const report = `📊 *REPORTE EN VIVO — LIBRO PARA LAU*\n` +
      `_Última actividad: ${dateStr} • ${timeStr}_\n\n` +
      `👤 *Visitante:* ${isLau ? '💖 Probablemente Lau' : 'Visitante'}\n` +
      `📱 *Dispositivo:* ${latest.device || 'iPhone'} (${latest.os || 'iOS'})\n` +
      `📍 *Ubicación:* ${latest.location?.city || 'Bogotá'}, Colombia 🇨🇴\n` +
      `⏱️ *Tiempo de lectura:* ${durStr}\n` +
      `📑 *Página máxima:* ${latest.maxPageReached === 0 ? 'Portada' : 'Pág. ' + latest.maxPageReached}\n` +
      `🎵 *Música Taylor:* ${latest.musicPlayed ? 'Reproducida 🎶' : 'Aún no reproducida'}\n` +
      `🚶‍♀️ *Ritmo:* ${latest.readingPace || 'Ojeando'}\n\n` +
      `🔗 [Abrir Panel Privado](https://alejandro18000.github.io/libro-lau/stats.html)`;

    await this.makeRequest('sendMessage', {
      chat_id: chatId,
      text: report,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
  }

  async sendMusicReport(chatId) {
    const sessions = await this.fetchSessions();
    const latest = sessions[0];
    if (!latest) {
      await this.makeRequest('sendMessage', {
        chat_id: chatId,
        text: '🎵 *Música:* Aún no se registran reproducciones.',
        parse_mode: 'Markdown'
      });
      return;
    }

    const played = latest.musicPlayed;
    const sec = latest.musicDurationSec || 0;
    const text = `🎵 *Banda Sonora: "invisible string" — Taylor Swift*\n\n` +
      `• *¿Se reprodujo?:* ${played ? '✅ ¡Sí! Lau escuchó la canción.' : '⏳ Aún no ha llegado a la pág. 8.'}\n` +
      `• *Tiempo escuchado:* ${sec} segundos\n` +
      `• *Veces reproducida:* ${latest.musicPlayCount || 0}\n` +
      `• *¿Completó la canción?:* ${latest.musicCompleted ? 'Sí (4:12)' : 'En curso / parcial'}`;

    await this.makeRequest('sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    });
  }

  async sendDeviceReport(chatId) {
    const sessions = await this.fetchSessions();
    const latest = sessions[0];
    if (!latest) {
      await this.makeRequest('sendMessage', {
        chat_id: chatId,
        text: '📱 Aún no hay datos de dispositivo registrados.',
        parse_mode: 'Markdown'
      });
      return;
    }

    const text = `📱 *Información del Dispositivo de Lau*\n\n` +
      `• *Modelo:* ${latest.deviceModel || latest.device}\n` +
      `• *Sistema:* ${latest.os}\n` +
      `• *Navegador:* ${latest.browser}\n` +
      `• *Tema:* ${latest.colorScheme || 'Modo Oscuro'}\n` +
      `• *Pantalla:* ${latest.screen || 'Móvil'}\n` +
      `• *Ubicación:* ${latest.location?.city || 'Bogotá'}, ${latest.location?.country || 'Colombia'}\n` +
      `• *Red:* ${latest.location?.org || latest.connectionType || 'Móvil'}`;

    await this.makeRequest('sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    });
  }

  async sendAiHelp(chatId) {
    const text = `🧠 *Consultas con Inteligencia Artificial*\n\n` +
      `Puedes escribirme cualquier pregunta o mensaje como si estuviéramos en una conversación normal:\n\n` +
      `• _"Explícame cómo funciona una promesa en JavaScript"_\n` +
      `• _"Dame una idea para automatizar mi trabajo"_\n` +
      `• _"Redacta un mensaje para..."_\n\n` +
      `💡 _Escribe tu duda directamente en el chat._`;

    await this.makeRequest('sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    });
  }

  async sendQuickCommandsHelp(chatId) {
    const text = `⚡ *Comandos Rápidos Disponibles:*\n\n` +
      `• \`/cmd git status\` -> Ver estado de Git en tu PC\n` +
      `• \`/cmd npm run build\` -> Probar compilación del proyecto\n` +
      `• \`/cmd dir\` -> Ver archivos de la carpeta actual\n` +
      `• \`/pc\` -> Ver memoria y recursos del sistema\n` +
      `• \`/nota <texto>\` -> Guardar una idea rápida\n` +
      `• \`/notas\` -> Ver todas tus notas guardadas\n` +
      `• \`/libro\` -> Menú de estadísticas de Lau`;

    await this.makeRequest('sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    });
  }

  async saveTelegramConfig(chatId) {
    try {
      const payload = JSON.stringify({
        enabled: true,
        chatId: chatId,
        botToken: this.token,
        updatedAt: new Date().toISOString()
      });

      return new Promise((resolve) => {
        const u = new URL(`${FIREBASE_URL}/config/telegram.json`);
        const req = https.request(u, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        }, () => resolve());
        req.on('error', () => resolve());
        req.write(payload);
        req.end();
      });
    } catch (e) {}
  }
}

async function loadTokenAndRun() {
  let token = process.argv[2] || process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    try {
      token = await new Promise((resolve) => {
        https.get(`${FIREBASE_URL}/config/telegram/botToken.json`, (res) => {
          let body = '';
          res.on('data', d => body += d);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              resolve(parsed && typeof parsed === 'string' ? parsed : null);
            } catch (e) {
              resolve(null);
            }
          });
        }).on('error', () => resolve(null));
      });
    } catch (e) {}
  }

  if (!token) {
    console.log('🤖 [Antigravity Bot] No se ha especificado el Bot Token.');
    return;
  }

  console.log('🚀 Iniciando Antigravity Telegram Assistant...');
  const bot = new AntigravityTelegramBot(token);
  await bot.init();
  bot.start();
}

loadTokenAndRun();
