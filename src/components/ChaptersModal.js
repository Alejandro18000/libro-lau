/**
 * ChaptersModal.js
 * Modal limpio con el índice de capítulos.
 */

import { chapters } from '../chapters/chaptersData.js';

export class ChaptersModal {
  constructor(onSelectChapter) {
    this.onSelectChapter = onSelectChapter;
    this.overlay = document.createElement('div');
    this.overlay.className = 'chapters-modal-overlay';
    this.overlay.innerHTML = `
      <div class="chapters-modal-box">
        <div style="position: absolute; top: 16px; right: 20px; font-size: 1.8rem; color: #6b5e67; cursor: pointer;" id="modal-toc-close">
          &times;
        </div>
        <h3 class="chapters-modal-title" style="margin-bottom: 6px;">Índice</h3>
        <p style="font-family: var(--font-serif); font-size: 1rem; color: var(--text-muted); text-align: center; margin-bottom: 20px;">
          Para Lau
        </p>
        <div id="modal-chapters-list"></div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    this.renderList();

    this.closeBtn = this.overlay.querySelector('#modal-toc-close');
    this.close = this.close.bind(this);
    this.closeBtn.addEventListener('click', this.close);
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
  }

  renderList() {
    const listContainer = this.overlay.querySelector('#modal-chapters-list');
    listContainer.innerHTML = chapters.map(c => `
      <div class="chapter-item-btn" data-target-page="${c.targetPage}" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; margin-bottom: 12px; background: #fff; border: 1px solid rgba(212, 175, 55, 0.25); border-radius: 6px; cursor: pointer;">
        <div>
          <div style="font-family: var(--font-serif); font-weight: 600; font-size: 1.15rem; color: var(--cover-bg);">
            ${c.numberRoman}: ${c.title}
          </div>
          <div style="font-family: var(--font-sans); font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
            ${c.description}
          </div>
        </div>
        <div style="font-family: var(--font-serif); font-size: 1rem; color: var(--gold-accent); font-weight: 600; margin-left: 10px;">
          ${c.isUpcoming ? 'Pronto' : `Pág. ${c.targetPage}`}
        </div>
      </div>
    `).join('');

    listContainer.querySelectorAll('.chapter-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = parseInt(btn.getAttribute('data-target-page'), 10);
        if (target && this.onSelectChapter) {
          this.onSelectChapter(target);
          this.close();
        }
      });
    });
  }

  open() {
    this.overlay.classList.add('open');
  }

  close() {
    this.overlay.classList.remove('open');
  }
}
