/**
 * Stargazer Starfield & Cosmic Nebula Engine
 * High-performance canvas animation featuring:
 * - Multi-layer star twinkling with mouse parallax and meteors
 * - Dynamic Weather Particle System (Rain streaks & ripples, drifting snowflakes, rolling mist, thunderstorm flashes)
 * - Atmospheric Temperature Tinting (Icy glacial cyan, deep cosmic indigo, warm golden-amber)
 * - Twilight & Golden Hour horizon glow synchronized with local ephemeris
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
      this.weatherParticles = [];
      this.ripples = [];
      this.cloudLayers = [];
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      // Options
      this.density = 'medium'; // 'low', 'medium', 'high'
      this.enableMeteors = true;
      this.enableParallax = true;
      this.enableWeatherBackdrop = true;

      // Mouse Parallax targets
      this.targetMouseX = 0;
      this.targetMouseY = 0;
      this.mouseX = 0;
      this.mouseY = 0;

      this.lastFrameTime = performance.now();
      this.meteorTimer = 0;
      this.nextMeteorDelay = 4000 + Math.random() * 5000;

      // Weather & Atmosphere State
      this.weatherCategory = 'clear'; // 'clear', 'clouds', 'rain', 'snow', 'thunder', 'fog'
      this.targetCategory = 'clear';
      this.temperatureC = 20;
      this.targetTemperatureC = 20;
      this.twilightFactor = 0; // 0 (day or deep night) to 1.0 (golden hour)
      this.targetTwilightFactor = 0;
      
      // Thunderstorm timing
      this.lightningTimer = 0;
      this.lightningDuration = 0;
      this.lightningIntensity = 0;

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

      this.initClouds();
      this.resize();
      this.generateStars();
      this.initWeatherParticles();

      // Listen for weather updates
      window.addEventListener('stargazer:weather-update', (e) => {
        if (e.detail) {
          this.setWeather(e.detail.category, e.detail.temperatureC);
        }
      });

      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      this.generateStars();
      this.initWeatherParticles();
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

    setWeatherBackdropEnabled(enabled) {
      this.enableWeatherBackdrop = Boolean(enabled);
      if (!enabled) {
        this.weatherParticles = [];
        this.ripples = [];
      } else {
        this.initWeatherParticles();
      }
    }

    setWeather(category, temperatureC) {
      if (category) this.targetCategory = category;
      if (typeof temperatureC === 'number' && !isNaN(temperatureC)) {
        this.targetTemperatureC = temperatureC;
      }
      this.initWeatherParticles();
    }

    setTwilightFactor(factor) {
      this.targetTwilightFactor = Math.max(0, Math.min(1, factor));
    }

    generateStars() {
      const counts = { low: 120, medium: 260, high: 500 };
      const count = counts[this.density] || 260;
      this.stars = [];

      const hues = [210, 220, 260, 45, 0];

      for (let i = 0; i < count; i++) {
        const layer = Math.random();
        const hue = hues[Math.floor(Math.random() * hues.length)];
        const isSpike = Math.random() < 0.08;

        this.stars.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          radius: (0.4 + layer * 1.6),
          baseAlpha: 0.2 + layer * 0.7,
          alpha: 0.2 + layer * 0.7,
          twinkleSpeed: 0.001 + Math.random() * 0.003,
          twinklePhase: Math.random() * Math.PI * 2,
          layer: layer,
          hue: hue,
          isSpike: isSpike
        });
      }
    }

    initClouds() {
      this.cloudLayers = [];
      const cloudCount = 5;
      for (let i = 0; i < cloudCount; i++) {
        this.cloudLayers.push({
          x: Math.random() * this.width,
          y: (Math.random() * 0.7) * this.height,
          radius: 180 + Math.random() * 220,
          speed: 10 + Math.random() * 15,
          alpha: 0.04 + Math.random() * 0.06
        });
      }
    }

    initWeatherParticles() {
      if (!this.enableWeatherBackdrop) {
        this.weatherParticles = [];
        return;
      }

      const cat = this.targetCategory;
      this.weatherParticles = [];

      if (cat === 'rain' || cat === 'thunder') {
        const count = cat === 'thunder' ? 140 : 90;
        for (let i = 0; i < count; i++) {
          this.weatherParticles.push({
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            speed: 650 + Math.random() * 450,
            len: 12 + Math.random() * 18,
            angle: 0.12, // slight wind slant
            alpha: 0.2 + Math.random() * 0.5,
            width: 1.0 + Math.random() * 0.8
          });
        }
      } else if (cat === 'snow') {
        const count = 75;
        for (let i = 0; i < count; i++) {
          this.weatherParticles.push({
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            radius: 1.2 + Math.random() * 2.8,
            speed: 40 + Math.random() * 60,
            swaySpeed: 1 + Math.random() * 2,
            swayAmp: 20 + Math.random() * 30,
            swayPhase: Math.random() * Math.PI * 2,
            alpha: 0.3 + Math.random() * 0.6
          });
        }
      }
    }

    spawnMeteor() {
      const startX = Math.random() * (this.width * 1.2) - (this.width * 0.1);
      const startY = Math.random() * (this.height * 0.4);
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
      const speed = 700 + Math.random() * 500;
      const length = 90 + Math.random() * 110;

      this.meteors.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: length,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4
      });
    }

    spawnRainRipple(x, y) {
      if (this.ripples.length < 25) {
        this.ripples.push({
          x: x,
          y: y,
          r: 1,
          maxR: 8 + Math.random() * 12,
          alpha: 0.45
        });
      }
    }

    /**
     * Renders temperature-responsive ambient atmosphere and twilight horizon
     */
    drawAtmosphere(ctx) {
      const w = this.width;
      const h = this.height;

      // 1. Temperature-influenced Cosmic Wash
      const temp = this.temperatureC;
      let washColor = 'rgba(16, 21, 56, 0.4)'; // mild default indigo
      if (temp <= 0) {
        // Icy glacial cyan / frosty deep ocean
        washColor = 'rgba(0, 195, 255, 0.14)';
      } else if (temp < 10) {
        // Cold crisp blue
        washColor = 'rgba(79, 172, 254, 0.11)';
      } else if (temp > 24) {
        // Warm golden solar flare / summer ember
        const warmIntensity = Math.min(0.22, 0.08 + (temp - 24) * 0.007);
        washColor = `rgba(255, 145, 0, ${warmIntensity})`;
      }

      const tempGrad = ctx.createRadialGradient(w / 2, h * 0.4, 40, w / 2, h * 0.4, Math.max(w, h) * 0.7);
      tempGrad.addColorStop(0, washColor);
      tempGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = tempGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Twilight / Golden Hour Horizon Arc Glow
      if (this.twilightFactor > 0.01) {
        const glowAlpha = this.twilightFactor * 0.35;
        const horizonGrad = ctx.createRadialGradient(w / 2, h, 20, w / 2, h, w * 0.65);
        horizonGrad.addColorStop(0, `rgba(255, 125, 45, ${glowAlpha})`);
        horizonGrad.addColorStop(0.4, `rgba(180, 70, 160, ${glowAlpha * 0.6})`);
        horizonGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = horizonGrad;
        ctx.fillRect(0, h * 0.4, w, h * 0.6);
      }

      // 3. Fog / Overcast ambient dampening
      if (this.enableWeatherBackdrop && (this.weatherCategory === 'fog' || this.weatherCategory === 'clouds')) {
        const fogAlpha = this.weatherCategory === 'fog' ? 0.32 : 0.18;
        ctx.fillStyle = `rgba(18, 22, 40, ${fogAlpha})`;
        ctx.fillRect(0, 0, w, h);
      }
    }

    animate(now) {
      const deltaSec = Math.min((now - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = now;

      // Parallax smoothing
      this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
      this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

      // Smooth state transitions
      this.temperatureC += (this.targetTemperatureC - this.temperatureC) * 0.05;
      this.twilightFactor += (this.targetTwilightFactor - this.twilightFactor) * 0.05;
      this.weatherCategory = this.targetCategory;

      this.ctx.clearRect(0, 0, this.width, this.height);

      // 1. Draw Atmospheric Glow & Temperature Nebula
      this.drawAtmosphere(this.ctx);

      // 2. Draw Clouds / Mist
      if (this.enableWeatherBackdrop && (this.weatherCategory === 'clouds' || this.weatherCategory === 'fog' || this.weatherCategory === 'rain' || this.weatherCategory === 'thunder')) {
        for (let i = 0; i < this.cloudLayers.length; i++) {
          const c = this.cloudLayers[i];
          c.x += c.speed * deltaSec;
          if (c.x - c.radius > this.width) {
            c.x = -c.radius;
            c.y = (Math.random() * 0.6) * this.height;
          }

          const grad = this.ctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, c.radius);
          grad.addColorStop(0, `rgba(200, 220, 255, ${c.alpha * 1.5})`);
          grad.addColorStop(0.6, `rgba(140, 160, 200, ${c.alpha * 0.8})`);
          grad.addColorStop(1, 'rgba(100, 120, 180, 0)');
          this.ctx.fillStyle = grad;
          this.ctx.beginPath();
          this.ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }

      // 3. Draw Stars (Visibility slightly attenuated during thick fog)
      const starVisibility = this.weatherCategory === 'fog' ? 0.35 : 1.0;
      for (let i = 0; i < this.stars.length; i++) {
        const star = this.stars[i];
        star.twinklePhase += star.twinkleSpeed * deltaSec * 1000;
        const twinkle = Math.sin(star.twinklePhase);
        star.alpha = Math.max(0.08, (star.baseAlpha + twinkle * 0.35) * starVisibility);

        const px = star.x + (this.mouseX * star.layer);
        const py = star.y + (this.mouseY * star.layer);

        const drawX = (px + this.width) % this.width;
        const drawY = (py + this.height) % this.height;

        this.ctx.beginPath();
        this.ctx.arc(drawX, drawY, star.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(${star.hue}, 80%, 90%, ${star.alpha})`;
        this.ctx.fill();

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

      // 4. Meteors (Only active during clear or lightly clouded skies)
      if (this.enableMeteors && (this.weatherCategory === 'clear' || this.weatherCategory === 'clouds')) {
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

          this.ctx.beginPath();
          this.ctx.arc(m.x, m.y, 2, 0, Math.PI * 2);
          this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          this.ctx.shadowColor = '#00f2fe';
          this.ctx.shadowBlur = 10;
          this.ctx.fill();
          this.ctx.shadowBlur = 0;
        }
      }

      // 5. Dynamic Weather Particles (Rain / Snow / Thunder)
      if (this.enableWeatherBackdrop && this.weatherParticles.length > 0) {
        if (this.weatherCategory === 'rain' || this.weatherCategory === 'thunder') {
          this.ctx.strokeStyle = 'rgba(180, 225, 255, 0.45)';
          for (let i = 0; i < this.weatherParticles.length; i++) {
            const p = this.weatherParticles[i];
            p.y += p.speed * deltaSec;
            p.x += Math.sin(p.angle) * p.speed * deltaSec;

            if (p.y > this.height) {
              this.spawnRainRipple(p.x, this.height - 4);
              p.y = -p.len - Math.random() * 50;
              p.x = Math.random() * this.width;
            }

            this.ctx.lineWidth = p.width;
            this.ctx.beginPath();
            this.ctx.moveTo(p.x, p.y);
            this.ctx.lineTo(p.x + Math.sin(p.angle) * p.len, p.y + p.len);
            this.ctx.stroke();
          }

          // Rain ripples at base
          for (let i = this.ripples.length - 1; i >= 0; i--) {
            const rip = this.ripples[i];
            rip.r += 24 * deltaSec;
            rip.alpha -= 0.65 * deltaSec;
            if (rip.alpha <= 0 || rip.r >= rip.maxR) {
              this.ripples.splice(i, 1);
              continue;
            }
            this.ctx.beginPath();
            this.ctx.ellipse(rip.x, rip.y, rip.r, rip.r * 0.35, 0, 0, Math.PI * 2);
            this.ctx.strokeStyle = `rgba(180, 225, 255, ${rip.alpha})`;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
          }
        } else if (this.weatherCategory === 'snow') {
          for (let i = 0; i < this.weatherParticles.length; i++) {
            const s = this.weatherParticles[i];
            s.swayPhase += s.swaySpeed * deltaSec;
            s.y += s.speed * deltaSec;
            const swayX = s.x + Math.sin(s.swayPhase) * s.swayAmp;

            if (s.y > this.height) {
              s.y = -s.radius * 2;
              s.x = Math.random() * this.width;
            }

            this.ctx.beginPath();
            this.ctx.arc(swayX, s.y, s.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(240, 250, 255, ${s.alpha})`;
            this.ctx.fill();
          }
        }
      }

      // 6. Thunderstorm Lightning Flash
      if (this.enableWeatherBackdrop && this.weatherCategory === 'thunder') {
        this.lightningTimer += deltaSec;
        if (this.lightningTimer > 4.5 + Math.random() * 5.0) {
          this.lightningTimer = 0;
          this.lightningDuration = 0.18 + Math.random() * 0.12;
          this.lightningIntensity = 0.5 + Math.random() * 0.35;
        }

        if (this.lightningDuration > 0) {
          this.lightningDuration -= deltaSec;
          const flashAlpha = this.lightningIntensity * (this.lightningDuration > 0.05 ? 1 : this.lightningDuration / 0.05);
          this.ctx.fillStyle = `rgba(230, 240, 255, ${flashAlpha * 0.28})`;
          this.ctx.fillRect(0, 0, this.width, this.height);
        }
      }

      requestAnimationFrame(this.animate);
    }
  }

  window.StargazerStarfield = Starfield;
})(window);
