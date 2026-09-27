/**
 * TelemetryService.js
 * Rastreador silencioso de lectura y telemetría para el libro de Lau.
 * Funciona de forma invisible en segundo plano, sin interferir con la navegación ni mostrar avisos.
 */

import { analyticsConfig } from './analyticsConfig.js';
import { chapters, bookPages, bookMetadata } from '../chapters/chaptersData.js';

export class TelemetryService {
  constructor() {
    this.session = null;
    this.pageEnterTime = Date.now();
    this.currentPage = 0;
    this.isPaused = false;
    this.syncTimer = null;
    this.hasInitialSync = false;

    this.init();
  }

  init() {
    try {
      const now = Date.now();
      const storage = analyticsConfig.storageKeys;

      // 1. Identificador único de visitante
      let visitorId = localStorage.getItem(storage.visitorId);
      if (!visitorId) {
        visitorId = 'lau_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
        localStorage.setItem(storage.visitorId, visitorId);
      }

      // 2. Contador de visitas repetidas
      let visitCount = parseInt(localStorage.getItem(storage.visitCount) || '0', 10);
      const lastActive = parseInt(localStorage.getItem(storage.lastActive) || '0', 10);
      const timeoutMs = (analyticsConfig.sessionTimeoutMinutes || 30) * 60 * 1000;

      // Si es la primera vez o pasaron más de 30 minutos desde la última visita, es una nueva sesión
      const isNewSession = !lastActive || (now - lastActive > timeoutMs);
      if (isNewSession) {
        visitCount += 1;
        localStorage.setItem(storage.visitCount, visitCount.toString());
      }
      localStorage.setItem(storage.lastActive, now.toString());

      // 3. Detección de dispositivo y entorno
      const deviceInfo = this.detectDevice();

      // 4. Crear sesión activa
      this.session = {
        sessionId: 'ses_' + now + '_' + Math.random().toString(36).substring(2, 7),
        visitorId: visitorId,
        visitNumber: visitCount,
        startedAt: new Date(now).toISOString(),
        lastActiveAt: new Date(now).toISOString(),
        device: deviceInfo.device,
        os: deviceInfo.os,
        browser: deviceInfo.browser,
        screen: `${window.innerWidth}x${window.innerHeight} (${screen.width}x${screen.height})`,
        language: navigator.language || 'es',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota',
        totalSeconds: 0,
        activePage: 0,
        maxPageReached: 0,
        completedBook: false,
        musicPlayed: false,
        musicPlayCount: 0,
        musicDurationSec: 0,
        photosViewed: [],
        tocOpened: false,
        pageTimes: {}, // { [pageNum]: { title, seconds, visits } }
        isLive: true
      };

      // Registrar página inicial (Portada)
      this.initPageTime(0);

      // 5. Configurar listeners de visibilidad y cierre
      this.setupLifecycleListeners();

      // 6. Sincronización periódica
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
    let device = 'Computador / Desktop';
    let browser = 'Navegador Web';

    // Sistema Operativo y Dispositivo
    if (/iPhone/i.test(ua)) {
      device = 'iPhone';
      os = 'iOS';
    } else if (/iPad/i.test(ua)) {
      device = 'iPad';
      os = 'iPadOS';
    } else if (/Android/i.test(ua)) {
      os = 'Android';
      device = /Mobile/i.test(ua) ? 'Móvil Android' : 'Tablet Android';
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
      os = 'macOS';
      device = 'Mac';
    } else if (/Windows NT/i.test(ua)) {
      os = 'Windows';
      device = 'PC Windows';
    }

    // Navegador o Webview de Apps
    if (/WhatsApp/i.test(ua)) {
      browser = 'WhatsApp (Visor interno)';
    } else if (/Instagram/i.test(ua)) {
      browser = 'Instagram (Visor interno)';
    } else if (/FBAN|FBAV/i.test(ua)) {
      browser = 'Facebook (Visor interno)';
    } else if (/CriOS/i.test(ua)) {
      browser = 'Chrome iOS';
    } else if (/FxiOS/i.test(ua)) {
      browser = 'Firefox iOS';
    } else if (/Chrome|Chromium/i.test(ua) && !/Edg/i.test(ua)) {
      browser = 'Google Chrome';
    } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
      browser = 'Safari';
    } else if (/Edg/i.test(ua)) {
      browser = 'Microsoft Edge';
    } else if (/Firefox/i.test(ua)) {
      browser = 'Firefox';
    }

    return { device, os, browser };
  }

  getPageTitle(pageIndex) {
    if (pageIndex === 0) return 'Portada';
    const totalPages = bookPages.length + 2; // Portada + páginas + contratapa
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
        visits: 0
      };
    }
    this.session.pageTimes[pageIndex].visits += 1;
  }

  /**
   * Llamado cada vez que pasa de página en el libro
   */
  onPageFlip(newPageIndex, totalPages) {
    if (!this.session) return;

    const now = Date.now();
    if (!this.isPaused) {
      const elapsedSec = Math.round((now - this.pageEnterTime) / 1000);
      if (elapsedSec > 0 && elapsedSec < 1800) { // evitar anomalías mayores a 30m
        this.addTimeToPage(this.currentPage, elapsedSec);
      }
    }

    this.currentPage = newPageIndex;
    this.pageEnterTime = now;
    this.session.activePage = newPageIndex;
    this.session.lastActiveAt = new Date(now).toISOString();

    if (newPageIndex > this.session.maxPageReached) {
      this.session.maxPageReached = newPageIndex;
    }

    // Si llegó a la última página o contratapa
    if (totalPages && newPageIndex >= totalPages - 2) {
      this.session.completedBook = true;
    }

    this.initPageTime(newPageIndex);
    this.syncSession();
  }

  addTimeToPage(pageIndex, seconds) {
    if (!this.session.pageTimes[pageIndex]) {
      this.initPageTime(pageIndex);
    }
    this.session.pageTimes[pageIndex].seconds += seconds;
    this.session.totalSeconds += seconds;
  }

  /**
   * Registro de la canción "invisible string"
   */
  onMusicPlay() {
    if (!this.session) return;
    this.session.musicPlayed = true;
    this.session.musicPlayCount += 1;
    this.session.lastActiveAt = new Date().toISOString();
    this.syncSession();
  }

  onMusicTimeUpdate(currentSeconds) {
    if (!this.session) return;
    const sec = Math.round(currentSeconds);
    if (sec > this.session.musicDurationSec) {
      this.session.musicDurationSec = sec;
    }
  }

  /**
   * Registro de fotos ampliadas en el Lightbox
   */
  onPhotoZoom(caption) {
    if (!this.session) return;
    const title = caption || 'Foto polaroid';
    if (!this.session.photosViewed.includes(title)) {
      this.session.photosViewed.push(title);
      this.session.lastActiveAt = new Date().toISOString();
      this.syncSession();
    }
  }

  /**
   * Registro de apertura del índice de capítulos
   */
  onTocOpen() {
    if (!this.session) return;
    this.session.tocOpened = true;
    this.session.lastActiveAt = new Date().toISOString();
    this.syncSession();
  }

  setupLifecycleListeners() {
    // 1. Pausa y reanudación automática si la app va a segundo plano o se bloquea el teléfono
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
        this.syncSession(true); // Enviar baliza al suspender
      } else {
        this.isPaused = false;
        this.session.isLive = true;
        this.pageEnterTime = Date.now();
        this.session.lastActiveAt = new Date().toISOString();
        this.syncSession();
      }
    });

    // 2. Al cerrar la pestaña o recargar
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
    });
  }

  startHeartbeat() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    const interval = analyticsConfig.syncIntervalMs || 15000;

    this.syncTimer = setInterval(() => {
      if (!this.isPaused && document.visibilityState === 'visible') {
        const now = Date.now();
        const elapsedSec = Math.round((now - this.pageEnterTime) / 1000);
        if (elapsedSec > 0) {
          this.addTimeToPage(this.currentPage, elapsedSec);
          this.pageEnterTime = now;
        }
        this.session.lastActiveAt = new Date(now).toISOString();
        this.syncSession();
      }
    }, interval);
  }

  /**
   * Obtiene la URL de Firebase configurada (en config o guardada en localStorage)
   */
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

  /**
   * Sincroniza la sesión actual tanto en localStorage como en el backend remoto
   */
  syncSession(isBeacon = false) {
    if (!this.session) return;

    try {
      const storage = analyticsConfig.storageKeys;
      localStorage.setItem(storage.lastActive, Date.now().toString());

      // 1. Guardar en localStorage (Historial de sesiones para visualización local)
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

      // Conservar las últimas 50 sesiones en memoria local
      if (history.length > 50) history = history.slice(0, 50);
      localStorage.setItem(storage.sessionsHistory, JSON.stringify(history));

      // 2. Sincronizar en backend remoto (Firebase o Google Sheets)
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
      } else if (remote.type === 'sheets') {
        if (isBeacon && navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'text/plain' });
          navigator.sendBeacon(remote.url, blob);
        } else {
          fetch(remote.url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: payload,
            keepalive: true
          }).catch(() => {});
        }
      }
    } catch (err) {
      // Falla silenciosa para nunca interrumpir la experiencia del usuario
    }
  }
}

// Instancia única (Singleton) para toda la aplicación
export const telemetry = new TelemetryService();
