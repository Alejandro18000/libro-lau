/**
 * TelemetryService.js
 * Rastreador silencioso avanzado y telemetría de lectura para el libro de Lau.
 * Recopila datos de lectura en tiempo real, mapas de atención, relecturas,
 * interacción multimedia y entorno del dispositivo (Apple Analytics standard).
 */

import { analyticsConfig } from './analyticsConfig.js';
import { chapters, bookPages } from '../chapters/chaptersData.js';

export class TelemetryService {
  constructor() {
    this.session = null;
    this.pageEnterTime = Date.now();
    this.currentPage = 0;
    this.isPaused = false;
    this.syncTimer = null;
    this.activePhotoStart = null;
    this.currentPhotoCaption = null;

    this.init();
  }

  async init() {
    try {
      // 0. Comprobar si este dispositivo es el del Creador/Autor para excluirlo al 100%
      const isCreatorDevice = localStorage.getItem('libro_lau_ignore_device') === 'true' ||
                              sessionStorage.getItem('libro_lau_auth_unlocked') === 'true' ||
                              window.location.search.includes('admin') ||
                              window.location.search.includes('creador') ||
                              window.location.search.includes('dev');

      if (isCreatorDevice) {
        this.isIgnored = true;
        localStorage.setItem('libro_lau_ignore_device', 'true');
        console.log('🛡️ [Telemetry] Modo Creador Activo: Tu dispositivo está excluido y no registrará datos en Firebase.');
        return;
      }

      const now = Date.now();
      const storage = analyticsConfig.storageKeys;

      // 1. Identificador de visitante anónimo
      let visitorId = localStorage.getItem(storage.visitorId);
      if (!visitorId) {
        visitorId = 'lau_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
        localStorage.setItem(storage.visitorId, visitorId);
      }

      // 2. Contador de visitas repetidas
      let visitCount = parseInt(localStorage.getItem(storage.visitCount) || '0', 10);
      const lastActive = parseInt(localStorage.getItem(storage.lastActive) || '0', 10);
      const timeoutMs = (analyticsConfig.sessionTimeoutMinutes || 30) * 60 * 1000;

      const isNewSession = !lastActive || (now - lastActive > timeoutMs);
      if (isNewSession) {
        visitCount += 1;
        localStorage.setItem(storage.visitCount, visitCount.toString());
      }
      localStorage.setItem(storage.lastActive, now.toString());

      // 3. Detección de dispositivo y entorno
      const deviceInfo = this.detectDevice();

      // 4. Crear sesión activa enriquecida
      this.session = {
        sessionId: 'ses_' + now + '_' + Math.random().toString(36).substring(2, 7),
        visitorId: visitorId,
        visitNumber: visitCount,
        startedAt: new Date(now).toISOString(),
        lastActiveAt: new Date(now).toISOString(),
        
        // Entorno y Dispositivo
        device: deviceInfo.device,
        deviceModel: deviceInfo.model,
        os: deviceInfo.os,
        browser: deviceInfo.browser,
        screen: `${window.innerWidth}x${window.innerHeight} (${screen.width}x${screen.height})`,
        retina: window.devicePixelRatio ? `${window.devicePixelRatio}x` : '1x',
        colorScheme: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Modo Oscuro' : 'Modo Claro',
        orientation: window.innerWidth > window.innerHeight ? 'Horizontal' : 'Vertical',
        language: navigator.language || 'es',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota',
        connectionType: this.detectConnection(),
        battery: 'Detectando...',
        location: {
          city: 'Cargando...',
          region: '',
          country: '',
          ip: ''
        },

        // Métricas de Lectura
        totalSeconds: 0,
        activePage: 0,
        activePageTitle: 'Portada',
        maxPageReached: 0,
        completedBook: false,
        reReadCount: 0,
        reReadPages: {}, // { [pageNum]: count }
        pageTransitions: [], // historial secuencial de saltos
        pageTimes: {}, // { [pageNum]: { title, seconds, visits, reReads } }
        readingPace: 'Iniciando lectura',
        engagementScore: 10,

        // Métricas Multimedia
        musicPlayed: false,
        musicPlayCount: 0,
        musicDurationSec: 0,
        musicCompleted: false,
        photosViewed: [],
        photosDetails: {}, // { [caption]: { timesOpened, totalSeconds } }

        // Interacciones
        tocOpened: false,
        tocClickCount: 0,
        fullscreenUsed: false,
        spotifyLinkClicked: false,
        swipeCount: 0,
        tapCount: 0,

        isLive: true
      };

      // Inicializar página inicial (Portada)
      this.initPageTime(0);
      this.recordPageTransition(0, 0);

      // 5. Configurar listeners de ciclo de vida
      this.setupLifecycleListeners();

      // 6. Detección asíncrona de batería y red/ubicación
      this.fetchAsyncDeviceData();

      // 7. Latido en tiempo real (Heartbeat de 5 segundos)
      this.startHeartbeat();

      // Sincronizar inicio de sesión de inmediato
      this.syncSession();
    } catch (err) {
      console.warn('Telemetry init notice:', err);
    }
  }

  detectDevice() {
    const ua = navigator.userAgent || '';
    let os = 'Desconocido';
    let device = 'Computador';
    let model = 'Escritorio';
    let browser = 'Navegador Web';

    if (/iPhone/i.test(ua)) {
      device = 'iPhone';
      os = 'iOS';
      model = 'Apple iPhone';
      const match = ua.match(/OS (\d+_\d+)/);
      if (match) os = `iOS ${match[1].replace('_', '.')}`;
    } else if (/iPad/i.test(ua)) {
      device = 'iPad';
      os = 'iPadOS';
      model = 'Apple iPad';
    } else if (/Android/i.test(ua)) {
      os = 'Android';
      device = /Mobile/i.test(ua) ? 'Móvil Android' : 'Tablet Android';
      if (/SM-|Samsung/i.test(ua)) model = 'Samsung Galaxy';
      else if (/Xiaomi|Redmi|POCO/i.test(ua)) model = 'Xiaomi';
      else if (/Pixel/i.test(ua)) model = 'Google Pixel';
      else if (/Motorola|Moto/i.test(ua)) model = 'Motorola';
      else model = 'Android Phone';
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
      os = 'macOS';
      device = 'Mac';
      model = 'Apple Mac';
    } else if (/Windows NT/i.test(ua)) {
      os = 'Windows';
      device = 'PC Windows';
      model = 'Windows PC';
    }

    if (/WhatsApp/i.test(ua)) {
      browser = 'WhatsApp (In-App)';
    } else if (/Instagram/i.test(ua)) {
      browser = 'Instagram (In-App)';
    } else if (/FBAN|FBAV/i.test(ua)) {
      browser = 'Facebook (In-App)';
    } else if (/CriOS/i.test(ua)) {
      browser = 'Chrome iOS';
    } else if (/FxiOS/i.test(ua)) {
      browser = 'Firefox iOS';
    } else if (/Chrome|Chromium/i.test(ua) && !/Edg/i.test(ua)) {
      browser = 'Google Chrome';
    } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
      browser = 'Apple Safari';
    } else if (/Edg/i.test(ua)) {
      browser = 'Microsoft Edge';
    } else if (/Firefox/i.test(ua)) {
      browser = 'Mozilla Firefox';
    }

    return { device, os, model, browser };
  }

  detectConnection() {
    if (navigator.connection) {
      const conn = navigator.connection;
      const type = conn.effectiveType ? conn.effectiveType.toUpperCase() : 'Banda Ancha';
      const speed = conn.downlink ? ` (${conn.downlink} Mbps)` : '';
      return `${type}${speed}`;
    }
    return 'WiFi / Datos Móviles';
  }

  async fetchAsyncDeviceData() {
    // 1. Nivel de Batería si está disponible
    if (navigator.getBattery) {
      try {
        const battery = await navigator.getBattery();
        const updateBat = () => {
          if (this.session) {
            const pct = Math.round(battery.level * 100);
            const status = battery.charging ? '⚡ Cargando' : '🔋 Batería';
            this.session.battery = `${pct}% (${status})`;
          }
        };
        updateBat();
        battery.addEventListener('levelchange', updateBat);
        battery.addEventListener('chargingchange', updateBat);
      } catch (e) {}
    } else {
      if (this.session) this.session.battery = 'No disponible (iOS/Safari)';
    }

    // 2. Ubicación y Red silenciosa mediante IP pública
    try {
      const resp = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
      if (resp.ok) {
        const data = await resp.json();
        if (this.session && data) {
          this.session.location = {
            city: data.city || 'Ciudad desconocida',
            region: data.region || '',
            country: data.country_name || 'Colombia',
            ip: data.ip ? data.ip.substring(0, 7) + '***' : '',
            org: data.org || ''
          };
          this.syncSession();
        }
      }
    } catch (e) {
      // Fallback a zona horaria
      if (this.session) {
        this.session.location = {
          city: 'América',
          region: this.session.timezone,
          country: 'Colombia',
          ip: ''
        };
      }
    }

    // 3. Comprobar alertas automáticas de WhatsApp si están configuradas
    this.checkAndTriggerWhatsAppAlerts();
  }

  getPageTitle(pageIndex) {
    if (pageIndex === 0) return 'Portada';
    const totalPages = bookPages.length + 2;
    if (pageIndex >= totalPages - 1) return 'Contratapa';

    const pageData = bookPages[pageIndex - 1];
    if (pageData) {
      if (pageData.chapterNumber) {
        return `Capítulo ${pageData.chapterNumber}: ${pageData.title || ''}`;
      }
      return pageData.title || `Página ${pageIndex}`;
    }
    return `Página ${pageIndex}`;
  }

  initPageTime(pageIndex) {
    if (!this.session.pageTimes[pageIndex]) {
      this.session.pageTimes[pageIndex] = {
        title: this.getPageTitle(pageIndex),
        seconds: 0,
        visits: 0,
        reReads: 0
      };
    }
    this.session.pageTimes[pageIndex].visits += 1;
  }

  recordPageTransition(fromPage, toPage) {
    if (!this.session) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Mantener hasta las últimas 40 transiciones de página
    if (this.session.pageTransitions.length > 40) {
      this.session.pageTransitions.shift();
    }

    this.session.pageTransitions.push({
      from: fromPage,
      to: toPage,
      toTitle: this.getPageTitle(toPage),
      time: timeStr
    });
  }

  /**
   * Llamado cada vez que pasa de página en el libro
   */
  onPageFlip(newPageIndex, totalPages) {
    if (!this.session) return;

    const now = Date.now();
    if (!this.isPaused) {
      const elapsedSec = Math.round((now - this.pageEnterTime) / 1000);
      if (elapsedSec > 0 && elapsedSec < 1800) {
        this.addTimeToPage(this.currentPage, elapsedSec);
      }
    }

    // Detección de relectura (volvió hacia atrás a una página anterior)
    if (newPageIndex < this.currentPage) {
      this.session.reReadCount += 1;
      this.session.reReadPages[newPageIndex] = (this.session.reReadPages[newPageIndex] || 0) + 1;
      if (this.session.pageTimes[newPageIndex]) {
        this.session.pageTimes[newPageIndex].reReads = (this.session.pageTimes[newPageIndex].reReads || 0) + 1;
      }
    }

    this.recordPageTransition(this.currentPage, newPageIndex);

    this.currentPage = newPageIndex;
    this.pageEnterTime = now;
    this.session.activePage = newPageIndex;
    this.session.activePageTitle = this.getPageTitle(newPageIndex);
    this.session.lastActiveAt = new Date(now).toISOString();

    if (newPageIndex > this.session.maxPageReached) {
      this.session.maxPageReached = newPageIndex;
    }

    if (totalPages && newPageIndex >= totalPages - 2) {
      this.session.completedBook = true;
    }

    this.initPageTime(newPageIndex);
    this.calculatePaceAndScore();
    this.syncSession();
  }

  addTimeToPage(pageIndex, seconds) {
    if (!this.session.pageTimes[pageIndex]) {
      this.initPageTime(pageIndex);
    }
    this.session.pageTimes[pageIndex].seconds += seconds;
    this.session.totalSeconds += seconds;
    this.calculatePaceAndScore();
  }

  calculatePaceAndScore() {
    if (!this.session) return;

    const totalSec = this.session.totalSeconds;
    const maxPage = this.session.maxPageReached;
    const completed = this.session.completedBook;

    // 1. Ritmo de lectura
    if (totalSec < 30) {
      this.session.readingPace = 'Comenzando a ojear';
    } else if (totalSec / Math.max(1, maxPage) > 75) {
      this.session.readingPace = 'Lectura profunda y reflexiva';
    } else if (totalSec / Math.max(1, maxPage) > 35) {
      this.session.readingPace = 'Lectura fluida y atenta';
    } else {
      this.session.readingPace = 'Ojeada rápida';
    }

    // 2. Índice de Compromiso / Conexión Emocional (0 - 100)
    let score = 20;
    // Páginas leídas
    score += Math.min(35, maxPage * 4);
    // Tiempo total acumulado
    score += Math.min(25, Math.floor(totalSec / 15));
    // Canción de Taylor
    if (this.session.musicPlayed) score += 10;
    if (this.session.musicDurationSec > 60) score += 5;
    // Fotos ampliadas
    score += Math.min(10, (this.session.photosViewed.length * 3));
    // Relecturas
    if (this.session.reReadCount > 0) score += Math.min(10, this.session.reReadCount * 3);
    // Libro completado
    if (completed) score += 15;

    this.session.engagementScore = Math.min(100, score);
  }

  /**
   * Registro de la canción "invisible string"
   */
  onMusicPlay() {
    if (!this.session) return;
    this.session.musicPlayed = true;
    this.session.musicPlayCount += 1;
    this.session.lastActiveAt = new Date().toISOString();
    this.calculatePaceAndScore();
    this.syncSession();
  }

  onMusicTimeUpdate(currentSeconds) {
    if (!this.session) return;
    const sec = Math.round(currentSeconds);
    if (sec > this.session.musicDurationSec) {
      this.session.musicDurationSec = sec;
      if (sec > 200) {
        this.session.musicCompleted = true;
      }
    }
  }

  /**
   * Registro de fotos ampliadas y tiempo de contemplación
   */
  onPhotoOpen(caption, src) {
    if (!this.session) return;
    const name = caption || 'Foto polaroid';
    this.activePhotoStart = Date.now();
    this.currentPhotoCaption = name;

    if (!this.session.photosViewed.includes(name)) {
      this.session.photosViewed.push(name);
    }

    if (!this.session.photosDetails[name]) {
      this.session.photosDetails[name] = { timesOpened: 0, totalSeconds: 0 };
    }
    this.session.photosDetails[name].timesOpened += 1;
    this.session.lastActiveAt = new Date().toISOString();
    this.syncSession();
  }

  onPhotoClose() {
    if (!this.session || !this.activePhotoStart || !this.currentPhotoCaption) return;
    const durSec = Math.round((Date.now() - this.activePhotoStart) / 1000);
    if (durSec > 0 && durSec < 600) {
      if (this.session.photosDetails[this.currentPhotoCaption]) {
        this.session.photosDetails[this.currentPhotoCaption].totalSeconds += durSec;
      }
    }
    this.activePhotoStart = null;
    this.currentPhotoCaption = null;
    this.calculatePaceAndScore();
    this.syncSession();
  }

  /**
   * Gestos táctiles
   */
  onSwipe() {
    if (this.session) this.session.swipeCount = (this.session.swipeCount || 0) + 1;
  }

  onTap() {
    if (this.session) this.session.tapCount = (this.session.tapCount || 0) + 1;
  }

  onTocOpen() {
    if (!this.session) return;
    this.session.tocOpened = true;
    this.session.tocClickCount = (this.session.tocClickCount || 0) + 1;
    this.session.lastActiveAt = new Date().toISOString();
    this.syncSession();
  }

  onFullscreenToggle(isFull) {
    if (!this.session) return;
    if (isFull) this.session.fullscreenUsed = true;
    this.syncSession();
  }

  onSpotifyClick() {
    if (!this.session) return;
    this.session.spotifyLinkClicked = true;
    this.syncSession();
  }

  setupLifecycleListeners() {
    document.addEventListener('visibilitychange', () => {
      const now = Date.now();
      if (document.visibilityState === 'hidden') {
        if (!this.isPaused) {
          const elapsedSec = Math.round((now - this.pageEnterTime) / 1000);
          if (elapsedSec > 0 && elapsedSec < 1800) {
            this.addTimeToPage(this.currentPage, elapsedSec);
          }
        }
        this.isPaused = true;
        this.session.isLive = false;
        this.session.lastActiveAt = new Date(now).toISOString();
        this.syncSession(true);
        this.sendWhatsAppSummaryOnExit();
      } else {
        this.isPaused = false;
        this.session.isLive = true;
        this.pageEnterTime = Date.now();
        this.session.lastActiveAt = new Date().toISOString();
        this.syncSession();
      }
    });

    window.addEventListener('pagehide', () => {
      const now = Date.now();
      if (!this.isPaused) {
        const elapsedSec = Math.round((now - this.pageEnterTime) / 1000);
        if (elapsedSec > 0 && elapsedSec < 1800) {
          this.addTimeToPage(this.currentPage, elapsedSec);
        }
      }
      this.session.isLive = false;
      this.session.lastActiveAt = new Date(now).toISOString();
      this.syncSession(true);
      this.sendWhatsAppSummaryOnExit();
    });

    window.addEventListener('resize', () => {
      if (this.session) {
        this.session.screen = `${window.innerWidth}x${window.innerHeight} (${screen.width}x${screen.height})`;
        this.session.orientation = window.innerWidth > window.innerHeight ? 'Horizontal' : 'Vertical';
      }
    });
  }

  startHeartbeat() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    // Latido en vivo cada 6 segundos para actualización fluida de Live Activity
    this.syncTimer = setInterval(() => {
      if (!this.isPaused && document.visibilityState === 'visible') {
        const now = Date.now();
        const elapsedSec = Math.round((now - this.pageEnterTime) / 1000);
        if (elapsedSec > 0) {
          this.addTimeToPage(this.currentPage, elapsedSec);
          this.pageEnterTime = now;
        }
        this.session.isLive = true;
        this.session.activePage = this.currentPage;
        this.session.activePageTitle = this.getPageTitle(this.currentPage);
        this.session.lastActiveAt = new Date(now).toISOString();
        this.syncSession();
      }
    }, 6000);
  }

  getRemoteBackendUrl() {
    const savedConfig = localStorage.getItem(analyticsConfig.storageKeys.remoteConfig);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.firebaseUrl) return { type: 'firebase', url: parsed.firebaseUrl.replace(/\/$/, '') };
        if (parsed.googleSheetsUrl) return { type: 'sheets', url: parsed.googleSheetsUrl };
      } catch (e) {}
    }

    if (analyticsConfig.firebaseUrl) {
      return { type: 'firebase', url: analyticsConfig.firebaseUrl.replace(/\/$/, '') };
    }
    if (analyticsConfig.googleSheetsUrl) {
      return { type: 'sheets', url: analyticsConfig.googleSheetsUrl };
    }

    return null;
  }

  syncSession(isBeacon = false) {
    if (!this.session || this.isIgnored) return;

    try {
      const storage = analyticsConfig.storageKeys;
      localStorage.setItem(storage.lastActive, Date.now().toString());

      // 1. Guardar en memoria local
      let history = [];
      try {
        history = JSON.parse(localStorage.getItem(storage.sessionsHistory) || '[]');
      } catch (e) {
        history = [];
      }

      const existingIndex = history.findIndex(s => s.sessionId === this.session.sessionId);
      if (existingIndex >= 0) {
        history[existingIndex] = { ...this.session };
      } else {
        history.unshift({ ...this.session });
      }

      if (history.length > 50) history = history.slice(0, 50);
      localStorage.setItem(storage.sessionsHistory, JSON.stringify(history));

      // 2. Enviar a Firebase Realtime Database
      const remote = this.getRemoteBackendUrl();
      if (!remote) return;

      const payload = JSON.stringify(this.session);

      if (remote.type === 'firebase') {
        const endpoint = `${remote.url}/sessions/${this.session.sessionId}.json`;
        if (isBeacon && navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon(endpoint, blob);
        } else {
          fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true
          }).catch(() => {});
        }
      }
    } catch (err) {}
  }

  async checkAndTriggerWhatsAppAlerts() {
    if (!this.session || this.isIgnored) return;

    try {
      const remote = this.getRemoteBackendUrl();
      if (!remote || remote.type !== 'firebase') return;

      const res = await fetch(`${remote.url}/config.json`);
      if (!res.ok) return;
      const config = await res.json();
      if (!config || !config.whatsapp || !config.whatsapp.enabled) return;

      const { phone, apiKey } = config.whatsapp;
      if (!phone || !apiKey) return;

      // 1. Alerta Inmediata de Apertura (Con margen de 15 mins para evitar spam si refresca la página)
      const lastAlertTime = parseInt(localStorage.getItem('wa_last_open_alert') || '0', 10);
      const isRecent = (Date.now() - lastAlertTime) < (15 * 60 * 1000);

      if (!sessionStorage.getItem('wa_notified_open') && !isRecent) {
        sessionStorage.setItem('wa_notified_open', 'true');
        localStorage.setItem('wa_last_open_alert', Date.now().toString());

        const loc = this.session.location?.city ? `${this.session.location.city}, ${this.session.location.country}` : 'Bogotá, Colombia';
        const time = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

        const openMsg = `🔔 *¡Lau acaba de abrir tu libro!* 📖💖\n\n` +
          `• *Dispositivo:* ${this.session.device || 'Móvil'} (${this.session.os || 'iOS'})\n` +
          `• *Ubicación:* ${loc}\n` +
          `• *Hora:* ${time}\n\n` +
          `👉 *Sigue su lectura en vivo:* https://alejandro18000.github.io/libro-lau/stats.html`;

        this.sendWhatsAppMessage(phone, apiKey, openMsg);
      }
    } catch (e) {
      console.warn("WhatsApp alert error:", e);
    }
  }

  async sendWhatsAppSummaryOnExit() {
    if (!this.session || this.isIgnored) return;
    if (this.session.totalSeconds < 10) return; // Solo si permaneció al menos 10s leyendo
    if (sessionStorage.getItem('wa_summary_sent')) return;

    try {
      const remote = this.getRemoteBackendUrl();
      if (!remote || remote.type !== 'firebase') return;

      const res = await fetch(`${remote.url}/config.json`);
      if (!res.ok) return;
      const config = await res.json();
      if (!config || !config.whatsapp || !config.whatsapp.enabled) return;

      const { phone, apiKey } = config.whatsapp;
      if (!phone || !apiKey) return;

      sessionStorage.setItem('wa_summary_sent', 'true');

      const mins = Math.floor(this.session.totalSeconds / 60);
      const secs = this.session.totalSeconds % 60;
      const durStr = mins > 0 ? `${mins} min ${secs} seg` : `${secs} segundos`;
      const maxPage = this.session.maxPageReached === 0 ? 'Portada' : `Pág. ${this.session.maxPageReached}`;
      const musicStr = this.session.musicPlayed ? `Sí 🎶 (${this.session.musicDurationSec || 0}s)` : 'No reproducida';

      const summaryMsg = `📊 *Mini Informe de Lectura — Lau* 📖\n\n` +
        `• ⏱️ *Tiempo total:* ${durStr}\n` +
        `• 📑 *Página máxima alcanzada:* ${maxPage}\n` +
        `• 🎵 *Canción Taylor:* ${musicStr}\n` +
        `• 🚶‍♀️ *Ritmo de lectura:* ${this.session.readingPace || 'Lectura pausada'}\n\n` +
        `🔗 *Ver estadísticas completas:* https://alejandro18000.github.io/libro-lau/stats.html`;

      this.sendWhatsAppMessage(phone, apiKey, summaryMsg);
    } catch(e) {}
  }

  sendWhatsAppMessage(phone, apiKey, text) {
    if (!phone || !apiKey || !text) return;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey)}`;
    try {
      fetch(url, { mode: 'no-cors', keepalive: true }).catch(() => {});
    } catch (e) {}
  }
}

export const telemetry = new TelemetryService();
