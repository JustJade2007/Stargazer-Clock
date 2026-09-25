/**
 * Stargazer Semicircle Dial Engine
 * Renders glowing celestial semicircular gauges with tick marks, glowing needles,
 * and high-DPI crisp arc rendering.
 * Supports celestial pointers: dynamic Sun with radiant corona rays during daytime,
 * and astronomical Moon matching real lunar phases during nighttime.
 */

(function (window) {
  'use strict';

  // Synodic lunar cycle constants
  const REF_NEW_MOON_EPOCH = 947182440000; // Jan 6, 2000 18:14 UTC
  const SYNODIC_PERIOD_MS = 29.53058867 * 86400 * 1000;

  /**
   * Astronomical Lunar Phase Calculator
   */
  function calculateMoonPhase(date = new Date()) {
    const diff = date.getTime() - REF_NEW_MOON_EPOCH;
    let phase = (diff % SYNODIC_PERIOD_MS) / SYNODIC_PERIOD_MS;
    if (phase < 0) phase += 1;

    // Illuminated fraction
    const angle = phase * 2 * Math.PI;
    const illuminated = (1 - Math.cos(angle)) / 2;

    let name = '';
    let emoji = '';
    if (phase < 0.03 || phase > 0.97) {
      name = 'New Moon';
      emoji = '🌑';
    } else if (phase < 0.22) {
      name = 'Waxing Crescent';
      emoji = '🌒';
    } else if (phase < 0.28) {
      name = 'First Quarter';
      emoji = '🌓';
    } else if (phase < 0.47) {
      name = 'Waxing Gibbous';
      emoji = '🌔';
    } else if (phase < 0.53) {
      name = 'Full Moon';
      emoji = '🌕';
    } else if (phase < 0.72) {
      name = 'Waning Gibbous';
      emoji = '🌖';
    } else if (phase < 0.78) {
      name = 'Last Quarter';
      emoji = '🌗';
    } else {
      name = 'Waning Crescent';
      emoji = '🌘';
    }

    return {
      phase, // 0.0 to 1.0
      name,
      emoji,
      illuminatedFraction: illuminated,
      illuminatedPercent: `${Math.round(illuminated * 100)}%`
    };
  }

  /**
   * Day/Night Detector
   */
  function isDaytime(date = new Date()) {
    const hours = date.getHours() + (date.getMinutes() / 60);
    return hours >= 6.0 && hours < 18.0;
  }

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
        endAngle: 2 * Math.PI,    // 0 / 360 deg (Right)
        lineWidth: options.isMini ? 6 : 14,
        trackColor: 'rgba(255, 255, 255, 0.07)',
        glowColor: '#00f2fe',
        arcColorStart: '#00f2fe',
        arcColorEnd: '#4facfe',
        pointerRadius: options.isMini ? 6 : 12,
        pointerMode: 'auto', // 'auto' (Sun daytime, Moon night), 'sun', 'moon', 'orb'
        labelFormat: (pct) => `${Math.round(pct * 100)}%`
      }, options);

      this.currentProgress = 0; // 0.0 to 1.0
      this.targetProgress = 0;
      this.currentDate = new Date();
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
    setProgress(progress, immediate = false, date = new Date()) {
      const clamped = Math.max(0, Math.min(1, progress));
      this.targetProgress = clamped;
      this.currentDate = date;
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

    setPointerMode(mode) {
      this.options.pointerMode = mode;
      this.render();
    }

    getAstronomicalInfo(date = this.currentDate) {
      const moon = calculateMoonPhase(date);
      const isDay = isDaytime(date);
      return {
        isDaytime: isDay,
        activeCelestial: isDay ? 'Sun' : 'Moon',
        moon
      };
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
      const endAngle = 2 * Math.PI; // standard 180 degree upper semicircle arch

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
          // Sweep clockwise along upper semicircle from Math.PI to 2*Math.PI
          const angle = Math.PI + (tickPct * Math.PI);
          const isMajor = i % 5 === 0;
          const r1 = tickInnerR;
          const r2 = isMajor ? tickMajorR : tickMinorR;

          const x1 = centerX + Math.cos(angle) * r1;
          const y1 = centerY + Math.sin(angle) * r1;
          const x2 = centerX + Math.cos(angle) * r2;
          const y2 = centerY + Math.sin(angle) * r2;

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
            const ly = centerY + Math.sin(angle) * labelR;

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
        // Progress angle sweeps clockwise from Math.PI (left, 0%) towards 2*Math.PI (right, 100%)
        const currentAngle = Math.PI + (this.currentProgress * Math.PI);

        // Gradient
        const grad = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
        grad.addColorStop(0, this.options.arcColorStart);
        grad.addColorStop(1, this.options.arcColorEnd);

        // Outer Glow Pass
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, Math.PI, currentAngle, false);
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
        ctx.arc(centerX, centerY, radius, Math.PI, currentAngle, false);
        ctx.strokeStyle = grad;
        ctx.lineWidth = this.options.lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 4. Indicator Pointer: Celestial Sun / Moon / Orb
        const pointerX = centerX + Math.cos(currentAngle) * radius;
        const pointerY = centerY + Math.sin(currentAngle) * radius;

        this.drawPointer(ctx, pointerX, pointerY, isMini);
      }
    }

    /**
     * Draws the celestial pointer (Sun / Moon / Classic Orb)
     */
    drawPointer(ctx, x, y, isMini) {
      const mode = this.options.pointerMode || 'auto';
      const date = this.currentDate || new Date();
      const isDay = isDaytime(date);

      let targetType = 'orb';
      if (mode === 'sun') targetType = 'sun';
      else if (mode === 'moon') targetType = 'moon';
      else if (mode === 'orb') targetType = 'orb';
      else {
        // 'auto': Sun during daytime (6am-6pm), Moon during nighttime (6pm-6am)
        targetType = isDay ? 'sun' : 'moon';
      }

      const r = this.options.pointerRadius;

      if (targetType === 'sun') {
        this.drawSunPointer(ctx, x, y, r, isMini);
      } else if (targetType === 'moon') {
        const moon = calculateMoonPhase(date);
        this.drawMoonPointer(ctx, x, y, r, moon, isMini);
      } else {
        this.drawOrbPointer(ctx, x, y, r, isMini);
      }
    }

    /**
     * Draws a luminous golden Sun pointer with radiant corona rays
     */
    drawSunPointer(ctx, x, y, r, isMini) {
      ctx.save();

      // 1. Solar Corona Outer Flare
      const coronaGrad = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.8);
      coronaGrad.addColorStop(0, 'rgba(255, 235, 59, 0.7)');
      coronaGrad.addColorStop(0.5, 'rgba(255, 152, 0, 0.35)');
      coronaGrad.addColorStop(1, 'rgba(255, 111, 0, 0)');

      ctx.beginPath();
      ctx.arc(x, y, r * 2.8, 0, Math.PI * 2);
      ctx.fillStyle = coronaGrad;
      ctx.fill();

      // 2. Solar Corona Rays
      if (!isMini) {
        const numRays = 8;
        const rayInner = r + 2;
        const rayOuter = r + 7;
        ctx.strokeStyle = '#ffd54f';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#ffb300';
        ctx.shadowBlur = 8;

        for (let i = 0; i < numRays; i++) {
          const a = (i / numRays) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(a) * rayInner, y + Math.sin(a) * rayInner);
          ctx.lineTo(x + Math.cos(a) * rayOuter, y + Math.sin(a) * rayOuter);
          ctx.stroke();
        }
      }

      // 3. Sun Disc
      const sunGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      sunGrad.addColorStop(0, '#ffffff');
      sunGrad.addColorStop(0.4, '#fff9c4');
      sunGrad.addColorStop(0.8, '#ffca28');
      sunGrad.addColorStop(1, '#ff8f00');

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = sunGrad;
      ctx.shadowColor = '#ffa000';
      ctx.shadowBlur = isMini ? 8 : 16;
      ctx.fill();

      ctx.restore();
    }

    /**
     * Draws an astronomically accurate Moon pointer matching real lunar phase
     */
    drawMoonPointer(ctx, x, y, r, moon, isMini) {
      ctx.save();

      // 1. Soft Lunar Celestial Atmosphere
      const auraGrad = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.4);
      auraGrad.addColorStop(0, 'rgba(190, 225, 255, 0.45)');
      auraGrad.addColorStop(0.6, 'rgba(120, 170, 255, 0.18)');
      auraGrad.addColorStop(1, 'rgba(90, 130, 255, 0)');

      ctx.beginPath();
      ctx.arc(x, y, r * 2.4, 0, Math.PI * 2);
      ctx.fillStyle = auraGrad;
      ctx.fill();

      // 2. Dark Hemisphere (Base Moon Disc)
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#161d36'; // deep dark midnight slate
      ctx.shadowColor = 'rgba(180, 220, 255, 0.5)';
      ctx.shadowBlur = isMini ? 6 : 12;
      ctx.fill();

      // Subtle Craters on dark side
      if (!isMini) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.beginPath();
        ctx.arc(x - r * 0.3, y - r * 0.2, r * 0.22, 0, Math.PI * 2);
        ctx.arc(x + r * 0.25, y + r * 0.35, r * 0.28, 0, Math.PI * 2);
        ctx.arc(x - r * 0.15, y + r * 0.4, r * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Illuminated Lunar Phase
      const p = moon.phase; // 0.0 to 1.0
      const isWaxing = p < 0.5; // Right side lit in Northern Hemisphere

      // Moonlit Pearl Gradient
      const moonGrad = ctx.createRadialGradient(
        isWaxing ? x + r * 0.4 : x - r * 0.4,
        y - r * 0.2,
        r * 0.1,
        x,
        y,
        r
      );
      moonGrad.addColorStop(0, '#ffffff');
      moonGrad.addColorStop(0.5, '#f0f4fc');
      moonGrad.addColorStop(0.85, '#dbe4f0');
      moonGrad.addColorStop(1, '#94a3b8');

      ctx.fillStyle = moonGrad;

      // Draw Phase Silhouette
      if (p >= 0.48 && p <= 0.52) {
        // Full Moon: fully lit disc
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p > 0.02 && p < 0.98) {
        // Crescent or Gibbous
        const k = Math.cos(2 * Math.PI * p);
        const rx = Math.max(0.5, Math.abs(r * k));

        ctx.beginPath();
        if (isWaxing) {
          // Waxing: right side outer arc
          ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, false);
          // Terminator ellipse
          const ccw = p < 0.25; // Crescent curves back inwards
          ctx.ellipse(x, y, rx, r, 0, Math.PI / 2, -Math.PI / 2, ccw);
        } else {
          // Waning: left side outer arc
          ctx.arc(x, y, r, Math.PI / 2, -Math.PI / 2, false);
          // Terminator ellipse
          const ccw = p > 0.75; // Crescent curves back inwards
          ctx.ellipse(x, y, rx, r, 0, -Math.PI / 2, Math.PI / 2, ccw);
        }
        ctx.closePath();
        ctx.fill();
      }

      // 4. Subtle Lunar Limb Glow
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.restore();
    }

    /**
     * Draws the classic glowing celestial orb pointer
     */
    drawOrbPointer(ctx, x, y, r, isMini) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r * 2.0, 0, Math.PI * 2);
      ctx.fillStyle = this.options.glowColor;
      ctx.globalAlpha = 0.45;
      ctx.shadowColor = this.options.glowColor;
      ctx.shadowBlur = isMini ? 12 : 24;
      ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(x, y, r * 0.75, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  }

  window.StargazerDial = SemicircleDial;
  window.StargazerMoon = {
    calculateMoonPhase,
    isDaytime
  };
})(window);
