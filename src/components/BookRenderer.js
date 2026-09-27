/**
 * BookRenderer.js
 * Genera el HTML editorial y artístico con las ilustraciones en acuarela.
 * Cada página integra la ilustración correspondiente al tema tratado.
 */

import { bookMetadata, chapters, bookPages, asset } from '../chapters/chaptersData.js';

export class BookRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = '';

    // Portada en Acuarela
    this.container.appendChild(this.createFrontCover());

    // Páginas interiores
    bookPages.forEach((pageData) => {
      const pageEl = this.createPageElement(pageData);
      this.container.appendChild(pageEl);
    });

    // Contratapa en Acuarela
    this.container.appendChild(this.createBackCover());
  }

  createFrontCover() {
    const div = document.createElement('div');
    div.className = 'page page-cover page-cover-front';
    div.setAttribute('data-density', 'hard');
    div.innerHTML = `
      <!-- Cubierta completa de encuadernación en cuero antiguo coreano con lomo y filigrana -->
      <div class="cover-antique-bg"></div>
      
      <!-- Contenido en el medallón central de oro -->
      <div class="cover-medallion-content">
        <div class="cover-gold-badge">
          <h1 class="cover-gold-title">${bookMetadata.title}</h1>
          <div class="cover-gold-divider"></div>
          <p class="cover-gold-subtitle">${bookMetadata.subtitle}</p>
        </div>
        
        <button class="btn-open-book" id="btn-start-book">
          <span>Abrir el libro</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    `;
    return div;
  }

  createBackCover() {
    const div = document.createElement('div');
    div.className = 'page page-cover page-cover-back';
    div.setAttribute('data-density', 'hard');
    div.innerHTML = `
      <!-- Contratapa en cuero antiguo coreano con lomo y filigrana -->
      <div class="cover-antique-bg back"></div>
      
      <div class="cover-medallion-content back">
        <div class="cover-gold-badge">
          <div class="cover-gold-title" style="font-size: 1.85rem;">Para Lau</div>
          <div class="cover-gold-divider"></div>
          <div class="cover-gold-subtitle">27 de Septiembre</div>
        </div>
      </div>
    `;
    return div;
  }

  createPageElement(data) {
    const page = document.createElement('div');
    page.className = 'page';
    page.setAttribute('data-page-num', data.pageNumber);
    if (data.hasMusicTrigger) {
      page.setAttribute('data-music-trigger', 'true');
    }

    let innerContent = '';

    switch (data.type) {
      case 'table_of_contents':
        innerContent = this.renderTableOfContents(data);
        break;
      case 'chapter_header':
        innerContent = this.renderChapterHeader(data);
        break;
      case 'letter_text_with_art':
        innerContent = this.renderLetterTextWithArt(data);
        break;
      case 'photo_polaroid':
        innerContent = this.renderPhotoPolaroid(data);
        break;
      case 'scrapbook_double':
        innerContent = this.renderScrapbookDouble(data);
        break;
      case 'musical_highlight':
        innerContent = this.renderMusicalHighlight(data);
        break;
      case 'letter_closing':
        innerContent = this.renderLetterClosing(data);
        break;
      case 'epilogue_upcoming':
        innerContent = this.renderEpilogueUpcoming(data);
        break;
      default:
        innerContent = `<div class="page-content-wrapper"><p>${data.content || ''}</p></div>`;
    }

    page.innerHTML = innerContent;
    return page;
  }

  renderTableOfContents(data) {
    const chaptersList = chapters.map(c => `
      <div class="chapter-item-btn" data-target-page="${c.targetPage}" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; margin-bottom: 12px; background: rgba(255,255,255,0.9); border: 1px solid rgba(197, 155, 63, 0.3); border-radius: 8px; cursor: pointer; box-shadow: 0 2px 8px rgba(70,50,30,0.04);">
        <div>
          <div style="font-family: var(--font-serif); font-weight: 600; font-size: 1.15rem; color: #3b2832;">
            ${c.numberRoman}: ${c.title}
          </div>
          <div style="font-family: var(--font-sans); font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
            ${c.description}
          </div>
        </div>
        <div style="font-family: var(--font-serif); font-size: 1rem; color: var(--gold-warm); font-weight: 600; margin-left: 10px;">
          ${c.isUpcoming ? 'Pronto' : `Pág. ${c.targetPage}`}
        </div>
      </div>
    `).join('');

    return `
      <div class="page-content-wrapper">
        <div class="page-header-minimal">
          <span class="page-header-title">Índice</span>
        </div>
        <div style="margin: auto 0;">
          <h2 class="letter-title" style="text-align: center; margin-bottom: 20px;">Capítulos</h2>
          <div class="toc-container">
            ${chaptersList}
          </div>
          <img class="watercolor-spot-art" src="${asset('images/watercolor/cover_wreath.jpg')}" alt="Detalle acuarela" style="max-width: 110px; margin-top: 15px;" />
        </div>
        <div class="page-footer-num">
          <span class="page-num-text">Pág. ${data.pageNumber}</span>
        </div>
      </div>
    `;
  }

  renderChapterHeader(data) {
    return `
      <div class="page-content-wrapper" style="text-align: center; justify-content: space-between;">
        <div class="page-header-minimal">
          <span class="page-header-title">${data.roman}</span>
        </div>
        <div style="margin: auto 0;">
          <img class="watercolor-spot-art" src="${data.watercolorDecor}" alt="Acuarela capitular" style="max-width: 160px; margin-bottom: 16px;" />
          <div style="font-family: var(--font-serif); font-size: 1.3rem; color: var(--gold-warm); margin-bottom: 10px; letter-spacing: 2px;">
            ${data.roman}
          </div>
          <h1 style="font-family: var(--font-serif); font-size: 2.5rem; color: #3b2832; margin-bottom: 16px;">
            ${data.title}
          </h1>
          <div style="width: 50px; height: 1px; background: var(--gold-warm); margin: 0 auto;"></div>
        </div>
        <div class="page-footer-num">
          <span class="page-num-text">Pág. ${data.pageNumber}</span>
        </div>
      </div>
    `;
  }

  renderLetterTextWithArt(data) {
    const paragraphsHtml = data.paragraphs.map(p => `
      <p class="letter-paragraph">${p}</p>
    `).join('');

    return `
      <div class="page-content-wrapper">
        <div class="page-header-minimal">
          <span class="page-header-title">27 de Septiembre</span>
        </div>
        <div>
          ${data.header ? `<h2 class="letter-title">${data.header}</h2>` : ''}
          ${paragraphsHtml}
          ${data.artImage ? `
            <img class="watercolor-spot-art" src="${data.artImage}" alt="Ilustración acuarela temática" />
          ` : ''}
        </div>
        <div class="page-footer-num">
          <span class="page-num-text">Pág. ${data.pageNumber}</span>
        </div>
      </div>
    `;
  }

  renderPhotoPolaroid(data) {
    const paragraphsHtml = data.paragraphs.map(p => `
      <p class="letter-paragraph">${p}</p>
    `).join('');

    return `
      <div class="page-content-wrapper">
        <div class="page-header-minimal">
          <span class="page-header-title">27 de Septiembre</span>
        </div>
        <div>
          <div class="clean-photo-frame" data-full-img="${data.photo.src}" data-caption="${data.photo.caption}">
            <img class="clean-photo-img" src="${data.photo.src}" alt="${data.photo.alt}" loading="lazy" />
            <div class="clean-photo-caption">${data.photo.caption}</div>
          </div>
          <div style="margin-top: 14px;">
            ${paragraphsHtml}
          </div>
        </div>
        <div class="page-footer-num">
          <span class="page-num-text">Pág. ${data.pageNumber}</span>
        </div>
      </div>
    `;
  }

  renderScrapbookDouble(data) {
    const paragraphsHtml = data.paragraphs.map(p => `
      <p class="letter-paragraph">${p}</p>
    `).join('');

    return `
      <div class="page-content-wrapper">
        <div class="page-header-minimal">
          <span class="page-header-title">27 de Septiembre</span>
        </div>
        <div>
          <div style="display: flex; gap: 12px; margin-bottom: 12px;">
            <div class="clean-photo-frame" style="flex: 1; padding: 6px 6px 14px;" data-full-img="${data.photo1.src}" data-caption="${data.photo1.caption}">
              <img class="clean-photo-img" src="${data.photo1.src}" style="height: 120px;" alt="Postres" />
              <div class="clean-photo-caption" style="font-size: 0.85rem;">${data.photo1.caption}</div>
            </div>
            <div class="clean-photo-frame" style="flex: 1; padding: 6px 6px 14px;" data-full-img="${data.photo2.src}" data-caption="${data.photo2.caption}">
              <img class="clean-photo-img" src="${data.photo2.src}" style="height: 120px;" alt="Celebración" />
              <div class="clean-photo-caption" style="font-size: 0.85rem;">${data.photo2.caption}</div>
            </div>
          </div>
          <div>
            ${paragraphsHtml}
          </div>
          ${data.artImage ? `
            <img class="watercolor-spot-art" src="${data.artImage}" alt="Postres acuarela" style="max-height: 100px; margin: 8px auto 0;" />
          ` : ''}
        </div>
        <div class="page-footer-num">
          <span class="page-num-text">Pág. ${data.pageNumber}</span>
        </div>
      </div>
    `;
  }

  renderMusicalHighlight(data) {
    const song = bookMetadata.songDetails;
    return `
      <div class="page-content-wrapper">
        <div class="page-header-minimal">
          <span class="page-header-title">invisible string</span>
        </div>
        <div>
          ${data.paragraphs.map(p => `<p class="letter-paragraph">${p}</p>`).join('')}

          <!-- Ilustración en Acuarela del Hilo Dorado y Notas Musicales -->
          <img class="watercolor-spot-art wide" src="${data.artImage}" alt="Hilo dorado en acuarela" style="margin: 8px auto 12px;" />

          <!-- Reproductor de la canción completa -->
          <div class="music-card-watercolor">
            <div class="music-player-row">
              <img class="album-cover-thumb" src="${song.coverImg}" alt="${song.title}" />
              <div class="song-info">
                <div class="song-title">invisible string</div>
                <div class="song-artist">Taylor Swift · <em>folklore</em></div>
              </div>
            </div>

            <!-- Controles y barra de progreso -->
            <div class="player-controls-line">
              <button class="btn-play-pause-track" id="btn-track-play" title="Reproducir / Pausar">
                ▶
              </button>
              <div class="progress-container">
                <div class="progress-bar-bg" id="track-progress-bar">
                  <div class="progress-bar-fill" id="track-progress-fill"></div>
                </div>
                <span class="time-display" id="track-time-display">0:00 / 4:12</span>
              </div>
            </div>

            <!-- Botón oficial Spotify -->
            <div style="text-align: right; margin-top: 6px;">
              <button class="spotify-btn-action" id="btn-open-spotify-direct">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.498 17.306c-.218.358-.684.472-1.042.254-2.857-1.746-6.455-2.141-10.693-1.173-.408.093-.816-.164-.909-.572-.093-.408.164-.816.572-.909 4.638-1.06 8.625-.615 11.818 1.358.358.218.472.684.254 1.042zm1.468-3.266c-.274.446-.86.589-1.306.315-3.27-2.01-8.254-2.593-12.122-1.417-.5.152-1.028-.133-1.18-.633-.152-.5.133-1.028.633-1.18 4.417-1.34 9.907-.692 13.66 1.61.446.274.589.86.315 1.305zm.126-3.41c-3.921-2.328-10.384-2.543-14.127-1.406-.602.183-1.241-.165-1.424-.767-.183-.602.165-1.241.767-1.424 4.305-1.307 11.439-1.054 15.962 1.63.541.321.716 1.024.395 1.565-.321.541-1.024.716-1.573.402z"/>
                </svg>
                <span>Escuchar en Spotify</span>
              </button>
            </div>
          </div>
        </div>
        <div class="page-footer-num">
          <span class="page-num-text">Pág. ${data.pageNumber}</span>
        </div>
      </div>
    `;
  }

  renderLetterClosing(data) {
    const paragraphsHtml = data.paragraphs.map(p => `
      <p class="letter-paragraph">${p}</p>
    `).join('');

    return `
      <div class="page-content-wrapper">
        <div class="page-header-minimal">
          <span class="page-header-title">27 de Septiembre</span>
        </div>
        <div>
          <div class="clean-photo-frame" style="margin-bottom: 12px;" data-full-img="${data.photo.src}" data-caption="${data.photo.caption}">
            <img class="clean-photo-img" src="${data.photo.src}" style="height: 180px;" alt="Celebración" />
            <div class="clean-photo-caption">${data.photo.caption}</div>
          </div>
          ${paragraphsHtml}
          ${data.artImage ? `
            <img class="watercolor-spot-art" src="${data.artImage}" alt="Ramo de cumpleaños en acuarela" style="max-height: 130px; margin-top: 10px;" />
          ` : ''}
        </div>
        <div class="page-footer-num">
          <span class="page-num-text">Pág. ${data.pageNumber}</span>
        </div>
      </div>
    `;
  }

  renderEpilogueUpcoming(data) {
    return `
      <div class="page-content-wrapper" style="text-align: center; justify-content: space-between;">
        <div class="page-header-minimal">
          <span class="page-header-title">${data.title}</span>
        </div>
        <div style="margin: auto 0; padding: 20px;">
          <img class="watercolor-spot-art" src="${data.artImage}" alt="Corona botánica" style="max-width: 150px; margin-bottom: 16px;" />
          <h2 class="letter-title" style="margin-bottom: 12px;">${data.subtitle}</h2>
          <div style="width: 50px; height: 1px; background: var(--gold-warm); margin: 0 auto 16px;"></div>
          <p class="letter-paragraph" style="text-align: center; color: var(--text-muted);">
            ${data.note}
          </p>
        </div>
        <div class="page-footer-num">
          <span class="page-num-text">Pág. ${data.pageNumber}</span>
        </div>
      </div>
    `;
  }
}
