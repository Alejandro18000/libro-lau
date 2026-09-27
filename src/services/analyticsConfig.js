/**
 * analyticsConfig.js
 * Configuración para la telemetría y el panel privado de estadísticas.
 */

export const analyticsConfig = {
  // PIN de seguridad para acceder al panel privado (stats.html).
  // 2709 = 27 de Septiembre (puedes cambiarlo al PIN de 4 dígitos que prefieras)
  dashboardPin: '2709',

  // Backend remoto activo: Firebase Realtime Database (Proyecto Libro Lau)
  firebaseUrl: 'https://libro-lau-default-rtdb.firebaseio.com',
  googleSheetsUrl: '',

  // Tiempo de inactividad para considerar una visita como nueva sesión (en minutos)
  sessionTimeoutMinutes: 30,

  // Intervalo de sincronización en segundo plano (en milisegundos)
  syncIntervalMs: 15000,

  // Claves de almacenamiento local (fallback y caché)
  storageKeys: {
    visitorId: 'libro_lau_vid',
    visitCount: 'libro_lau_vcount',
    lastActive: 'libro_lau_last_active',
    currentSession: 'libro_lau_active_session',
    sessionsHistory: 'libro_lau_sessions_history',
    remoteConfig: 'libro_lau_remote_config'
  }
};
