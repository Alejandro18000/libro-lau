/**
 * stats.js
 * Lógica del panel privado de estadísticas y telemetría para el libro de Lau.
 */

import './stats.css';
import { analyticsConfig } from '../services/analyticsConfig.js';
import { bookPages } from '../chapters/chaptersData.js';

class StatsDashboard {
  constructor() {
    this.isAuthenticated = false;
    this.currentPin = '';
    this.sessions = [];
    this.pollInterval = null;

    this.initElements();
    this.bindEvents();
    this.checkStoredAuth();
  }

  initElements() {
    this.pinScreen = document.getElementById('pin-screen');
    this.pinDots = document.querySelectorAll('.pin-dot');
    this.pinError = document.getElementById('pin-error');
    this.dashApp = document.getElementById('dashboard-app');

    // Header y acciones
    this.liveIndicator = document.getElementById('live-indicator');
    this.liveText = document.getElementById('live-text');
    this.btnRefresh = document.getElementById('btn-refresh');
    this.btnSettings = document.getElementById('btn-settings');
    this.btnLock = document.getElementById('btn-lock');

    // KPIs
    this.valVisits = document.getElementById('val-visits');
    this.descVisits = document.getElementById('desc-visits');
    this.valTotalTime = document.getElementById('val-total-time');
    this.descAvgTime = document.getElementById('desc-avg-time');
    this.valLastSeen = document.getElementById('val-last-seen');
    this.descDevice = document.getElementById('desc-device');
    this.valSong = document.getElementById('val-song');
    this.descSong = document.getElementById('desc-song');

    // Página favorita
    this.favBanner = document.getElementById('favorite-banner');
    this.favPageName = document.getElementById('fav-page-name');
    this.favPageTime = document.getElementById('fav-page-time');

    // Contenedores
    this.pageBarsContainer = document.getElementById('page-bars-container');
    this.sessionsListContainer = document.getElementById('sessions-list-container');

    // Modal de ajustes
    this.settingsModal = document.getElementById('settings-modal');
    this.inputFirebase = document.getElementById('input-firebase-url');
    this.inputPin = document.getElementById('input-custom-pin');
    this.btnSaveSettings = document.getElementById('btn-save-settings');
    this.btnCloseSettings = document.getElementById('btn-close-settings');
    this.settingsNotice = document.getElementById('settings-notice');
  }

  bindEvents() {
    // Teclado del PIN
    document.querySelectorAll('.pin-btn[data-val]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-val');
        this.handlePinInput(val);
      });
    });

    // Teclado físico
    window.addEventListener('keydown', (e) => {
      if (!this.isAuthenticated) {
        if (/^[0-9]$/.test(e.key)) {
          this.handlePinInput(e.key);
        } else if (e.key === 'Backspace') {
          this.handlePinInput('del');
        } else if (e.key === 'Escape') {
          this.handlePinInput('clear');
        }
      }
    });

    // Botones de acción
    if (this.btnRefresh) {
      this.btnRefresh.addEventListener('click', () => {
        this.btnRefresh.classList.add('rotating');
        this.fetchData().then(() => {
          setTimeout(() => this.btnRefresh.classList.remove('rotating'), 500);
        });
      });
    }

    if (this.btnLock) {
      this.btnLock.addEventListener('click', () => this.lockDashboard());
    }

    if (this.btnSettings) {
      this.btnSettings.addEventListener('click', () => this.openSettings());
    }

    if (this.btnCloseSettings) {
      this.btnCloseSettings.addEventListener('click', () => this.closeSettings());
    }

    if (this.btnSaveSettings) {
      this.btnSaveSettings.addEventListener('click', () => this.saveSettings());
    }
  }

  getConfiguredPin() {
    const savedConfig = localStorage.getItem(analyticsConfig.storageKeys.remoteConfig);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.customPin) return parsed.customPin;
      } catch (e) {}
    }
    return analyticsConfig.dashboardPin || '2709';
  }

  checkStoredAuth() {
    const isAuth = sessionStorage.getItem('libro_lau_auth_unlocked');
    if (isAuth === 'true') {
      this.unlockDashboard();
    }
  }

  handlePinInput(val) {
    if (val === 'clear') {
      this.currentPin = '';
      this.updatePinDots();
      return;
    }

    if (val === 'del') {
      this.currentPin = this.currentPin.slice(0, -1);
      this.updatePinDots();
      return;
    }

    if (this.currentPin.length < 4) {
      this.currentPin += val;
      this.updatePinDots();

      if (this.currentPin.length === 4) {
        setTimeout(() => this.validatePin(), 120);
      }
    }
  }

  updatePinDots() {
    this.pinDots.forEach((dot, index) => {
      dot.classList.toggle('filled', index < this.currentPin.length);
    });
    if (this.pinError) this.pinError.classList.remove('visible');
  }

  validatePin() {
    const validPin = this.getConfiguredPin();
    if (this.currentPin === validPin) {
      sessionStorage.setItem('libro_lau_auth_unlocked', 'true');
      this.unlockDashboard();
    } else {
      if (this.pinError) {
        this.pinError.textContent = 'PIN incorrecto. Intenta de nuevo.';
        this.pinError.classList.add('visible');
      }
      const modal = document.querySelector('.pin-modal');
      if (modal) {
        modal.style.animation = 'shake 0.35s ease';
        setTimeout(() => modal.style.animation = '', 400);
      }
      this.currentPin = '';
      this.updatePinDots();
    }
  }

  unlockDashboard() {
    this.isAuthenticated = true;
    if (this.pinScreen) this.pinScreen.classList.add('hidden');
    this.fetchData();

    // Polling automático cada 10 segundos
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => this.fetchData(true), 10000);
  }

  lockDashboard() {
    this.isAuthenticated = false;
    sessionStorage.removeItem('libro_lau_auth_unlocked');
    this.currentPin = '';
    this.updatePinDots();
    if (this.pinScreen) this.pinScreen.classList.remove('hidden');
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  getRemoteConfig() {
    const savedConfig = localStorage.getItem(analyticsConfig.storageKeys.remoteConfig);
    if (savedConfig) {
      try {
        return JSON.parse(savedConfig);
      } catch (e) {}
    }
    return {
      firebaseUrl: analyticsConfig.firebaseUrl || '',
      googleSheetsUrl: analyticsConfig.googleSheetsUrl || '',
      customPin: analyticsConfig.dashboardPin || '2709'
    };
  }

  async fetchData(silent = false) {
    let sessionsMap = new Map();

    // 1. Cargar sesiones locales
    try {
      const local = JSON.parse(localStorage.getItem(analyticsConfig.storageKeys.sessionsHistory) || '[]');
      local.forEach(s => {
        if (s && s.sessionId) sessionsMap.set(s.sessionId, s);
      });
    } catch (e) {}

    // 2. Cargar sesiones remotas desde Firebase si está configurado
    const cfg = this.getRemoteConfig();
    if (cfg.firebaseUrl) {
      try {
        const cleanUrl = cfg.firebaseUrl.replace(/\/$/, '');
        const res = await fetch(`${cleanUrl}/sessions.json`);
        if (res.ok) {
          const remoteSessions = await res.json();
          if (remoteSessions && typeof remoteSessions === 'object') {
            Object.values(remoteSessions).forEach(s => {
              if (s && s.sessionId) {
                // Si la sesión remota tiene más segundos o actividad más reciente, sobrescribe
                const localS = sessionsMap.get(s.sessionId);
                if (!localS || (s.totalSeconds || 0) >= (localS.totalSeconds || 0)) {
                  sessionsMap.set(s.sessionId, s);
                }
              }
            });
          }
        }
      } catch (err) {
        if (!silent) console.warn('Error conectando a Firebase:', err);
      }
    }

    this.sessions = Array.from(sessionsMap.values()).sort((a, b) => {
      const timeA = new Date(b.startedAt || b.lastActiveAt || 0).getTime();
      const timeB = new Date(a.startedAt || a.lastActiveAt || 0).getTime();
      return timeA - timeB;
    });

    this.renderDashboard();
  }

  formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '0 s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s} s`;
    if (s === 0) return `${m} min`;
    return `${m}m ${s}s`;
  }

  formatRelativeTime(isoString) {
    if (!isoString) return 'Desconocido';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.round((now - date) / 1000);

    if (diffSec < 45) return 'Hace unos segundos';
    if (diffSec < 3600) return `Hace ${Math.floor(diffSec / 60)} min`;
    if (diffSec < 86400) return `Hace ${Math.floor(diffSec / 3600)} h`;

    return date.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  renderDashboard() {
    if (!this.sessions || this.sessions.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Calcular Métricas Agregadas
    const totalSessions = this.sessions.length;
    let totalSecs = 0;
    let musicPlays = 0;
    let maxMusicSecs = 0;
    let latestSession = this.sessions[0];
    let isCurrentlyLive = false;

    // Mapa de tiempos por página acumulados
    const pageTimesAcc = {};

    this.sessions.forEach(s => {
      totalSecs += (s.totalSeconds || 0);
      if (s.musicPlayed) {
        musicPlays += (s.musicPlayCount || 1);
      }
      if (s.musicDurationSec > maxMusicSecs) {
        maxMusicSecs = s.musicDurationSec;
      }

      // Revisar si está activa en los últimos 90 segundos
      const lastActiveMs = new Date(s.lastActiveAt || 0).getTime();
      if (Date.now() - lastActiveMs < 90000 && s.isLive !== false) {
        isCurrentlyLive = true;
      }

      // Sumar tiempos de cada página
      if (s.pageTimes) {
        Object.entries(s.pageTimes).forEach(([pageNum, pData]) => {
          if (!pageTimesAcc[pageNum]) {
            pageTimesAcc[pageNum] = {
              title: pData.title || `Página ${pageNum}`,
              seconds: 0,
              visits: 0
            };
          }
          pageTimesAcc[pageNum].seconds += (pData.seconds || 0);
          pageTimesAcc[pageNum].visits += (pData.visits || 1);
        });
      }
    });

    const avgSecs = Math.round(totalSecs / Math.max(1, totalSessions));

    // 1. Estado en vivo
    if (this.liveIndicator) {
      this.liveIndicator.classList.toggle('online', isCurrentlyLive);
      if (this.liveText) {
        this.liveText.textContent = isCurrentlyLive ? 'Leyendo en vivo ahora mismo' : 'Desconectada';
      }
    }

    // 2. KPIs
    if (this.valVisits) this.valVisits.textContent = `${totalSessions}`;
    if (this.descVisits) this.descVisits.textContent = totalSessions === 1 ? '1 lectura registrada' : `${totalSessions} visitas al libro`;

    if (this.valTotalTime) this.valTotalTime.textContent = this.formatDuration(totalSecs);
    if (this.descAvgTime) this.descAvgTime.textContent = `Promedio: ${this.formatDuration(avgSecs)} por visita`;

    if (this.valLastSeen) this.valLastSeen.textContent = this.formatRelativeTime(latestSession.lastActiveAt || latestSession.startedAt);
    if (this.descDevice) this.descDevice.textContent = `${latestSession.device || 'Móvil'} • ${latestSession.browser || 'Navegador'}`;

    if (this.valSong) {
      this.valSong.textContent = musicPlays > 0 ? `${musicPlays} veces` : 'No reproducida';
    }
    if (this.descSong) {
      this.descSong.textContent = musicPlays > 0 ? `invisible string (${this.formatDuration(maxMusicSecs)})` : 'No ha presionado play';
    }

    // 3. Página Favorita (Mayor tiempo de lectura)
    let favPageNum = null;
    let maxPageSecs = 0;
    Object.entries(pageTimesAcc).forEach(([num, data]) => {
      if (data.seconds > maxPageSecs) {
        maxPageSecs = data.seconds;
        favPageNum = num;
      }
    });

    if (favPageNum !== null && maxPageSecs > 0 && this.favBanner) {
      this.favBanner.style.display = 'flex';
      const favData = pageTimesAcc[favPageNum];
      if (this.favPageName) this.favPageName.textContent = favData.title;
      if (this.favPageTime) this.favPageTime.textContent = `${this.formatDuration(favData.seconds)} de lectura`;
    }

    // 4. Gráfico de barras de tiempo por página
    this.renderPageBars(pageTimesAcc, maxPageSecs);

    // 5. Historial de sesiones
    this.renderSessionsList();
  }

  renderPageBars(pageTimesAcc, maxPageSecs) {
    if (!this.pageBarsContainer) return;

    // Asegurar orden de páginas 0 a N
    const totalPages = bookPages.length + 2;
    const rows = [];

    for (let i = 0; i < totalPages; i++) {
      const data = pageTimesAcc[i] || {
        title: this.getDefaultPageTitle(i),
        seconds: 0,
        visits: 0
      };

      const pct = maxPageSecs > 0 ? Math.max(4, Math.round((data.seconds / maxPageSecs) * 100)) : 0;
      const isTop = data.seconds === maxPageSecs && maxPageSecs > 0;

      rows.push(`
        <div class="page-bar-row">
          <div class="page-bar-meta">
            <span class="page-bar-name">${data.title} ${isTop ? '⭐' : ''}</span>
            <span class="page-bar-time">${this.formatDuration(data.seconds)} (${data.visits} ${data.visits === 1 ? 'vez' : 'veces'})</span>
          </div>
          <div class="page-bar-track">
            <div class="page-bar-fill ${isTop ? 'highlight' : ''}" style="width: ${pct}%"></div>
          </div>
        </div>
      `);
    }

    this.pageBarsContainer.innerHTML = rows.join('');
  }

  getDefaultPageTitle(pageIndex) {
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

  renderSessionsList() {
    if (!this.sessionsListContainer) return;

    const cards = this.sessions.map((s, index) => {
      const num = this.sessions.length - index;
      const dateStr = new Date(s.startedAt || s.lastActiveAt).toLocaleString('es-CO', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      const photosStr = (s.photosViewed && s.photosViewed.length > 0)
        ? `${s.photosViewed.length} ampliadas`
        : 'Ninguna';

      return `
        <div class="session-card">
          <div class="session-card-header">
            <span class="session-badge">Visita #${s.visitNumber || num}</span>
            <span class="session-date">${dateStr} (${this.formatRelativeTime(s.lastActiveAt)})</span>
          </div>
          <div class="session-details-grid">
            <div class="session-detail-item">
              <span class="session-detail-label">Dispositivo</span>
              <span class="session-detail-val">${s.device || 'Móvil'} (${s.browser || 'Web'})</span>
            </div>
            <div class="session-detail-item">
              <span class="session-detail-label">Tiempo Lectura</span>
              <span class="session-detail-val">${this.formatDuration(s.totalSeconds)}</span>
            </div>
            <div class="session-detail-item">
              <span class="session-detail-label">Progreso</span>
              <span class="session-detail-val">${s.completedBook ? 'Completó el libro (100%)' : `Hasta Pág. ${s.maxPageReached || 0}`}</span>
            </div>
            <div class="session-detail-item">
              <span class="session-detail-label">Canción Taylor</span>
              <span class="session-detail-val">${s.musicPlayed ? `Escuchó ${this.formatDuration(s.musicDurationSec)}` : 'No'}</span>
            </div>
            <div class="session-detail-item">
              <span class="session-detail-label">Fotos Polaroid</span>
              <span class="session-detail-val">${photosStr}</span>
            </div>
          </div>
        </div>
      `;
    });

    this.sessionsListContainer.innerHTML = cards.join('');
  }

  renderEmptyState() {
    if (this.valVisits) this.valVisits.textContent = '0';
    if (this.valTotalTime) this.valTotalTime.textContent = '0 s';
    if (this.valLastSeen) this.valLastSeen.textContent = 'Sin visitas';
    if (this.valSong) this.valSong.textContent = 'Sin reproducir';
    if (this.favBanner) this.favBanner.style.display = 'none';

    if (this.pageBarsContainer) {
      this.pageBarsContainer.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.9rem;">
          Aún no hay visitas registradas.<br>
          <span style="font-size: 0.8rem; opacity: 0.7;">
            Abre el libro principal en tu celular o compárteselo a Lau para ver aquí los tiempos y páginas en vivo.
          </span>
        </div>
      `;
    }

    if (this.sessionsListContainer) {
      this.sessionsListContainer.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.85rem;">
          El historial de sesiones aparecerá aquí automáticamente.
        </div>
      `;
    }
  }

  openSettings() {
    const cfg = this.getRemoteConfig();
    if (this.inputFirebase) this.inputFirebase.value = cfg.firebaseUrl || '';
    if (this.inputPin) this.inputPin.value = cfg.customPin || '2709';
    if (this.settingsNotice) this.settingsNotice.textContent = '';
    if (this.settingsModal) this.settingsModal.classList.add('active');
  }

  closeSettings() {
    if (this.settingsModal) this.settingsModal.classList.remove('active');
  }

  saveSettings() {
    const firebaseUrl = (this.inputFirebase?.value || '').trim();
    const customPin = (this.inputPin?.value || '').trim() || '2709';

    const newConfig = {
      firebaseUrl,
      customPin
    };

    localStorage.setItem(analyticsConfig.storageKeys.remoteConfig, JSON.stringify(newConfig));

    if (this.settingsNotice) {
      this.settingsNotice.style.color = 'var(--accent-green)';
      this.settingsNotice.textContent = '¡Ajustes guardados correctamente!';
    }

    setTimeout(() => {
      this.closeSettings();
      this.fetchData();
    }, 600);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new StatsDashboard();
});
