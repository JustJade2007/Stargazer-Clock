/**
 * Stargazer Semicircle Dial Engine
 * Renders glowing celestial semicircular gauges with tick marks, glowing needles,
 * and high-DPI crisp arc rendering.
 */

(function (window) {
  'use strict';

  class SemicircleDial {
    /**
     * @param {HTMLCanvasElement|string} canvasOrId 
     * @param {Object} options 
     */
    constructor(canvasOrId, options = {}) {
      this.canvas = typeof canvasOrId === 'string' ? document.getElementById(canvasOrId) : canvasOrId;
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');

      this.options = Object.assign({
        isMini: false,
        showTicks: true,
        showLabels: true,
        startAngle: Math.PI,      // 180 deg (Left)
        endAngle: 0,              // 0 deg (Right)
        lineWidth: options.isMini ? 6 : 14,
        trackColor: 'rgba(255, 255, 255, 0.07)',
        glowColor: '#00f2fe',
        arcColorStart: '#00f2fe',
        arcColorEnd: '#4facfe',
        pointerRadius: options.isMini ? 4 : 8,
        labelFormat: (pct) => `${Math.round(pct * 100)}%`
      }, options);

      this.currentProgress = 0; // 0.0 to 1.0
      this.targetProgress = 0;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.init();
    }

    init() {
      this.resize();
      this.handleResize = this.resize.bind(this);
      window.addEventListener('resize', this.handleResize);
    }

    resize() {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      this.width = rect.width || (this.options.isMini ? 220 : 580);
      this.height = rect.height || (this.options.isMini ? 90 : 340);
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.ctx.scale(this.dpr, this.dpr);

      this.render();
    }

    /**
     * Set progress percentage (0.0 to 1.0) with optional smooth animation
     */
    setProgress(progress, immediate = false) {
      const clamped = Math.max(0, Math.min(1, progress));
      this.targetProgress = clamped;
      if (immediate) {
        this.currentProgress = clamped;
        this.render();
      } else {
        // Smooth lerp
        this.currentProgress += (this.targetProgress - this.currentProgress) * 0.2;
        this.render();
      }
    }

    setColors(glowColor, startColor, endColor) {
      this.options.glowColor = glowColor;
      this.options.arcColorStart = startColor;
      this.options.arcColorEnd = endColor;
      this.render();
    }

    render() {
      if (!this.ctx || !this.width || !this.height) return;

      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      ctx.clearRect(0, 0, w, h);

      const isMini = this.options.isMini;
      const padding = isMini ? 12 : 28;
      const centerX = w / 2;
      const centerY = h - (isMini ? 8 : 18);
      const radius = Math.min(centerX - padding, (h - (isMini ? 10 : 25)));

      if (radius <= 0) return;

      const startAngle = Math.PI;
      const endAngle = 0; // standard 180 degree semicircle arch

      // 1. Draw Outer Track Guide Groove
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
      ctx.strokeStyle = this.options.trackColor;
      ctx.lineWidth = this.options.lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 2. Draw Graduation Ticks (if not mini or if specified)
      if (this.options.showTicks && !isMini) {
        const totalTicks = 40;
        const tickInnerR = radius - (this.options.lineWidth / 2) - 8;
        const tickMajorR = tickInnerR - 12;
        const tickMinorR = tickInnerR - 6;

        for (let i = 0; i <= totalTicks; i++) {
          const tickPct = i / totalTicks;
          // Angle ranges from PI to 0
          const angle = Math.PI - (tickPct * Math.PI);
          const isMajor = i % 5 === 0;
          const r1 = tickInnerR;
          const r2 = isMajor ? tickMajorR : tickMinorR;

          const x1 = centerX + Math.cos(angle) * r1;
          const y1 = centerY - Math.sin(angle) * r1;
          const x2 = centerX + Math.cos(angle) * r2;
          const y2 = centerY - Math.sin(angle) * r2;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = isMajor ? 1.8 : 1.0;
          ctx.stroke();

          // Numerical label on major ticks
          if (isMajor && this.options.showLabels) {
            const labelR = tickMajorR - 10;
            const lx = centerX + Math.cos(angle) * labelR;
            const ly = centerY - Math.sin(angle) * labelR;

            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.options.labelFormat(tickPct), lx, ly);
          }
        }
      }

      // 3. Draw Active Progress Arc
      if (this.currentProgress > 0.001) {
        // Progress angle: from PI sweeping clockwise towards 0
        // e.g. at 50%: PI - 0.5*PI = PI/2 (top center)
        const progressAngle = Math.PI - (this.currentProgress * Math.PI);

        // Gradient
        const grad = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
        grad.addColorStop(0, this.options.arcColorStart);
        grad.addColorStop(1, this.options.arcColorEnd);

        // Outer Glow Pass
        ctx.save();
        ctx.beginPath();
        // Sweep in canvas angle: startAngle = PI (180deg), goes clockwise to 2*PI - (progressAngle),
        // or counter-clockwise from PI to progressAngle:
        ctx.arc(centerX, centerY, radius, Math.PI, progressAngle, true);
        ctx.strokeStyle = this.options.glowColor;
        ctx.lineWidth = this.options.lineWidth + (isMini ? 2 : 6);
        ctx.shadowColor = this.options.glowColor;
        ctx.shadowBlur = isMini ? 10 : 22;
        ctx.globalAlpha = 0.55;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        // Core Solid Crisp Arc Pass
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI, progressAngle, true);
        ctx.strokeStyle = grad;
        ctx.lineWidth = this.options.lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 4. Indicator Pointer Orb
        const pointerX = centerX + Math.cos(progressAngle) * radius;
        const pointerY = centerY - Math.sin(progressAngle) * radius;

        // Radiating Glow
        ctx.save();
        ctx.beginPath();
        ctx.arc(pointerX, pointerY, this.options.pointerRadius * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = this.options.glowColor;
        ctx.globalAlpha = 0.45;
        ctx.shadowColor = this.options.glowColor;
        ctx.shadowBlur = isMini ? 12 : 24;
        ctx.fill();
        ctx.restore();

        // Center White Core
        ctx.beginPath();
        ctx.arc(pointerX, pointerY, this.options.pointerRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    }
  }

  window.StargazerDial = SemicircleDial;
})(window);
