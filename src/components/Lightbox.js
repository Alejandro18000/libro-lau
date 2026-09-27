/**
 * Lightbox.js
 * Permite ampliar en alta resolución cualquier fotografía estilo polaroid
 * con una transición cinematográfica suave y su dedicatoria.
 */

export class Lightbox {
  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'lightbox-overlay';
    this.overlay.innerHTML = `
      <div style="position: absolute; top: 25px; right: 25px; color: #dfba73; font-size: 2rem; cursor: pointer; z-index: 210;" id="lightbox-close">
        &times;
      </div>
      <img class="lightbox-img" id="lightbox-img" src="" alt="Recuerdo ampliado" />
      <div class="lightbox-caption" id="lightbox-caption"></div>
    `;
    document.body.appendChild(this.overlay);

    this.imgEl = this.overlay.querySelector('#lightbox-img');
    this.captionEl = this.overlay.querySelector('#lightbox-caption');
    this.closeBtn = this.overlay.querySelector('#lightbox-close');

    this.close = this.close.bind(this);
    this.closeBtn.addEventListener('click', this.close);
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay.classList.contains('open')) {
        this.close();
      }
    });
  }

  open(src, caption) {
    this.imgEl.src = src;
    this.captionEl.textContent = caption || '';
    this.overlay.classList.add('open');
  }

  close() {
    this.overlay.classList.remove('open');
  }
}
