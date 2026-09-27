/**
 * telegram_bot.js
 * Bot privado de Telegram para el creador del Libro de Lau.
 * Permite consultar en tiempo real las lecturas de Lau, recibir reportes
 * y dar órdenes o hacer preguntas directamente desde tu celular.
 */

import https from 'https';

// Configuración remota de Firebase
const FIREBASE_URL = 'https://libro-lau-default-rtdb.firebaseio.com';

class TelegramLauBot {
  constructor(token) {
    this.token = token;
    this.offset = 0;
    this.isRunning = false;
    this.allowedChatId = null; // Se fija automáticamente con el primer /start del creador
  }

  start() {
    this.isRunning = true;
    console.log('🤖 [Telegram Bot] Iniciando conexión con Telegram...');
    this.poll();
  }

  stop() {
    this.isRunning = false;
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
        // Pausa breve en caso de error de red
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

    // Guardar el Chat ID del creador para seguridad y enlazarlo con Firebase
    if (!this.allowedChatId) {
      this.allowedChatId = chatId;
      await this.saveTelegramConfig(chatId);
      console.log(`✅ [Telegram Bot] Creador vinculado exitosamente (Chat ID: ${chatId})`);
    }

    if (text.startsWith('/start') || text.toLowerCase() === 'menu' || text.toLowerCase() === 'hola') {
      await this.saveTelegramConfig(chatId);
      await this.sendMainMenu(chatId, msg.from?.first_name || 'Creador');
      return;
    }

    if (text.toLowerCase().includes('reporte') || text.toLowerCase().includes('lau') || text.toLowerCase().includes('estado')) {
      await this.sendTelemetryReport(chatId);
      return;
    }

    if (text.toLowerCase().includes('musica') || text.toLowerCase().includes('cancion') || text.toLowerCase().includes('taylor')) {
      await this.sendMusicReport(chatId);
      return;
    }

    if (text.toLowerCase().includes('dispositivo') || text.toLowerCase().includes('donde') || text.toLowerCase().includes('ubicacion')) {
      await this.sendDeviceReport(chatId);
      return;
    }

    // Respuesta inteligente general
    await this.sendAiReply(chatId, text);
  }

  async handleCallback(query) {
    const chatId = query.message.chat.id;
    const data = query.data;

    await this.makeRequest('answerCallbackQuery', { callback_query_id: query.id });

    if (data === 'cmd_report') {
      await this.sendTelemetryReport(chatId);
    } else if (data === 'cmd_music') {
      await this.sendMusicReport(chatId);
    } else if (data === 'cmd_device') {
      await this.sendDeviceReport(chatId);
    } else if (data === 'cmd_menu') {
      await this.sendMainMenu(chatId);
    }
  }

  async fetchSessions() {
    return new Promise((resolve) => {
      https.get(`${FIREBASE_URL}/sessions.json`, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (!data) return resolve([]);
            const list = Object.values(data).sort((a, b) => {
              const tA = new Date(a.lastActiveAt || a.startedAt || 0).getTime();
              const tB = new Date(b.lastActiveAt || b.startedAt || 0).getTime();
              return tB - tA;
            });
            resolve(list);
          } catch(e) {
            resolve([]);
          }
        });
      }).on('error', () => resolve([]));
    });
  }

  async sendMainMenu(chatId, name = 'Creador') {
    const text = `🌸 *¡Hola, ${name}!* Soy tu asistente del *Libro para Lau*.\n\n` +
      `Puedes preguntarme lo que quieras sobre la actividad de Lau, pedirme reportes o consultar métricas en vivo:\n\n` +
      `👇 *Toca una opción o escríbeme cualquier pregunta:*`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '📊 ¿Lau ya vio el libro?', callback_data: 'cmd_report' },
          { text: '🎵 ¿Escuchó la música?', callback_data: 'cmd_music' }
        ],
        [
          { text: '📱 Dispositivo & Ubicación', callback_data: 'cmd_device' },
          { text: '🌐 Abrir Dashboard en Vivo', url: 'https://alejandro18000.github.io/libro-lau/stats.html' }
        ],
        [
          { text: '📖 Ver el Libro en Vivo', url: 'https://alejandro18000.github.io/libro-lau/' }
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

  async sendTelemetryReport(chatId) {
    const sessions = await this.fetchSessions();

    if (sessions.length === 0) {
      await this.makeRequest('sendMessage', {
        chat_id: chatId,
        text: '📖 *Estado del Libro:*\n\nAún no hay lecturas registradas en la base de datos. En cuanto Lau abra el enlace, te lo notificaré aquí de inmediato.',
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
        text: '🎵 *Música:* Aún no se registran reproducciones de "invisible string".',
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

    const text = `📱 *Información del Dispositivo del Lector*\n\n` +
      `• *Modelo:* ${latest.deviceModel || latest.device}\n` +
      `• *Sistema:* ${latest.os}\n` +
      `• *Navegador:* ${latest.browser}\n` +
      `• *Tema:* ${latest.colorScheme || 'Modo Oscuro'}\n` +
      `• *Pantalla:* ${latest.screen || 'Móvil Retina'}\n` +
      `• *Ubicación:* ${latest.location?.city || 'Bogotá'}, ${latest.location?.country || 'Colombia'}\n` +
      `• *Red:* ${latest.location?.org || latest.connectionType || 'Móvil'}`;

    await this.makeRequest('sendMessage', {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    });
  }

  async sendAiReply(chatId, userText) {
    // Si el usuario pregunta algo en lenguaje natural
    const sessions = await this.fetchSessions();
    const latest = sessions[0];

    let statusSnippet = 'Aún no hay visitas registradas.';
    if (latest) {
      const dur = Math.round((latest.totalSeconds || 0));
      statusSnippet = `La última visita fue desde un ${latest.device} en ${latest.location?.city || 'Bogotá'} hace unas horas, leyendo durante ${dur} segundos hasta la ${latest.activePageTitle || 'Portada'}.`;
    }

    const reply = `🤖 Entendido. Sobre el Libro para Lau:\n\n` +
      `📌 *Estado actual:* ${statusSnippet}\n\n` +
      `Puedes usar los botones del menú o pedirme detalles específicos escribiendo *reporte*, *musica* o *dispositivo*.`;

    await this.makeRequest('sendMessage', {
      chat_id: chatId,
      text: reply,
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
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        }, () => resolve());
        req.on('error', () => resolve());
        req.write(payload);
        req.end();
      });
    } catch (e) {
      // Ignorar error silenciosamente
    }
  }
}

async function loadTokenAndRun() {
  let token = process.argv[2] || process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    // Intentar leer token guardado en Firebase
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
    console.log('🤖 [Telegram Bot] No se ha especificado el Bot Token.');
    console.log('Uso: node scripts/telegram_bot.js <TU_BOT_TOKEN>');
    console.log('O guárdalo en Firebase en /config/telegram/botToken.json');
    return;
  }

  console.log('🚀 Iniciando Bot de Telegram para el Libro de Lau...');
  const bot = new TelegramLauBot(token);
  bot.start();
}

loadTokenAndRun();

