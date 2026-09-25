/**
 * Stargazer Starfield & Cosmic Nebula Engine
 * High-performance canvas animation featuring multi-layer star twinkling,
 * shooting meteors, and responsive mouse parallax.
 */

(function (window) {
  'use strict';

  class Starfield {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');

      this.stars = [];
      this.meteors = [];
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      // Options
      this.density = 'medium'; // 'low', 'medium', 'high'
      this.enableMeteors = true;
      this.enableParallax = true;

      // Mouse Parallax targets
      this.targetMouseX = 0;
      this.targetMouseY = 0;
      this.mouseX = 0;
      this.mouseY = 0;

      this.lastFrameTime = performance.now();
      this.meteorTimer = 0;
      this.nextMeteorDelay = 4000 + Math.random() * 5000;

      this.init();
    }

    init() {
      this.handleResize = this.resize.bind(this);
      window.addEventListener('resize', this.handleResize);

      window.addEventListener('mousemove', (e) => {
        if (!this.enableParallax) return;
        const normX = (e.clientX / window.innerWidth) - 0.5;
        const normY = (e.clientY / window.innerHeight) - 0.5;
        this.targetMouseX = normX * 30; // max 30px offset
        this.targetMouseY = normY * 30;
      });

      this.resize();
      this.generateStars();
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.ctx.scale(this.dpr, this.dpr);

      this.generateStars();
    }

    setDensity(density) {
      this.density = density;
      this.generateStars();
    }

    setMeteors(enabled) {
      this.enableMeteors = enabled;
      if (!enabled) this.meteors = [];
    }

    setParallax(enabled) {
      this.enableParallax = enabled;
      if (!enabled) {
        this.targetMouseX = 0;
        this.targetMouseY = 0;
      }
    }

    generateStars() {
      const counts = { low: 120, medium: 260, high: 500 };
      const count = counts[this.density] || 260;
      this.stars = [];

      // Color tints: cold blue, starlight white, pale violet, warm gold
      const hues = [210, 220, 260, 45, 0];

      for (let i = 0; i < count; i++) {
        const layer = Math.random(); // 0 (far) to 1 (near)
        const hue = hues[Math.floor(Math.random() * hues.length)];
        const isSpike = Math.random() < 0.08; // 8% of stars have subtle lens glare/spikes

        this.stars.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          radius: (0.4 + layer * 1.6),
          baseAlpha: 0.2 + layer * 0.7,
          alpha: 0.2 + layer * 0.7,
          twinkleSpeed: 0.001 + Math.random() * 0.003,
          twinklePhase: Math.random() * Math.PI * 2,
          layer: layer, // determines parallax sensitivity
          hue: hue,
          isSpike: isSpike
        });
      }
    }

    spawnMeteor() {
      const startX = Math.random() * (this.width * 1.2) - (this.width * 0.1);
      const startY = Math.random() * (this.height * 0.4);
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3; // roughly 45 degrees
      const speed = 700 + Math.random() * 500; // px/sec
      const length = 90 + Math.random() * 110;

      this.meteors.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: length,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4 // seconds
      });
    }

    animate(now) {
      const deltaSec = Math.min((now - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = now;

      // Parallax smoothing
      this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
      this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

      this.ctx.clearRect(0, 0, this.width, this.height);

      // Draw Stars
      for (let i = 0; i < this.stars.length; i++) {
        const star = this.stars[i];
        star.twinklePhase += star.twinkleSpeed * deltaSec * 1000;
        const twinkle = Math.sin(star.twinklePhase);
        star.alpha = Math.max(0.1, star.baseAlpha + twinkle * 0.35);

        // Position with parallax
        const px = star.x + (this.mouseX * star.layer);
        const py = star.y + (this.mouseY * star.layer);

        // Wrap around viewport edges
        const drawX = (px + this.width) % this.width;
        const drawY = (py + this.height) % this.height;

        this.ctx.beginPath();
        this.ctx.arc(drawX, drawY, star.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(${star.hue}, 80%, 90%, ${star.alpha})`;
        this.ctx.fill();

        // Starlight diffraction flare for prominent stars
        if (star.isSpike && star.alpha > 0.6) {
          this.ctx.strokeStyle = `hsla(${star.hue}, 100%, 95%, ${star.alpha * 0.4})`;
          this.ctx.lineWidth = 0.5;
          const spikeLen = star.radius * 4;

          this.ctx.beginPath();
          this.ctx.moveTo(drawX - spikeLen, drawY);
          this.ctx.lineTo(drawX + spikeLen, drawY);
          this.ctx.moveTo(drawX, drawY - spikeLen);
          this.ctx.lineTo(drawX, drawY + spikeLen);
          this.ctx.stroke();
        }
      }

      // Meteors / Shooting Stars
      if (this.enableMeteors) {
        this.meteorTimer += deltaSec * 1000;
        if (this.meteorTimer > this.nextMeteorDelay) {
          this.spawnMeteor();
          this.meteorTimer = 0;
          this.nextMeteorDelay = 5000 + Math.random() * 8000;
        }

        for (let i = this.meteors.length - 1; i >= 0; i--) {
          const m = this.meteors[i];
          m.life += deltaSec;
          m.x += m.vx * deltaSec;
          m.y += m.vy * deltaSec;

          const progress = m.life / m.maxLife;
          if (progress >= 1) {
            this.meteors.splice(i, 1);
            continue;
          }

          // Meteor tail gradient
          const tailX = m.x - (m.vx / 800) * m.length;
          const tailY = m.y - (m.vy / 800) * m.length;
          const alpha = (1 - progress) * 0.85;

          const grad = this.ctx.createLinearGradient(tailX, tailY, m.x, m.y);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          grad.addColorStop(0.7, `rgba(180, 230, 255, ${alpha * 0.6})`);
          grad.addColorStop(1, `rgba(255, 255, 255, ${alpha})`);

          this.ctx.beginPath();
          this.ctx.moveTo(tailX, tailY);
          this.ctx.lineTo(m.x, m.y);
          this.ctx.strokeStyle = grad;
          this.ctx.lineWidth = 1.8;
          this.ctx.stroke();

          // Meteor head glow
          this.ctx.beginPath();
          this.ctx.arc(m.x, m.y, 2, 0, Math.PI * 2);
          this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          this.ctx.shadowColor = '#00f2fe';
          this.ctx.shadowBlur = 10;
          this.ctx.fill();
          this.ctx.shadowBlur = 0; // reset
        }
      }

      requestAnimationFrame(this.animate);
    }
  }

  window.StargazerStarfield = Starfield;
})(window);
