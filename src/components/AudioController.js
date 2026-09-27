/**
 * AudioController.js
 * Reproducción de audio y controles de la canción completa "invisible string".
 * Motor de efectos de sonido orgánicos de paso de página (Foley real con Web Audio API).
 */

import { asset } from '../chapters/chaptersData.js';

export class AudioController {
  constructor(songConfig) {
    this.songConfig = songConfig;
    this.soundEffectsEnabled = true;
    this.musicEnabled = true;
    this.hasTriggeredSong = false;
    this.fadeInterval = null;

    // Canción completa
    this.bgMusic = new Audio(this.songConfig.audioSrc);
    this.bgMusic.volume = 0;
    this.bgMusic.preload = 'auto';

    // Callbacks
    this.onStateChangeCallbacks = [];
    this.onTimeUpdateCallbacks = [];

    this.bgMusic.addEventListener('play', () => this.notifyState());
    this.bgMusic.addEventListener('pause', () => this.notifyState());
    this.bgMusic.addEventListener('timeupdate', () => this.notifyTime());
    this.bgMusic.addEventListener('loadedmetadata', () => this.notifyTime());

    // Web Audio API para efectos de sonido realistas y sedosos de papel
    this.audioCtx = null;
    this.pageFlipBuffers = [];
    this.fallbackAudio = new Audio(asset('audio/page_flip_soft.m4a'));
    this.fallbackAudio.volume = 0.3;

    this.initAudioContext();
    this.loadRealPageSounds([
      asset('audio/page_flip_soft.m4a'),
      asset('audio/page_flip_real2.m4a')
    ]);
  }

  initAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const setupCtx = () => {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    };

    window.addEventListener('click', setupCtx, { once: true });
    window.addEventListener('touchstart', setupCtx, { once: true });
  }

  async loadRealPageSounds(urls) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      for (const url of urls) {
        const resp = await fetch(url);
        const arrayBuf = await resp.arrayBuffer();
        const decoded = await this.audioCtx.decodeAudioData(arrayBuf);
        const cleanSlice = this.extractCleanPaperSound(decoded, 0.7);
        if (cleanSlice) {
          this.pageFlipBuffers.push(cleanSlice);
        }
      }
    } catch (e) {
      console.warn("Could not preload Foley buffers, using fallback:", e);
    }
  }

  extractCleanPaperSound(buffer, maxDuration = 0.65) {
    if (!this.audioCtx) return buffer;
    const rawData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;

    // Detectar dónde inicia el roce natural del papel
    let startIndex = 0;
    for (let i = 0; i < rawData.length; i++) {
      if (Math.abs(rawData[i]) > 0.035) {
        startIndex = Math.max(0, i - Math.floor(sampleRate * 0.04));
        break;
      }
    }

    const sliceSamples = Math.min(Math.floor(sampleRate * maxDuration), rawData.length - startIndex);
    if (sliceSamples <= 0) return buffer;

    const newBuffer = this.audioCtx.createBuffer(buffer.numberOfChannels, sliceSamples, sampleRate);

    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const src = buffer.getChannelData(ch);
      const dst = newBuffer.getChannelData(ch);
      for (let i = 0; i < sliceSamples; i++) {
        let val = src[startIndex + i] || 0;
        // Suave ataque al inicio (35ms)
        if (i < sampleRate * 0.035) {
          val *= (i / (sampleRate * 0.035));
        }
        // Suave decaimiento al final (100ms)
        const tailStart = sliceSamples - sampleRate * 0.1;
        if (i > tailStart) {
          val *= ((sliceSamples - i) / (sampleRate * 0.1));
        }
        dst[i] = val;
      }
    }
    return newBuffer;
  }

  playFlipSound() {
    if (!this.soundEffectsEnabled) return;

    try {
      if (this.audioCtx && this.pageFlipBuffers.length > 0) {
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }

        // Seleccionar aleatoriamente una variación de sonido
        const buf = this.pageFlipBuffers[Math.floor(Math.random() * this.pageFlipBuffers.length)];
        const source = this.audioCtx.createBufferSource();
        source.buffer = buf;

        // Variación sutil de velocidad y tono para naturalidad orgánica (como papel real)
        source.playbackRate.value = 0.96 + Math.random() * 0.08;

        // Filtro cálido para remover asperezas y agudos estridentes
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 3200;

        // Ganancia suave, discreta y reconfortante
        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = 0.32;

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        source.start(0);
        return;
      }

      // Respaldo estándar HTMLAudioElement
      this.fallbackAudio.currentTime = 0;
      this.fallbackAudio.play().catch(() => {});
    } catch (e) {
      // Ignorar restricciones si el usuario aún no interactuó
    }
  }

  toggleSoundEffects() {
    this.soundEffectsEnabled = !this.soundEffectsEnabled;
    this.notifyState();
    return this.soundEffectsEnabled;
  }

  onStateChange(cb) {
    this.onStateChangeCallbacks.push(cb);
  }

  onTimeUpdate(cb) {
    this.onTimeUpdateCallbacks.push(cb);
  }

  notifyState() {
    const isPlaying = !this.bgMusic.paused;
    this.onStateChangeCallbacks.forEach(cb => cb({
      isPlaying,
      volume: this.bgMusic.volume,
      soundEffectsEnabled: this.soundEffectsEnabled
    }));
  }

  notifyTime() {
    const current = this.bgMusic.currentTime || 0;
    const duration = this.bgMusic.duration || 252; // 4:12 por defecto
    const percent = duration > 0 ? (current / duration) * 100 : 0;
    this.onTimeUpdateCallbacks.forEach(cb => cb({
      current,
      duration,
      percent,
      formattedCurrent: this.formatTime(current),
      formattedDuration: this.formatTime(duration)
    }));
  }

  formatTime(secs) {
    if (isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  triggerSongFadeIn(targetVolume = 0.75, durationMs = 2000) {
    if (!this.musicEnabled) return;
    if (this.fadeInterval) clearInterval(this.fadeInterval);

    try {
      if (this.bgMusic.paused) {
        this.bgMusic.volume = 0;
        this.bgMusic.play().catch((err) => {
          console.log("Audio autoplay prevented by browser:", err);
        });
      }

      const steps = 20;
      const stepTime = durationMs / steps;
      const volumeStep = targetVolume / steps;

      this.fadeInterval = setInterval(() => {
        if (this.bgMusic.volume + volumeStep < targetVolume) {
          this.bgMusic.volume += volumeStep;
        } else {
          this.bgMusic.volume = targetVolume;
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
        }
        this.notifyState();
      }, stepTime);

      this.hasTriggeredSong = true;
    } catch (e) {
      console.warn("Audio trigger error:", e);
    }
  }

  toggleMusic() {
    if (this.bgMusic.paused) {
      if (this.bgMusic.volume < 0.2) this.bgMusic.volume = 0.75;
      this.bgMusic.play().catch(() => {});
    } else {
      this.bgMusic.pause();
    }
    this.notifyState();
  }

  seek(percent) {
    if (this.bgMusic.duration) {
      this.bgMusic.currentTime = (percent / 100) * this.bgMusic.duration;
      this.notifyTime();
    }
  }

  openSpotify() {
    window.open(this.songConfig.spotifyUrl, '_blank', 'noopener,noreferrer');
  }
}
