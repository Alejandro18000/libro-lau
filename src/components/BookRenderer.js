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
      <div class="toc-entry chapter-item-btn ${c.isUpcoming ? 'toc-upcoming-entry' : ''}" data-target-page="${c.targetPage}">
        <div class="toc-entry-line">
          <span class="toc-roman">${c.numberRoman}</span>
          <span class="toc-dots-leader"></span>
          <span class="toc-page-num">${c.isUpcoming ? 'Pronto' : `Pág. ${c.targetPage}`}</span>
        </div>
        <div class="toc-chapter-title">${c.title}</div>
        <div class="toc-chapter-summary">${c.description}</div>
      </div>
    `).join(`
      <div class="toc-entry-separator">
        <span class="toc-sep-line"></span>
        <span class="toc-sep-mark">✦</span>
        <span class="toc-sep-line"></span>
      </div>
    `);

    return `
      <div class="page-content-wrapper page-toc-wrapper">
        <div class="page-header-minimal">
          <span class="page-header-title">Índice</span>
        </div>
        <div class="toc-content-flow">
          <div class="toc-title-area">
            <div class="toc-fleuron-ornament">
              <svg width="46" height="14" viewBox="0 0 54 14" fill="none">
                <path d="M2 7h18M34 7h18" stroke="#c59b3f" stroke-width="1" stroke-linecap="round" opacity="0.6"/>
                <circle cx="27" cy="7" r="3" fill="#c59b3f"/>
                <circle cx="18" cy="7" r="1.5" fill="#c59b3f" opacity="0.7"/>
                <circle cx="36" cy="7" r="1.5" fill="#c59b3f" opacity="0.7"/>
              </svg>
            </div>
            <h2 class="letter-title toc-main-heading">Contenido</h2>
            <div class="toc-subheading">Memorias & Palabras para Lau</div>
          </div>

          <div class="toc-editorial-list toc-container">
            ${chaptersList}
          </div>

          <div class="toc-dedication-vignette">
            <div class="toc-thread-motif">
              <svg width="36" height="16" viewBox="0 0 44 18" fill="none">
                <path d="M2 9 C 14 1, 30 17, 42 9" stroke="#c59b3f" stroke-width="1.3" stroke-linecap="round" fill="none"/>
                <circle cx="22" cy="9" r="2.2" fill="#c59b3f"/>
              </svg>
            </div>
            <p class="toc-vignette-quote">
              «Hay historias que merecen guardarse en páginas,<br>
              y personas que merecen un libro entero.»
            </p>
            <span class="toc-vignette-signature">— Para Lau</span>
          </div>
        </div>

        <div class="page-footer-num">
          <span class="page-num-text">Pág. ${data.pageNumber}</span>
        </div>
      </div>
    `;
  }

  renderChapterHeader(data) {
    return `
      <div class="page-content-wrapper page-chapter-intro">
        <div class="page-header-minimal">
          <span class="page-header-title">${data.roman}</span>
        </div>
        <div class="page-center-block">
          <img class="watercolor-spot-art chapter-intro-art" src="${data.watercolorDecor}" alt="Acuarela capitular" />
          <div class="chapter-intro-roman">
            ${data.roman}
          </div>
          <h1 class="chapter-intro-title">
            ${data.title}
          </h1>
          <div class="gold-divider-line"></div>
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
        <div class="page-body-content">
          ${data.header ? `<h2 class="letter-title">${data.header}</h2>` : ''}
          ${paragraphsHtml}
          ${data.artImage ? `
            <img class="watercolor-spot-art page-text-art" src="${data.artImage}" alt="Ilustración acuarela temática" />
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
        <div class="page-body-content">
          <div class="clean-photo-frame single-photo" data-full-img="${data.photo.src}" data-caption="${data.photo.caption}">
            <img class="clean-photo-img single-photo-img" src="${data.photo.src}" alt="${data.photo.alt}" loading="lazy" />
            <div class="clean-photo-caption">${data.photo.caption}</div>
          </div>
          <div class="photo-text-block">
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
        <div class="page-body-content">
          <div class="scrapbook-photos-row">
            <div class="clean-photo-frame scrapbook-frame" data-full-img="${data.photo1.src}" data-caption="${data.photo1.caption}">
              <img class="clean-photo-img scrapbook-img" src="${data.photo1.src}" alt="Postres" />
              <div class="clean-photo-caption">${data.photo1.caption}</div>
            </div>
            <div class="clean-photo-frame scrapbook-frame" data-full-img="${data.photo2.src}" data-caption="${data.photo2.caption}">
              <img class="clean-photo-img scrapbook-img" src="${data.photo2.src}" alt="Celebración" />
              <div class="clean-photo-caption">${data.photo2.caption}</div>
            </div>
          </div>
          <div class="scrapbook-text-block">
            ${paragraphsHtml}
          </div>
          ${data.artImage ? `
            <img class="watercolor-spot-art scrapbook-art" src="${data.artImage}" alt="Postres acuarela" />
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
        <div class="page-body-content">
          ${data.paragraphs.map(p => `<p class="letter-paragraph">${p}</p>`).join('')}

          <!-- Ilustración en Acuarela del Hilo Dorado y Notas Musicales -->
          <img class="watercolor-spot-art wide music-thread-art" src="${data.artImage}" alt="Hilo dorado en acuarela" />

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
            <div class="spotify-link-row">
              <a class="spotify-btn-action" id="btn-open-spotify-direct" href="${song.spotifyUrl}" target="_blank" rel="noopener noreferrer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.498 17.306c-.218.358-.684.472-1.042.254-2.857-1.746-6.455-2.141-10.693-1.173-.408.093-.816-.164-.909-.572-.093-.408.164-.816.572-.909 4.638-1.06 8.625-.615 11.818 1.358.358.218.472.684.254 1.042zm1.468-3.266c-.274.446-.86.589-1.306.315-3.27-2.01-8.254-2.593-12.122-1.417-.5.152-1.028-.133-1.18-.633-.152-.5.133-1.028.633-1.18 4.417-1.34 9.907-.692 13.66 1.61.446.274.589.86.315 1.305zm.126-3.41c-3.921-2.328-10.384-2.543-14.127-1.406-.602.183-1.241-.165-1.424-.767-.183-.602.165-1.241.767-1.424 4.305-1.307 11.439-1.054 15.962 1.63.541.321.716 1.024.395 1.565-.321.541-1.024.716-1.573.402z"/>
                </svg>
                <span>Escuchar en Spotify</span>
              </a>
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
        <div class="page-body-content">
          <div class="clean-photo-frame closing-frame" data-full-img="${data.photo.src}" data-caption="${data.photo.caption}">
            <img class="clean-photo-img closing-img" src="${data.photo.src}" alt="Celebración" />
            <div class="clean-photo-caption">${data.photo.caption}</div>
          </div>
          <div class="closing-text-block">
            ${paragraphsHtml}
          </div>
          ${data.artImage ? `
            <img class="watercolor-spot-art closing-bouquet-art" src="${data.artImage}" alt="Ramo de cumpleaños en acuarela" />
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
      <div class="page-content-wrapper page-chapter-intro">
        <div class="page-header-minimal">
          <span class="page-header-title">${data.title}</span>
        </div>
        <div class="page-center-block epilogue-box">
          <img class="watercolor-spot-art epilogue-art" src="${data.artImage}" alt="Corona botánica" />
          <h2 class="letter-title epilogue-title">${data.subtitle}</h2>
          <div class="gold-divider-line"></div>
          <p class="letter-paragraph epilogue-text">
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
