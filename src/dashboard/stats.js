/**
 * stats.js
 * Controlador del panel de telemetría estilo Apple Glass (iOS 18 / visionOS).
 * Procesa métricas de lectura en vivo, mapas de calor, relecturas, fotos,
 * detección de múltiples visitantes (Lau vs otros) y exclusión del equipo creador.
 */

import './stats.css';
import { analyticsConfig } from '../services/analyticsConfig.js';
import { bookPages } from '../chapters/chaptersData.js';

class AppleStatsDashboard {
  constructor() {
    this.isAuthenticated = false;
    this.currentPin = '';
    this.sessions = [];
    this.pollInterval = null;
    this.currentTab = 'tab-overview';
    this.selectedVisitorFilter = 'all';

    this.initElements();
    this.bindEvents();
    this.checkStoredAuth();
    this.initDynamicLighting();
  }

  initDynamicLighting() {
    const pointerGlow = document.getElementById('pointer-glow');
    if (!pointerGlow) return;

    let targetX = window.innerWidth * 0.5;
    let targetY = window.innerHeight * 0.32;
    let currentX = targetX;
    let currentY = targetY;
    let lastUserMove = Date.now();
    let angle = 0;

    const onPointerMove = (e) => {
      lastUserMove = Date.now();
      targetX = e.clientX;
      targetY = e.clientY;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        onPointerMove(e.touches[0]);
      }
    }, { passive: true });

    // Movimiento orgánico continuo con inercia líquida (lerp)
    const animateLight = () => {
      // Si el usuario no mueve el cursor por 2s, la luz oscila con elegancia orgánica
      if (Date.now() - lastUserMove > 2000) {
        angle += 0.012;
        targetX = (window.innerWidth * 0.5) + Math.sin(angle) * (window.innerWidth * 0.28);
        targetY = (window.innerHeight * 0.36) + Math.cos(angle * 1.5) * (window.innerHeight * 0.20);
      }

      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;

      pointerGlow.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(animateLight);
    };

    requestAnimationFrame(animateLight);
  }

  initElements() {
    // PIN Lock Screen
    this.pinScreen = document.getElementById('pin-screen');
    this.pinDots = document.querySelectorAll('.pin-dot');
    this.pinError = document.getElementById('pin-error');
    this.dashApp = document.getElementById('dashboard-app');

    // Live Activity Capsule
    this.liveActivityBar = document.getElementById('live-activity-bar');
    this.liveHeadline = document.getElementById('live-headline');
    this.liveSubtext = document.getElementById('live-subtext');
    this.liveTimePill = document.getElementById('live-time-pill');

    // Acciones del Header
    this.btnRefresh = document.getElementById('btn-refresh');
    this.btnWhatsApp = document.getElementById('btn-whatsapp');
    this.btnBannerWhatsApp = document.getElementById('btn-banner-whatsapp');
    this.btnSettings = document.getElementById('btn-settings');
    this.btnLock = document.getElementById('btn-lock');
    this.chipCreatorMode = document.getElementById('chip-creator-mode');

    // Visitor Detector Banner
    this.visitorDetectorBox = document.getElementById('visitor-detector-box');
    this.vdIcon = document.getElementById('vd-icon');
    this.vdTitle = document.getElementById('vd-title');
    this.vdDesc = document.getElementById('vd-desc');
    this.vdFilterButtons = document.getElementById('vd-filter-buttons');

    // Segmented Control Tabs
    this.segmentBtns = document.querySelectorAll('.segment-btn');
    this.tabPanes = document.querySelectorAll('.tab-pane');

    // Hero Overview (Tab 1)
    this.valEngagementScore = document.getElementById('val-engagement-score');
    this.valPaceTag = document.getElementById('val-pace-tag');
    this.valReadingPace = document.getElementById('val-reading-pace');
    this.valCompletionPct = document.getElementById('val-completion-pct');
    this.valReReadsTotal = document.getElementById('val-re-reads-total');
    this.engagementRingFill = document.getElementById('engagement-ring-fill');

    // Favorite Hero Card
    this.favHeroCard = document.getElementById('fav-hero-card');
    this.favChapterTitle = document.getElementById('fav-chapter-title');
    this.favChapterDesc = document.getElementById('fav-chapter-desc');
    this.favChapterTime = document.getElementById('fav-chapter-time');
    this.favChapterPct = document.getElementById('fav-chapter-pct');

    // Bento KPIs
    this.valTotalVisits = document.getElementById('val-total-visits');
    this.descVisitsCount = document.getElementById('desc-visits-count');
    this.valTotalReadingTime = document.getElementById('val-total-reading-time');
    this.descAvgReadingTime = document.getElementById('desc-avg-reading-time');
    this.valLastSeenDate = document.getElementById('val-last-seen-date');
    this.descLastDevice = document.getElementById('desc-last-device');
    this.valMusicPlayed = document.getElementById('val-music-played');
    this.descMusicDuration = document.getElementById('desc-music-duration');
    this.valPhotosZoomed = document.getElementById('val-photos-zoomed');
    this.descPhotosZoomed = document.getElementById('desc-photos-zoomed');
    this.valGesturesCount = document.getElementById('val-gestures-count');
    this.descGesturesDetail = document.getElementById('desc-gestures-detail');

    // Tab 2: Chapters & Heatmap
    this.chaptersBarsContainer = document.getElementById('chapters-bars-list');

    // Tab 3: Multimedia & Fotos
    this.musicStatusPill = document.getElementById('music-status-pill');
    this.musicStatPlays = document.getElementById('music-stat-plays');
    this.musicStatDuration = document.getElementById('music-stat-duration');
    this.musicStatCompleted = document.getElementById('music-stat-completed');
    this.musicStatSpotify = document.getElementById('music-stat-spotify');
    this.photosInspectContainer = document.getElementById('photos-inspect-container');

    // Tab 4: Dispositivo & Entorno
    this.deviceSpecsContainer = document.getElementById('device-specs-container');

    // Tab 5: Sesiones Timeline
    this.sessionsTimelineContainer = document.getElementById('sessions-timeline-list');

    // Modal Ajustes
    this.settingsModal = document.getElementById('settings-modal');
    this.inputFirebase = document.getElementById('input-firebase-url');
    this.inputPin = document.getElementById('input-custom-pin');
    this.btnSaveSettings = document.getElementById('btn-save-settings');
    this.btnCancelSettings = document.getElementById('btn-cancel-settings');
    this.btnCloseSettings = document.getElementById('btn-close-settings');
    this.btnPurgeAll = document.getElementById('btn-purge-all');
    this.settingsNotice = document.getElementById('settings-notice');
  }

  bindEvents() {
    // Teclado PIN en pantalla
    document.querySelectorAll('.pin-btn[data-val]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handlePinInput(btn.getAttribute('data-val'));
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

    // Segmented Controls (Tabs)
    this.segmentBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });

    // Chip de Modo Creador
    if (this.chipCreatorMode) {
      this.chipCreatorMode.addEventListener('click', () => {
        alert('🛡️ Modo Creador Excluido:\n\nTu computadora y este navegador están 100% EXCLUIDOS de las métricas. Puedes abrir el libro tantas veces como quieras y NUNCA se sumará a las estadísticas ni alterará los datos de Lau.');
      });
    }

    // Botones de acción
    if (this.btnRefresh) {
      this.btnRefresh.addEventListener('click', () => {
        this.btnRefresh.style.transform = 'rotate(180deg)';
        this.fetchData().then(() => {
          setTimeout(() => this.btnRefresh.style.transform = '', 400);
        });
      });
    }

    if (this.btnLock) {
      this.btnLock.addEventListener('click', () => this.lockDashboard());
    }

    if (this.btnWhatsApp) {
      this.btnWhatsApp.addEventListener('click', () => this.shareToWhatsApp());
    }

    if (this.btnBannerWhatsApp) {
      this.btnBannerWhatsApp.addEventListener('click', () => this.shareToWhatsApp());
    }

    if (this.btnSettings) {
      this.btnSettings.addEventListener('click', () => this.openSettings());
    }

    if (this.btnCloseSettings) {
      this.btnCloseSettings.addEventListener('click', () => this.closeSettings());
    }
    if (this.btnCancelSettings) {
      this.btnCancelSettings.addEventListener('click', () => this.closeSettings());
    }

    if (this.btnSaveSettings) {
      this.btnSaveSettings.addEventListener('click', () => this.saveSettings());
    }

    if (this.btnPurgeAll) {
      this.btnPurgeAll.addEventListener('click', () => this.purgeAllTestSessions());
    }
  }

  shareToWhatsApp() {
    const sessions = this.sessions || [];
    if (sessions.length === 0) {
      alert("Aún no hay lecturas registradas para generar el reporte.");
      return;
    }

    const latest = sessions[0];
    const isLau = latest.device === 'iPhone' || !latest.isIgnored;

    // Formatear fecha y hora
    const dateObj = new Date(latest.startedAt || latest.lastActiveAt);
    const dateStr = dateObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    // Tiempo total
    const mins = Math.floor((latest.totalSeconds || 0) / 60);
    const secs = (latest.totalSeconds || 0) % 60;
    const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs} segundos`;

    // Ubicación
    const city = latest.location?.city || 'Bogotá';
    const country = latest.location?.country || 'Colombia';
    const locStr = `${city}, ${country}`;

    // Dispositivo
    const deviceStr = `${latest.device || 'Móvil'} (${latest.os || 'iOS'})`;

    // Página
    const pageTitle = latest.activePageTitle || (latest.activePage === 0 ? 'Portada' : `Pág. ${latest.activePage}`);
    const maxPageStr = latest.maxPageReached === 0 ? 'Portada' : `Pág. ${latest.maxPageReached}`;

    const report = [
      `*📊 REPORTE DE TELEMETRÍA — LIBRO PARA LAU*`,
      `_Fecha: ${dateStr} • ${timeStr}_`,
      ``,
      `📱 *Visitante Detectado:*`,
      `• *Identidad:* ${isLau ? '💖 Probablemente Lau' : '👤 Visitante anónimo'}`,
      `• *Dispositivo:* ${deviceStr}`,
      `• *Navegador:* ${latest.browser || 'Safari'} (${latest.colorScheme || 'Modo Oscuro'})`,
      `• *Ubicación:* ${locStr} 🇨🇴`,
      `• *N.º de Visita:* Visita ${latest.visitNumber || 1}`,
      ``,
      `⏱️ *Actividad y Lectura:*`,
      `• *Última página vista:* ${pageTitle}`,
      `• *Avance máximo:* ${maxPageStr}`,
      `• *Tiempo de lectura:* ${durationStr}`,
      `• *Música invisible string:* ${latest.musicPlayed ? 'Reproducida 🎶 (' + (latest.musicDurationSec || 0) + 's)' : 'Aún no reproducida'}`,
      `• *Ritmo:* ${latest.readingPace || 'Comenzando a ojear'}`,
      ``,
      `🛡️ *Tu equipo está 100% excluido.*`,
      `🔗 *Panel en vivo:* https://alejandro18000.github.io/libro-lau/stats.html`
    ].join('\n');

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(report)}`;
    window.open(waUrl, '_blank');
  }

  switchTab(targetTabId) {
    this.currentTab = targetTabId;
    this.segmentBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTabId);
    });
    this.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === targetTabId);
    });
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
        this.pinError.textContent = 'Código incorrecto. Intenta de nuevo.';
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
    // Excluir de forma permanente este dispositivo del conteo
    localStorage.setItem('libro_lau_ignore_device', 'true');
    if (this.pinScreen) this.pinScreen.classList.add('hidden');
    this.fetchData();

    // Sincronización en vivo cada 5 segundos (Latido de Live Activity)
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => this.fetchData(true), 5000);
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
      firebaseUrl: analyticsConfig.firebaseUrl || 'https://libro-lau-default-rtdb.firebaseio.com',
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

    // 2. Cargar sesiones remotas desde Firebase
    const cfg = this.getRemoteConfig();
    if (cfg.firebaseUrl) {
      try {
        const cleanUrl = cfg.firebaseUrl.replace(/\/$/, '');
        const res = await fetch(`${cleanUrl}/sessions.json`, { cache: 'no-store' });
        if (res.ok) {
          const remoteSessions = await res.json();
          if (remoteSessions && typeof remoteSessions === 'object') {
            Object.values(remoteSessions).forEach(s => {
              if (s && s.sessionId) {
                const localS = sessionsMap.get(s.sessionId);
                if (!localS || (s.totalSeconds || 0) >= (localS.totalSeconds || 0) || s.isLive) {
                  sessionsMap.set(s.sessionId, s);
                }
              }
            });
          }
        }
      } catch (err) {
        if (!silent) console.warn('Aviso de conexión Firebase:', err);
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

  async deleteSession(sessionId) {
    if (!confirm('¿Deseas descartar esta sesión de prueba de la base de datos?')) return;

    try {
      const cfg = this.getRemoteConfig();
      if (cfg.firebaseUrl) {
        await fetch(`${cfg.firebaseUrl.replace(/\/$/, '')}/sessions/${sessionId}.json`, { method: 'DELETE' });
      }

      // Eliminar de memoria local
      let local = [];
      try {
        local = JSON.parse(localStorage.getItem(analyticsConfig.storageKeys.sessionsHistory) || '[]');
        local = local.filter(s => s.sessionId !== sessionId);
        localStorage.setItem(analyticsConfig.storageKeys.sessionsHistory, JSON.stringify(local));
      } catch (e) {}

      this.sessions = this.sessions.filter(s => s.sessionId !== sessionId);
      this.renderDashboard();
    } catch (e) {
      alert('Error eliminando sesión: ' + e.message);
    }
  }

  async purgeAllTestSessions() {
    const confirmation = prompt('⚠️ ATENCIÓN:\nEsto borrará todas las visitas registradas hasta ahora para dejar la base de datos limpia en 0 antes de entregarle el libro a Lau.\n\nEscribe "BORRAR" para confirmar:');
    if (confirmation !== 'BORRAR') return;

    try {
      const cfg = this.getRemoteConfig();
      if (cfg.firebaseUrl) {
        await fetch(`${cfg.firebaseUrl.replace(/\/$/, '')}/sessions.json`, { method: 'DELETE' });
      }
      localStorage.removeItem(analyticsConfig.storageKeys.sessionsHistory);
      this.sessions = [];
      this.closeSettings();
      this.renderDashboard();
      alert('✅ Todas las sesiones de prueba han sido purgadas. Base de datos reseteada a 0.');
    } catch (e) {
      alert('Error limpiando base de datos: ' + e.message);
    }
  }

  renderVisitorDetector(sortedVisitors) {
    if (!this.visitorDetectorBox) return;

    if (!sortedVisitors || sortedVisitors.length === 0) {
      this.visitorDetectorBox.style.display = 'none';
      return;
    }

    this.visitorDetectorBox.style.display = 'flex';

    if (sortedVisitors.length === 1) {
      const v = sortedVisitors[0];
      const sampleSession = v[1][0] || {};
      this.visitorDetectorBox.className = 'apple-glass-card visitor-detector-banner single-visitor';
      if (this.vdIcon) this.vdIcon.textContent = '🟢';
      if (this.vdTitle) this.vdTitle.textContent = 'Solo 1 persona ha abierto el libro: Lau';
      if (this.vdDesc) {
        this.vdDesc.textContent = `Todas las ${v[1].length} lecturas provienen del mismo dispositivo (${sampleSession.device || 'Móvil'} en ${sampleSession.location?.city || 'Colombia'}). Nadie más tiene acceso.`;
      }
      if (this.vdFilterButtons) {
        this.vdFilterButtons.innerHTML = `
          <button class="vd-pill-btn active">Lectora Única (${v[1].length} visitas)</button>
        `;
      }
    } else {
      this.visitorDetectorBox.className = 'apple-glass-card visitor-detector-banner multiple-visitors';
      if (this.vdIcon) this.vdIcon.textContent = '👥';
      if (this.vdTitle) this.vdTitle.textContent = `Se detectaron ${sortedVisitors.length} personas o dispositivos distintos`;
      if (this.vdDesc) {
        this.vdDesc.textContent = `Se registraron lecturas desde distintos dispositivos. Puedes filtrar a continuación para ver únicamente la actividad de Lau:`;
      }

      if (this.vdFilterButtons) {
        const filterBtnsHtml = [
          `<button class="vd-pill-btn ${this.selectedVisitorFilter === 'all' ? 'active' : ''}" data-filter="all">Todas (${this.sessions.length})</button>`
        ];

        sortedVisitors.forEach((v, index) => {
          const sample = v[1][0] || {};
          const isLau = index === 0;
          const label = isLau ? `👩 Lau (${v[1].length})` : `👤 Visitante #${index + 1} (${v[1].length} • ${sample.device || 'Web'})`;
          const activeClass = this.selectedVisitorFilter === v[0] ? 'active' : '';
          filterBtnsHtml.push(`<button class="vd-pill-btn ${activeClass}" data-filter="${v[0]}">${label}</button>`);
        });

        this.vdFilterButtons.innerHTML = filterBtnsHtml.join('');

        this.vdFilterButtons.querySelectorAll('.vd-pill-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            this.selectedVisitorFilter = btn.getAttribute('data-filter');
            this.renderDashboard();
          });
        });
      }
    }
  }

  renderDashboard() {
    if (!this.sessions || this.sessions.length === 0) {
      this.renderEmptyState();
      return;
    }

    // 1. Agrupar sesiones por visitorId
    const visitorGroups = new Map();
    this.sessions.forEach(s => {
      const vid = s.visitorId || 'desconocido';
      if (!visitorGroups.has(vid)) {
        visitorGroups.set(vid, []);
      }
      visitorGroups.get(vid).push(s);
    });

    // Ordenar visitantes por tiempo total (el principal con más lectura es Lau)
    const sortedVisitors = Array.from(visitorGroups.entries()).sort((a, b) => {
      const secA = a[1].reduce((acc, s) => acc + (s.totalSeconds || 0), 0);
      const secB = b[1].reduce((acc, s) => acc + (s.totalSeconds || 0), 0);
      return secB - secA;
    });

    const primaryVisitorId = sortedVisitors[0] ? sortedVisitors[0][0] : null;

    // Renderizar banner de detección de visitantes
    this.renderVisitorDetector(sortedVisitors);

    // Filtrar sesiones según el filtro seleccionado
    let activeSessions = this.sessions;
    if (this.selectedVisitorFilter !== 'all') {
      activeSessions = this.sessions.filter(s => s.visitorId === this.selectedVisitorFilter);
    }

    if (activeSessions.length === 0) {
      activeSessions = this.sessions;
    }

    const latest = activeSessions[0];
    const totalSessions = activeSessions.length;
    let totalSecs = 0;
    let musicPlays = 0;
    let maxMusicSecs = 0;
    let musicCompleted = false;
    let spotifyClicked = false;
    let photosZoomedSet = new Set();
    let photosDetailsMap = {};
    let totalSwipes = 0;
    let totalTaps = 0;
    let totalReReads = 0;
    let maxPageGlobal = 0;
    let anyCompletedBook = false;

    const pageTimesAcc = {};
    let isCurrentlyLive = false;
    let liveSession = null;

    activeSessions.forEach(s => {
      totalSecs += (s.totalSeconds || 0);
      if (s.musicPlayed) musicPlays += (s.musicPlayCount || 1);
      if (s.musicDurationSec > maxMusicSecs) maxMusicSecs = s.musicDurationSec;
      if (s.musicCompleted) musicCompleted = true;
      if (s.spotifyLinkClicked) spotifyClicked = true;

      totalSwipes += (s.swipeCount || 0);
      totalTaps += (s.tapCount || 0);
      totalReReads += (s.reReadCount || 0);
      if (s.maxPageReached > maxPageGlobal) maxPageGlobal = s.maxPageReached;
      if (s.completedBook) anyCompletedBook = true;

      if (s.photosViewed && Array.isArray(s.photosViewed)) {
        s.photosViewed.forEach(p => photosZoomedSet.add(p));
      }
      if (s.photosDetails) {
        Object.entries(s.photosDetails).forEach(([caption, details]) => {
          if (!photosDetailsMap[caption]) {
            photosDetailsMap[caption] = { timesOpened: 0, totalSeconds: 0 };
          }
          photosDetailsMap[caption].timesOpened += (details.timesOpened || 0);
          photosDetailsMap[caption].totalSeconds += (details.totalSeconds || 0);
        });
      }

      if (s.pageTimes) {
        Object.entries(s.pageTimes).forEach(([num, pData]) => {
          if (!pageTimesAcc[num]) {
            pageTimesAcc[num] = {
              title: pData.title || `Página ${num}`,
              seconds: 0,
              visits: 0,
              reReads: 0
            };
          }
          pageTimesAcc[num].seconds += (pData.seconds || 0);
          pageTimesAcc[num].visits += (pData.visits || 1);
          pageTimesAcc[num].reReads += (pData.reReads || 0);
        });
      }

      const lastActiveMs = new Date(s.lastActiveAt || 0).getTime();
      if (Date.now() - lastActiveMs < 75000 && s.isLive !== false) {
        isCurrentlyLive = true;
        liveSession = s;
      }
    });

    // 1. Apple Dynamic Island / Live Activity Capsule
    if (this.liveActivityBar) {
      this.liveActivityBar.classList.toggle('active-live', isCurrentlyLive);
      if (isCurrentlyLive && liveSession) {
        const isLau = liveSession.visitorId === primaryVisitorId;
        this.liveHeadline.textContent = isLau ? `Lau está leyendo en vivo ahora mismo` : `Visitante leyendo en vivo`;
        this.liveSubtext.textContent = `En ${liveSession.activePageTitle || 'el libro'} • ${liveSession.device || 'Móvil'}`;
        this.liveTimePill.textContent = `Lectura activa (${this.formatDuration(liveSession.totalSeconds)})`;
      } else {
        const lastSeen = this.formatRelativeTime(latest.lastActiveAt || latest.startedAt);
        this.liveHeadline.textContent = `Última lectura: ${lastSeen}`;
        this.liveSubtext.textContent = `${latest.device || 'Móvil'} (${latest.browser || 'Safari'}) • ${latest.location?.city || 'Colombia'}`;
        this.liveTimePill.textContent = 'Inactiva';
      }
    }

    // 2. Tab 1: Hero Engagement Ring & KPIs
    const engagementScore = latest.engagementScore || Math.min(100, Math.round((totalSecs / 120) * 40 + (maxPageGlobal * 5)));
    if (this.valEngagementScore) this.valEngagementScore.textContent = `${engagementScore}%`;
    if (this.engagementRingFill) {
      const offset = 314 - (314 * (engagementScore / 100));
      this.engagementRingFill.style.strokeDashoffset = `${offset}`;
    }
    if (this.valReadingPace) this.valReadingPace.textContent = latest.readingPace || 'Lectura atenta';
    if (this.valPaceTag) this.valPaceTag.textContent = latest.readingPace ? latest.readingPace.split(' ')[0] : 'Atenta';
    
    const completionPct = anyCompletedBook ? 100 : Math.round((maxPageGlobal / Math.max(1, bookPages.length + 1)) * 100);
    if (this.valCompletionPct) this.valCompletionPct.textContent = `${completionPct}%`;
    if (this.valReReadsTotal) this.valReReadsTotal.textContent = `${totalReReads} ${totalReReads === 1 ? 'vez' : 'veces'}`;

    // 3. Capítulo Favorito Hero Card
    let favPageNum = null;
    let maxPageSecs = 0;
    Object.entries(pageTimesAcc).forEach(([num, data]) => {
      if (data.seconds > maxPageSecs) {
        maxPageSecs = data.seconds;
        favPageNum = num;
      }
    });

    if (favPageNum !== null && maxPageSecs > 0) {
      const favData = pageTimesAcc[favPageNum];
      if (this.favChapterTitle) this.favChapterTitle.textContent = favData.title;
      const pctOfTotal = totalSecs > 0 ? Math.round((favData.seconds / totalSecs) * 100) : 0;
      if (this.favChapterDesc) {
        this.favChapterDesc.textContent = `Se ha detenido aquí ${this.formatDuration(favData.seconds)}, concentrando el ${pctOfTotal}% de toda la atención de lectura.`;
      }
      if (this.favChapterTime) this.favChapterTime.textContent = this.formatDuration(favData.seconds);
      if (this.favChapterPct) this.favChapterPct.textContent = `${pctOfTotal}%`;
    }

    // 4. Bento Grid
    if (this.valTotalVisits) this.valTotalVisits.textContent = `${totalSessions}`;
    if (this.descVisitsCount) this.descVisitsCount.textContent = totalSessions === 1 ? '1 lectura registrada' : `${totalSessions} visitas registradas`;

    if (this.valTotalReadingTime) this.valTotalReadingTime.textContent = this.formatDuration(totalSecs);
    const avgSecs = Math.round(totalSecs / Math.max(1, totalSessions));
    if (this.descAvgReadingTime) this.descAvgReadingTime.textContent = `Promedio: ${this.formatDuration(avgSecs)} por visita`;

    if (this.valLastSeenDate) this.valLastSeenDate.textContent = this.formatRelativeTime(latest.lastActiveAt || latest.startedAt);
    if (this.descLastDevice) this.descLastDevice.textContent = `${latest.device || 'Móvil'} • ${latest.location?.city || 'Colombia'}`;

    if (this.valMusicPlayed) {
      this.valMusicPlayed.textContent = musicPlays > 0 ? `${musicPlays} veces` : 'No';
    }
    if (this.descMusicDuration) {
      this.descMusicDuration.textContent = musicPlays > 0 ? `Escuchó ${this.formatDuration(maxMusicSecs)}` : 'invisible string';
    }

    if (this.valPhotosZoomed) this.valPhotosZoomed.textContent = `${photosZoomedSet.size}`;
    if (this.descPhotosZoomed) this.descPhotosZoomed.textContent = `${photosZoomedSet.size} fotos abiertas en pantalla completa`;

    const totalGestures = totalSwipes + totalTaps;
    if (this.valGesturesCount) this.valGesturesCount.textContent = `${totalGestures}`;
    if (this.descGesturesDetail) this.descGesturesDetail.textContent = `${totalSwipes} deslizamientos • ${totalTaps} toques`;

    // 5. Renderizar Tab 2: Capítulos & Heatmap
    this.renderChaptersHeatmap(pageTimesAcc, maxPageSecs, totalSecs);

    // 6. Renderizar Tab 3: Multimedia & Fotos
    this.renderMultimediaTab(musicPlays, maxMusicSecs, musicCompleted, spotifyClicked, photosDetailsMap);

    // 7. Renderizar Tab 4: Dispositivo & Entorno
    this.renderDeviceTab(latest);

    // 8. Renderizar Tab 5: Historial Cronológico
    this.renderSessionsTimeline(activeSessions, primaryVisitorId);
  }

  renderChaptersHeatmap(pageTimesAcc, maxPageSecs, totalSecs) {
    if (!this.chaptersBarsContainer) return;

    const totalPages = bookPages.length + 2;
    const items = [];

    for (let i = 0; i < totalPages; i++) {
      const data = pageTimesAcc[i] || {
        title: this.getDefaultPageTitle(i),
        seconds: 0,
        visits: 0,
        reReads: 0
      };

      const pctRelative = maxPageSecs > 0 ? Math.max(3, Math.round((data.seconds / maxPageSecs) * 100)) : 0;
      const pctOfBook = totalSecs > 0 ? Math.round((data.seconds / totalSecs) * 100) : 0;
      const isFav = data.seconds === maxPageSecs && maxPageSecs > 0;

      let badges = [];
      if (isFav) badges.push(`<span class="badge-tag-pill star">⭐ Favorito</span>`);
      if (data.reReads > 0) badges.push(`<span class="badge-tag-pill reread">🔄 Releído ${data.reReads}x</span>`);
      if (i === 3) badges.push(`<span class="badge-tag-pill photo">📸 Foto Polaroid</span>`);
      if (i === 8) badges.push(`<span class="badge-tag-pill star">🎵 Canción</span>`);

      items.push(`
        <div class="chapter-bar-item">
          <div class="chapter-meta-top">
            <div class="chapter-title-group">
              <span class="chapter-title-text">${data.title}</span>
              ${badges.join(' ')}
            </div>
            <span class="chapter-time-badge">${this.formatDuration(data.seconds)}</span>
          </div>

          <div class="chapter-progress-track">
            <div class="chapter-progress-fill ${isFav ? 'highlight' : ''}" style="width: ${pctRelative}%"></div>
          </div>

          <div class="chapter-stats-bottom">
            <span>${pctOfBook}% de toda la lectura</span>
            <span>Abierto ${data.visits} ${data.visits === 1 ? 'vez' : 'veces'}</span>
          </div>
        </div>
      `);
    }

    this.chaptersBarsContainer.innerHTML = items.join('');
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

  renderMultimediaTab(musicPlays, maxMusicSecs, musicCompleted, spotifyClicked, photosDetailsMap) {
    if (this.musicStatusPill) {
      if (musicPlays > 0) {
        this.musicStatusPill.textContent = 'Reproducida en el libro';
        this.musicStatusPill.style.background = 'rgba(48, 209, 88, 0.18)';
        this.musicStatusPill.style.border = '1px solid rgba(48, 209, 88, 0.35)';
        this.musicStatusPill.style.color = '#a7f3d0';
        this.musicStatusPill.style.boxShadow = 'none';
      } else {
        this.musicStatusPill.textContent = 'No reproducida aún';
        this.musicStatusPill.style.background = 'rgba(255, 255, 255, 0.08)';
        this.musicStatusPill.style.border = '1px solid rgba(255, 255, 255, 0.12)';
        this.musicStatusPill.style.color = 'var(--text-secondary)';
        this.musicStatusPill.style.boxShadow = 'none';
      }
    }

    if (this.musicStatPlays) this.musicStatPlays.textContent = `${musicPlays} veces`;
    if (this.musicStatDuration) this.musicStatDuration.textContent = this.formatDuration(maxMusicSecs);
    if (this.musicStatCompleted) this.musicStatCompleted.textContent = musicCompleted ? 'Sí (100%)' : (musicPlays > 0 ? 'Parcial' : 'No');
    if (this.musicStatSpotify) this.musicStatSpotify.textContent = spotifyClicked ? 'Sí (Abrió Spotify)' : 'No';

    if (this.photosInspectContainer) {
      const photosEntries = Object.entries(photosDetailsMap);
      if (photosEntries.length === 0) {
        this.photosInspectContainer.innerHTML = `
          <div style="text-align: center; padding: 18px; color: var(--text-tertiary); font-size: 0.84rem;">
            Aún no ha abierto fotos Polaroid en pantalla completa.
          </div>
        `;
      } else {
        this.photosInspectContainer.innerHTML = photosEntries.map(([caption, d]) => `
          <div class="photo-inspect-item">
            <span class="photo-item-name">📷 ${caption}</span>
            <span class="photo-item-metrics">Mirada ${d.timesOpened}x (${this.formatDuration(d.totalSeconds)})</span>
          </div>
        `).join('');
      }
    }
  }

  renderDeviceTab(latest) {
    if (!this.deviceSpecsContainer) return;

    const specs = [
      { label: 'Dispositivo & Modelo', val: `${latest.device || 'Móvil'} (${latest.deviceModel || 'General'})` },
      { label: 'Sistema Operativo', val: latest.os || 'iOS / Android' },
      { label: 'Navegador Web', val: latest.browser || 'Safari / Chrome' },
      { label: 'Resolución de Pantalla', val: `${latest.screen || '390x844'} (${latest.retina || 'Retina'})` },
      { label: 'Orientación', val: latest.orientation || 'Vertical' },
      { label: 'Apariencia del Sistema', val: latest.colorScheme || 'Modo Oscuro' },
      { label: 'Batería del Teléfono', val: latest.battery || 'No reportada' },
      { label: 'Conexión a Red', val: latest.connectionType || 'WiFi / 4G' },
      { label: 'Ubicación Aproximada', val: `${latest.location?.city || 'Bogotá'}, ${latest.location?.country || 'Colombia'}` },
      { label: 'Zona Horaria e Idioma', val: `${latest.timezone || 'America/Bogota'} (${latest.language || 'es'})` }
    ];

    this.deviceSpecsContainer.innerHTML = specs.map(s => `
      <div class="spec-box">
        <span class="spec-label">${s.label}</span>
        <span class="spec-value">${s.val}</span>
      </div>
    `).join('');
  }

  renderSessionsTimeline(sessionsList, primaryVisitorId) {
    if (!this.sessionsTimelineContainer) return;

    this.sessionsTimelineContainer.innerHTML = sessionsList.map((s, idx) => {
      const num = sessionsList.length - idx;
      const isLau = !primaryVisitorId || s.visitorId === primaryVisitorId;
      const dateFormatted = new Date(s.startedAt || s.lastActiveAt).toLocaleString('es-CO', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      let pathHtml = '';
      if (s.pageTransitions && s.pageTransitions.length > 0) {
        pathHtml = s.pageTransitions.map((t, i) => `
          <span class="path-step-pill">${t.toTitle} (${t.time})</span>
          ${i < s.pageTransitions.length - 1 ? '<span class="path-arrow">➔</span>' : ''}
        `).join(' ');
      } else {
        pathHtml = `<span style="font-size: 0.74rem; color: var(--text-tertiary);">Leyó hasta ${s.activePageTitle || 'Página ' + (s.maxPageReached || 0)}</span>`;
      }

      return `
        <div class="timeline-session-card">
          <div class="timeline-card-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="timeline-badge" style="${isLau ? 'background: rgba(10, 132, 255, 0.18); border-color: rgba(10, 132, 255, 0.35); color: var(--apple-cyan);' : 'background: rgba(255, 159, 10, 0.16); border-color: rgba(255, 159, 10, 0.35); color: #fed7aa;'}">
                ${isLau ? '👩 Lau' : '👤 Otro Visitante'}
              </span>
              <span class="timeline-badge" style="background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); color: #fff;">
                Visita #${s.visitNumber || num}
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="timeline-date">${dateFormatted} (${this.formatRelativeTime(s.lastActiveAt)})</span>
              <button class="delete-session-btn" data-del-id="${s.sessionId}" title="Eliminar si fue una prueba de tu parte">
                🗑️ Descartar
              </button>
            </div>
          </div>

          <div class="timeline-details-row">
            <div class="tl-item">
              <span class="tl-item-lbl">Dispositivo</span>
              <span class="tl-item-val">${s.device || 'Móvil'} (${s.browser || 'Web'})</span>
            </div>
            <div class="tl-item">
              <span class="tl-item-lbl">Tiempo de Lectura</span>
              <span class="tl-item-val" style="color: var(--apple-gold); font-weight: 700;">${this.formatDuration(s.totalSeconds)}</span>
            </div>
            <div class="tl-item">
              <span class="tl-item-lbl">Página Máxima</span>
              <span class="tl-item-val">${s.completedBook ? 'Libro Completo (100%)' : `Hasta Pág. ${s.maxPageReached || 0}`}</span>
            </div>
            <div class="tl-item">
              <span class="tl-item-lbl">Música Taylor</span>
              <span class="tl-item-val">${s.musicPlayed ? `Escuchó ${this.formatDuration(s.musicDurationSec)}` : 'No'}</span>
            </div>
          </div>

          <div style="margin-top: 6px;">
            <span style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-tertiary); font-weight: 600;">
              Ruta de Lectura & Páginas Visitadas:
            </span>
            <div class="session-path-list">
              ${pathHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Listener para botones de descartar sesión individual
    this.sessionsTimelineContainer.querySelectorAll('.delete-session-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-del-id');
        if (id) this.deleteSession(id);
      });
    });
  }

  renderEmptyState() {
    if (this.visitorDetectorBox) this.visitorDetectorBox.style.display = 'none';
    if (this.valTotalVisits) this.valTotalVisits.textContent = '0';
    if (this.valTotalReadingTime) this.valTotalReadingTime.textContent = '0s';
    if (this.valLastSeenDate) this.valLastSeenDate.textContent = 'Sin lecturas';
    if (this.favChapterTitle) this.favChapterTitle.textContent = 'Esperando primera lectura';
    if (this.favChapterDesc) this.favChapterDesc.textContent = 'En cuanto Lau abra el libro, sus tiempos y páginas favoritas aparecerán aquí en vivo.';

    if (this.chaptersBarsContainer) {
      this.chaptersBarsContainer.innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--text-secondary); font-size: 0.88rem;">
          Aún no hay lecturas registradas en la base de datos.<br>
          <span style="font-size: 0.76rem; color: var(--text-tertiary);">
            Abre el libro en tu celular o compártelo a Lau para ver la telemetría en tiempo real.
          </span>
        </div>
      `;
    }

    if (this.sessionsTimelineContainer) {
      this.sessionsTimelineContainer.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-tertiary); font-size: 0.82rem;">
          Las sesiones se ordenarán cronológicamente aquí con su ruta de navegación.
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
      this.settingsNotice.style.color = 'var(--apple-green)';
      this.settingsNotice.textContent = '¡Ajustes guardados correctamente!';
    }

    setTimeout(() => {
      this.closeSettings();
      this.fetchData();
    }, 600);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AppleStatsDashboard();
});
