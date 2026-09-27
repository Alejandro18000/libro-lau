/**
 * PetalsEffect.js
 * Genera una lluvia sutil de pétalos de cerezo (sakura) y destellos dorados
 * evocando la atmósfera visual de los dramas coreanos románticos.
 */

export class PetalsEffect {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.petals = [];
    this.sparkles = [];
    this.numPetals = 28;
    this.numSparkles = 22;
    this.active = true;
    this.animationFrame = null;

    this.resize = this.resize.bind(this);
    this.animate = this.animate.bind(this);

    window.addEventListener('resize', this.resize);
    this.resize();
    this.initElements();
    this.animate();
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  initElements() {
    this.petals = [];
    for (let i = 0; i < this.numPetals; i++) {
      this.petals.push(this.createPetal(true));
    }
    this.sparkles = [];
    for (let i = 0; i < this.numSparkles; i++) {
      this.sparkles.push(this.createSparkle(true));
    }
  }

  createPetal(randomY = false) {
    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height : -20,
      size: Math.random() * 9 + 8,
      speedX: Math.random() * 1.2 - 0.4,
      speedY: Math.random() * 1.2 + 0.8,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 1.5,
      tilt: Math.random() * 30 - 15,
      tiltAngle: Math.random() * Math.PI,
      tiltSpeed: Math.random() * 0.04 + 0.01,
      color: Math.random() > 0.3 ? 'rgba(235, 185, 198, ' : 'rgba(247, 215, 222, ',
      opacity: Math.random() * 0.45 + 0.35
    };
  }

  createSparkle(randomY = false) {
    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height : -10,
      radius: Math.random() * 2 + 0.8,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: Math.random() * 0.6 + 0.4,
      opacity: Math.random() * 0.5 + 0.2,
      pulse: Math.random() * Math.PI,
      pulseSpeed: Math.random() * 0.03 + 0.01
    };
  }

  drawPetal(p) {
    this.ctx.save();
    this.ctx.translate(p.x, p.y);
    this.ctx.rotate((p.rotation * Math.PI) / 180);
    this.ctx.scale(Math.cos(p.tiltAngle), 1);

    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.bezierCurveTo(-p.size / 2, -p.size / 2, -p.size, p.size / 3, 0, p.size);
    this.ctx.bezierCurveTo(p.size, p.size / 3, p.size / 2, -p.size / 2, 0, 0);

    const gradient = this.ctx.createLinearGradient(0, 0, 0, p.size);
    gradient.addColorStop(0, p.color + (p.opacity * 0.7) + ')');
    gradient.addColorStop(1, p.color + (p.opacity * 0.3) + ')');

    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    this.ctx.restore();
  }

  drawSparkle(s) {
    this.ctx.save();
    const currentOpacity = s.opacity * (0.6 + 0.4 * Math.sin(s.pulse));
    this.ctx.beginPath();
    this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(223, 186, 115, ${currentOpacity})`;
    this.ctx.shadowBlur = 6;
    this.ctx.shadowColor = 'rgba(223, 186, 115, 0.8)';
    this.ctx.fill();
    this.ctx.restore();
  }

  animate() {
    if (!this.active) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Actualizar y dibujar destellos dorados
    for (let i = 0; i < this.sparkles.length; i++) {
      const s = this.sparkles[i];
      s.x += s.speedX;
      s.y += s.speedY;
      s.pulse += s.pulseSpeed;

      if (s.y > this.height + 10) {
        this.sparkles[i] = this.createSparkle(false);
      }
      this.drawSparkle(s);
    }

    // Actualizar y dibujar pétalos
    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];
      p.x += p.speedX + Math.sin(p.tiltAngle) * 0.5;
      p.y += p.speedY;
      p.rotation += p.rotationSpeed;
      p.tiltAngle += p.tiltSpeed;

      if (p.y > this.height + 25 || p.x < -20 || p.x > this.width + 20) {
        this.petals[i] = this.createPetal(false);
      }
      this.drawPetal(p);
    }

    this.animationFrame = requestAnimationFrame(this.animate);
  }

  toggle() {
    this.active = !this.active;
    if (this.active) {
      this.animate();
    } else {
      cancelAnimationFrame(this.animationFrame);
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
    return this.active;
  }
}
