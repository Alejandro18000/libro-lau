/**
 * main.js
 * Lógica principal del libro, interacción de páginas y reproducción de audio.
 */

import './styles/book.css';
import { PageFlip } from 'page-flip';
import confetti from 'canvas-confetti';
import { bookMetadata } from './chapters/chaptersData.js';
import { PetalsEffect } from './components/PetalsEffect.js';
import { AudioController } from './components/AudioController.js';
import { BookRenderer } from './components/BookRenderer.js';
import { Lightbox } from './components/Lightbox.js';
import { ChaptersModal } from './components/ChaptersModal.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicializar auxiliares
  const petals = new PetalsEffect('petals-canvas');
  const audioController = new AudioController(bookMetadata.songDetails);
  const lightbox = new Lightbox();

  // 2. Renderizar páginas
  const renderer = new BookRenderer('flipbook');
  renderer.render();

  // 3. Inicializar PageFlip
  const bookEl = document.getElementById('flipbook');
  const pageFlip = new PageFlip(bookEl, {
    width: 490,
    height: 680,
    size: 'stretch',
    minWidth: 320,
    maxWidth: 580,
    minHeight: 460,
    maxHeight: 880,
    maxShadowOpacity: 0.45,
    showCover: true,
    mobileScrollSupport: false,
    usePortrait: true,
    autoSize: true,
    drawShadow: true,
    flippingTime: 800,
    useMouseEvents: true
  });

  pageFlip.loadFromHTML(document.querySelectorAll('#flipbook .page'));

  // 4. Modal de Capítulos
  const chaptersModal = new ChaptersModal((targetPage) => {
    pageFlip.flip(targetPage);
  });

  // 5. Elementos de la interfaz
  const prevBtn = document.getElementById('btn-prev-page');
  const nextBtn = document.getElementById('btn-next-page');
  const pageIndicator = document.getElementById('page-indicator');
  const toggleMusicBtn = document.getElementById('btn-toggle-music');
  const openTocBtn = document.getElementById('btn-open-toc');

  const bookStageEl = document.querySelector('.book-stage');

  const updateNavigation = (currentPage, totalPages) => {
    const isOpen = currentPage > 0 && currentPage < totalPages - 1;
    if (bookStageEl) {
      bookStageEl.classList.toggle('is-open', isOpen);
    }

    if (pageIndicator) {
      if (currentPage === 0) {
        pageIndicator.textContent = "Portada";
      } else if (currentPage >= totalPages - 1) {
        pageIndicator.textContent = "Contratapa";
      } else {
        pageIndicator.textContent = `Página ${currentPage} de ${totalPages - 2}`;
      }
    }

    if (prevBtn) prevBtn.disabled = currentPage === 0;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages - 1;
  };

  const totalPages = pageFlip.getPageCount();
  updateNavigation(0, totalPages);

  // 6. Evento de pasar página
  pageFlip.on('flip', (e) => {
    const pageIndex = e.data;
    audioController.playFlipSound();
    updateNavigation(pageIndex, totalPages);

    // Revisar si la página visible actual es la página de la canción (Pág. 8)
    const activePages = [pageIndex, pageIndex + 1];
    const musicPageNum = 8;

    if (activePages.includes(musicPageNum) && !audioController.hasTriggeredSong) {
      audioController.triggerSongFadeIn(0.75, 2000);
      confetti({
        particleCount: 25,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#d4af37', '#e2c050', '#ffffff']
      });
    }
  });

  // 7. Botón "Abrir el libro" en portada
  const startBtn = document.getElementById('btn-start-book');
  if (startBtn) {
    startBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      pageFlip.flipNext();
      audioController.playFlipSound();
    });
  }

  // 8. Enlaces dentro del índice
  document.querySelectorAll('.toc-container .chapter-item-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = parseInt(btn.getAttribute('data-target-page'), 10);
      if (target) {
        pageFlip.flip(target);
      }
    });
  });

  // 9. Fotos ampliables con Lightbox
  document.querySelectorAll('.clean-photo-frame').forEach(frame => {
    frame.addEventListener('click', (e) => {
      e.stopPropagation();
      const src = frame.getAttribute('data-full-img');
      const caption = frame.getAttribute('data-caption');
      if (src) lightbox.open(src, caption);
    });
  });

  // 10. Botones de pasar página
  if (prevBtn) {
    prevBtn.addEventListener('click', () => pageFlip.flipPrev());
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => pageFlip.flipNext());
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') pageFlip.flipNext();
    if (e.key === 'ArrowLeft') pageFlip.flipPrev();
  });

  // 11. Control de la canción en la barra inferior
  const musicBarIcon = document.getElementById('music-bar-icon');
  if (toggleMusicBtn) {
    toggleMusicBtn.addEventListener('click', () => {
      audioController.toggleMusic();
    });
  }

  // 12. Pantalla Completa
  const fullscreenBtn = document.getElementById('btn-toggle-fullscreen');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn("Fullscreen error:", err);
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    });

    document.addEventListener('fullscreenchange', () => {
      const isFull = !!document.fullscreenElement;
      fullscreenBtn.classList.toggle('active', isFull);
      fullscreenBtn.title = isFull ? "Salir de pantalla completa" : "Pantalla completa";
    });
  }

  // 13. Controles del reproductor de música en la página 8
  const btnTrackPlay = document.getElementById('btn-track-play');
  const trackProgressBar = document.getElementById('track-progress-bar');
  const trackProgressFill = document.getElementById('track-progress-fill');
  const trackTimeDisplay = document.getElementById('track-time-display');
  const btnOpenSpotifyDirect = document.getElementById('btn-open-spotify-direct');

  if (btnTrackPlay) {
    btnTrackPlay.addEventListener('click', (e) => {
      e.stopPropagation();
      audioController.toggleMusic();
    });
  }

  if (btnOpenSpotifyDirect) {
    btnOpenSpotifyDirect.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      audioController.openSpotify();
    });
  }

  if (trackProgressBar) {
    trackProgressBar.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = trackProgressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
      audioController.seek(pct);
    });
  }

  audioController.onStateChange((state) => {
    if (btnTrackPlay) {
      btnTrackPlay.textContent = state.isPlaying ? '⏸' : '▶';
    }
    if (toggleMusicBtn) {
      toggleMusicBtn.classList.toggle('playing', state.isPlaying);
      toggleMusicBtn.title = state.isPlaying ? "Pausar 'invisible string'" : "Reproducir 'invisible string'";
    }
    if (musicBarIcon) {
      musicBarIcon.textContent = state.isPlaying ? '⏸' : '▶';
    }
  });

  audioController.onTimeUpdate(({ percent, formattedCurrent, formattedDuration }) => {
    if (trackProgressFill) {
      trackProgressFill.style.width = `${percent}%`;
    }
    if (trackTimeDisplay) {
      trackTimeDisplay.textContent = `${formattedCurrent} / ${formattedDuration}`;
    }
  });

  // 14. Abrir modal de capítulos
  if (openTocBtn) {
    openTocBtn.addEventListener('click', () => chaptersModal.open());
  }
  if (pageIndicator) {
    pageIndicator.style.cursor = 'pointer';
    pageIndicator.title = 'Abrir índice de capítulos';
    pageIndicator.addEventListener('click', () => chaptersModal.open());
  }
});
