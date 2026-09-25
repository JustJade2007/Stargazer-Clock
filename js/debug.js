/**
 * Stargazer Clock - Debug & Time Warp Simulation Engine
 * Allows manual overrides for:
 * - Time & Date with live acceleration multipliers (0x Freeze, 1x Realtime, 10x, 60x, 1440x Day/min)
 * - Timezone selection (UTC, NY, LA, London, Paris, Tokyo, Sydney, Custom Offset)
 * - Moon Stage / Phase (0% New Moon -> 50% Full Moon -> 100% Waning Crescent, or auto)
 * - Day / Night force mode (Auto, Daytime Sun, Nighttime Moon)
 * - Quick jump presets (Dawn 06:00, Noon 12:00, Dusk 18:00, Midnight 00:00)
 */

(function (window) {
  'use strict';

  // Debug State
  const state = {
    enabled: false,
    isSimulatedTime: false,
    simulatedEpochMs: Date.now(),
    lastRealMs: performance.now(),
    speedMultiplier: 1,
    timezone: 'auto',
    customUtcOffset: 0,
    moonPhaseOverride: null, // null = auto ephemeris, 0.0 - 1.0 = manual
    dayNightOverride: 'auto', // 'auto', 'day', 'night'
    isHudVisible: false
  };

  const TIMEZONE_LABELS = {
    'auto': 'Local System Time',
    'UTC': 'UTC / GMT (Greenwich)',
    'America/New_York': 'New York (EDT/EST, UTC-4/5)',
    'America/Chicago': 'Chicago (CDT/CST, UTC-5/6)',
    'America/Denver': 'Denver (MDT/MST, UTC-6/7)',
    'America/Los_Angeles': 'Los Angeles (PDT/PST, UTC-7/8)',
    'Europe/London': 'London (BST/GMT, UTC+1/0)',
    'Europe/Paris': 'Paris / Berlin (CEST/CET, UTC+2/1)',
    'Asia/Tokyo': 'Tokyo (JST, UTC+9)',
    'Asia/Shanghai': 'Beijing / Shanghai (CST, UTC+8)',
    'Asia/Kolkata': 'India (IST, UTC+5:30)',
    'Australia/Sydney': 'Sydney (AEST/AEDT, UTC+10/11)',
    'custom': 'Custom UTC Offset'
  };

  const Debug = {
    /**
     * Initialize debug module with saved settings
     */
    init(savedSettings = {}) {
      if (savedSettings) {
        state.enabled = Boolean(savedSettings.enabled);
        state.isSimulatedTime = Boolean(savedSettings.isSimulatedTime);
        state.speedMultiplier = Number(savedSettings.speedMultiplier) || 1;
        state.timezone = savedSettings.timezone || 'auto';
        state.customUtcOffset = Number(savedSettings.customUtcOffset) || 0;
        state.moonPhaseOverride = savedSettings.moonPhaseOverride !== undefined ? savedSettings.moonPhaseOverride : null;
        state.dayNightOverride = savedSettings.dayNightOverride || 'auto';
        
        if (savedSettings.simulatedDateTime) {
          const parsed = new Date(savedSettings.simulatedDateTime).getTime();
          if (!isNaN(parsed)) {
            state.simulatedEpochMs = parsed;
          }
        }
      }

      state.lastRealMs = performance.now();

      // Render Floating Debug HUD into DOM
      this.injectDebugHud();
      this.bindHudEvents();
      this.updateHudUi();

      if (state.enabled) {
        this.showDebugBanner(true);
      }
    },

    /**
     * Primary Time Provider for Stargazer Clock
     * Replaces raw new Date() calls to seamlessly support simulated time,
     * time warping, and timezone conversions.
     */
    now() {
      let epochMs = Date.now();

      if (state.enabled && state.isSimulatedTime) {
        const nowReal = performance.now();
        const deltaReal = nowReal - state.lastRealMs;
        state.lastRealMs = nowReal;

        if (state.speedMultiplier !== 0) {
          state.simulatedEpochMs += (deltaReal * state.speedMultiplier);
        }
        epochMs = state.simulatedEpochMs;
      } else {
        state.lastRealMs = performance.now();
      }

      const rawDate = new Date(epochMs);

      // Handle Timezone Conversion
      if (state.enabled && state.timezone !== 'auto') {
        return this.convertDateToTimezone(rawDate, state.timezone, state.customUtcOffset);
      }

      return rawDate;
    },

    /**
     * Convert date to target timezone representation
     */
    convertDateToTimezone(date, tz, customOffset) {
      if (tz === 'custom') {
        const utcMs = date.getTime() + (date.getTimezoneOffset() * 60000);
        return new Date(utcMs + (customOffset * 3600000));
      }

      try {
        const invDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));
        return invDate;
      } catch (e) {
        return date;
      }
    },

    /**
     * Moon Phase Override Getters
     */
    isMoonPhaseOverridden() {
      return state.enabled && state.moonPhaseOverride !== null && state.moonPhaseOverride !== undefined;
    },

    getMoonPhaseOverride() {
      if (!state.enabled || state.moonPhaseOverride === null || state.moonPhaseOverride === undefined) {
        return null;
      }
      return state.moonPhaseOverride;
    },

    /**
     * Day/Night Override Getter
     */
    getDayNightOverride() {
      if (!state.enabled) return 'auto';
      return state.dayNightOverride;
    },

    /**
     * Check if Debug Mode is enabled
     */
    isEnabled() {
      return state.enabled;
    },

    /**
     * Set Debug Mode enabled / disabled
     */
    setEnabled(enabled) {
      state.enabled = Boolean(enabled);
      if (!state.enabled) {
        this.resetAll();
      } else {
        this.showDebugBanner(true);
      }
      this.saveState();
      this.updateHudUi();
    },

    /**
     * Set Manual Simulated Date and Time
     */
    setSimulatedDateTime(year, month, day, hours, minutes, seconds = 0) {
      state.enabled = true;
      state.isSimulatedTime = true;
      const target = new Date(year, month - 1, day, hours, minutes, seconds, 0);
      state.simulatedEpochMs = target.getTime();
      state.lastRealMs = performance.now();
      this.showDebugBanner(true);
      this.saveState();
      this.updateHudUi();
    },

    /**
     * Jump to common celestial day-phase timestamps
     */
    jumpToPresetTime(preset) {
      state.enabled = true;
      state.isSimulatedTime = true;
      const current = this.now();
      const target = new Date(current);

      if (preset === 'dawn') {
        // 06:00:00 AM (Sunrise transition)
        target.setHours(6, 0, 0, 0);
      } else if (preset === 'noon') {
        // 12:00:00 PM (Solar apex)
        target.setHours(12, 0, 0, 0);
      } else if (preset === 'dusk') {
        // 18:00:00 PM (Sunset transition)
        target.setHours(18, 0, 0, 0);
      } else if (preset === 'midnight') {
        // 00:00:00 AM (Night apex)
        target.setHours(0, 0, 0, 0);
      }

      state.simulatedEpochMs = target.getTime();
      state.lastRealMs = performance.now();
      this.showDebugBanner(true);
      this.saveState();
      this.updateHudUi();
    },

    /**
     * Set Speed Multiplier (0 = Freeze, 1 = Realtime, 10, 60, 1440)
     */
    setSpeedMultiplier(mult) {
      state.enabled = true;
      if (!state.isSimulatedTime && mult !== 1) {
        state.isSimulatedTime = true;
        state.simulatedEpochMs = Date.now();
      }
      state.speedMultiplier = Number(mult);
      state.lastRealMs = performance.now();
      this.showDebugBanner(true);
      this.saveState();
      this.updateHudUi();
    },

    /**
     * Set Timezone Override
     */
    setTimezone(tz, customOffset = 0) {
      state.enabled = true;
      state.timezone = tz || 'auto';
      state.customUtcOffset = Number(customOffset) || 0;
      this.showDebugBanner(true);
      this.saveState();
      this.updateHudUi();
    },

    /**
     * Set Moon Phase Override (0.00 to 1.00, or null for auto)
     */
    setMoonPhaseOverride(phase) {
      state.enabled = true;
      if (phase === null || phase === undefined || phase === 'auto') {
        state.moonPhaseOverride = null;
      } else {
        state.moonPhaseOverride = Math.max(0, Math.min(1, Number(phase)));
      }
      this.showDebugBanner(true);
      this.saveState();
      this.updateHudUi();
    },

    /**
     * Set Day / Night Indicator Override
     */
    setDayNightOverride(mode) {
      state.enabled = true;
      state.dayNightOverride = mode || 'auto';
      this.showDebugBanner(true);
      this.saveState();
      this.updateHudUi();
    },

    /**
     * Reset all debug overrides back to real system time and live ephemeris
     */
    resetAll() {
      state.isSimulatedTime = false;
      state.speedMultiplier = 1;
      state.timezone = 'auto';
      state.customUtcOffset = 0;
      state.moonPhaseOverride = null;
      state.dayNightOverride = 'auto';
      state.simulatedEpochMs = Date.now();
      state.lastRealMs = performance.now();

      this.showDebugBanner(false);
      this.saveState();
      this.updateHudUi();
    },

    /**
     * Save debug settings to persistent storage
     */
    saveState() {
      if (window.StargazerStorage) {
        window.StargazerStorage.set('debugSettings', {
          enabled: state.enabled,
          isSimulatedTime: state.isSimulatedTime,
          simulatedDateTime: new Date(state.simulatedEpochMs).toISOString(),
          speedMultiplier: state.speedMultiplier,
          timezone: state.timezone,
          customUtcOffset: state.customUtcOffset,
          moonPhaseOverride: state.moonPhaseOverride,
          dayNightOverride: state.dayNightOverride
        });
      }
    },

    /**
     * Show or hide on-screen persistent banner indicating active simulation
     */
    showDebugBanner(show) {
      let banner = document.getElementById('stargazer-debug-banner');
      if (show) {
        if (!banner) {
          banner = document.createElement('div');
          banner.id = 'stargazer-debug-banner';
          banner.className = 'debug-active-banner';
          banner.innerHTML = `
            <span class="debug-badge-icon">🛠️</span>
            <span class="debug-badge-text">Debug Simulation Active</span>
            <button type="button" class="debug-banner-btn" id="btn-debug-open-hud" title="Open Debug Controls [D]">Controls</button>
            <button type="button" class="debug-banner-btn danger" id="btn-debug-quick-reset" title="Restore Live System Time">Reset Time</button>
          `;
          document.body.appendChild(banner);

          banner.querySelector('#btn-debug-open-hud').addEventListener('click', () => {
            this.toggleHud();
          });
          banner.querySelector('#btn-debug-quick-reset').addEventListener('click', () => {
            this.resetAll();
          });
        }
        banner.style.display = 'flex';
      } else {
        if (banner) {
          banner.style.display = 'none';
        }
      }
    },

    /**
     * Toggle Floating Debug HUD
     */
    toggleHud() {
      state.isHudVisible = !state.isHudVisible;
      const hud = document.getElementById('stargazer-debug-hud');
      if (hud) {
        hud.classList.toggle('visible', state.isHudVisible);
      }
      this.updateHudUi();
    },

    /**
     * Inject Floating Debug HUD into DOM
     */
    injectDebugHud() {
      if (document.getElementById('stargazer-debug-hud')) return;

      const hud = document.createElement('aside');
      hud.id = 'stargazer-debug-hud';
      hud.className = 'debug-floating-hud';
      hud.setAttribute('aria-label', 'Debug & Time Simulation Panel');

      hud.innerHTML = `
        <div class="debug-hud-header">
          <div class="debug-hud-title">
            <span>🛠️</span>
            <span>Debug & Time Warp</span>
          </div>
          <div class="debug-hud-actions">
            <button type="button" class="debug-btn-icon" id="debug-btn-hud-reset" title="Reset to Live Time">🔄 Reset</button>
            <button type="button" class="debug-btn-icon" id="debug-btn-hud-close" title="Close Debug HUD [D]">✕</button>
          </div>
        </div>

        <div class="debug-hud-body">
          <!-- Time & Speed Controls -->
          <div class="debug-hud-section">
            <div class="debug-hud-label">Time & Warp Multiplier</div>
            <div class="debug-time-readout" id="debug-hud-time-display">--:--:--</div>
            
            <div class="debug-speed-bar" role="group" aria-label="Simulation speed">
              <button type="button" class="debug-chip" data-speed="0" title="Freeze Time">⏸ 0x</button>
              <button type="button" class="debug-chip active" data-speed="1" title="Realtime">▶ 1x</button>
              <button type="button" class="debug-chip" data-speed="10" title="10x Speed">⏩ 10x</button>
              <button type="button" class="debug-chip" data-speed="60" title="1 Minute per second">🚀 60x</button>
              <button type="button" class="debug-chip" data-speed="1440" title="1 Day per minute">⚡ 1440x</button>
            </div>

            <div class="debug-presets-row">
              <button type="button" class="debug-preset-btn" data-time-preset="dawn">🌅 Dawn (06:00)</button>
              <button type="button" class="debug-preset-btn" data-time-preset="noon">☀️ Noon (12:00)</button>
              <button type="button" class="debug-preset-btn" data-time-preset="dusk">🌇 Dusk (18:00)</button>
              <button type="button" class="debug-preset-btn" data-time-preset="midnight">🌙 Midnight (00:00)</button>
            </div>

            <div class="debug-inputs-row">
              <input type="time" id="debug-input-time" step="1" class="debug-time-input">
              <input type="date" id="debug-input-date" class="debug-date-input">
              <button type="button" class="debug-btn-action" id="debug-btn-apply-time">Set Time</button>
            </div>
          </div>

          <!-- Timezone Override -->
          <div class="debug-hud-section">
            <div class="debug-hud-label">Timezone Override</div>
            <select id="debug-select-timezone" class="debug-select">
              <option value="auto">🌐 Local System Timezone</option>
              <option value="UTC">UTC / GMT (00:00)</option>
              <option value="America/New_York">New York (EDT/EST, UTC-4/5)</option>
              <option value="America/Chicago">Chicago (CDT/CST, UTC-5/6)</option>
              <option value="America/Denver">Denver (MDT/MST, UTC-6/7)</option>
              <option value="America/Los_Angeles">Los Angeles (PDT/PST, UTC-7/8)</option>
              <option value="Europe/London">London (BST/GMT, UTC+1/0)</option>
              <option value="Europe/Paris">Paris / Berlin (CEST/CET, UTC+2/1)</option>
              <option value="Asia/Tokyo">Tokyo (JST, UTC+9)</option>
              <option value="Asia/Shanghai">Beijing / Shanghai (CST, UTC+8)</option>
              <option value="Asia/Kolkata">India (IST, UTC+5:30)</option>
              <option value="Australia/Sydney">Sydney (AEST/AEDT, UTC+10/11)</option>
              <option value="custom">Custom Offset (hours)</option>
            </select>
            <div id="debug-custom-offset-wrap" style="display: none; margin-top: 4px;">
              <input type="number" id="debug-custom-offset" min="-12" max="14" step="0.5" value="0" placeholder="Offset hours (e.g. -5)">
            </div>
          </div>

          <!-- Moon Phase / Stage Override -->
          <div class="debug-hud-section">
            <div class="debug-hud-label">
              <span>Moon Stage Override</span>
              <span class="debug-value-text" id="debug-moon-phase-text">Auto (Live Ephemeris)</span>
            </div>
            
            <div class="debug-slider-wrap">
              <input type="range" id="debug-moon-slider" min="0" max="100" value="50" class="debug-slider">
            </div>

            <div class="debug-moon-chips">
              <button type="button" class="debug-moon-chip" data-phase="0.00" title="New Moon">🌑 New</button>
              <button type="button" class="debug-moon-chip" data-phase="0.15" title="Waxing Crescent">🌒 Wax.Cres</button>
              <button type="button" class="debug-moon-chip" data-phase="0.25" title="First Quarter">🌓 1st Qtr</button>
              <button type="button" class="debug-moon-chip" data-phase="0.38" title="Waxing Gibbous">🌔 Wax.Gib</button>
              <button type="button" class="debug-moon-chip" data-phase="0.50" title="Full Moon">🌕 Full</button>
              <button type="button" class="debug-moon-chip" data-phase="0.65" title="Waning Gibbous">🌖 Wan.Gib</button>
              <button type="button" class="debug-moon-chip" data-phase="0.75" title="Last Quarter">🌗 Last Qtr</button>
              <button type="button" class="debug-moon-chip" data-phase="0.88" title="Waning Crescent">🌘 Wan.Cres</button>
              <button type="button" class="debug-moon-chip" data-phase="auto" title="Auto Ephemeris">🔄 Auto</button>
            </div>
          </div>

          <!-- Day / Night Force Mode -->
          <div class="debug-hud-section">
            <div class="debug-hud-label">Celestial Pointer Force</div>
            <div class="debug-seg-group">
              <button type="button" class="debug-seg-btn active" data-daynight="auto">Auto (Clock)</button>
              <button type="button" class="debug-seg-btn" data-daynight="day">☀️ Force Sun</button>
              <button type="button" class="debug-seg-btn" data-daynight="night">🌙 Force Moon</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(hud);
    },

    /**
     * Bind click and change events inside Debug HUD
     */
    bindHudEvents() {
      const hud = document.getElementById('stargazer-debug-hud');
      if (!hud) return;

      // Close button
      hud.querySelector('#debug-btn-hud-close').addEventListener('click', () => {
        this.toggleHud();
      });

      // Reset button
      hud.querySelector('#debug-btn-hud-reset').addEventListener('click', () => {
        this.resetAll();
      });

      // Speed Chips
      const speedChips = hud.querySelectorAll('[data-speed]');
      speedChips.forEach(chip => {
        chip.addEventListener('click', () => {
          speedChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          this.setSpeedMultiplier(Number(chip.dataset.speed));
        });
      });

      // Time Presets
      const presetButtons = hud.querySelectorAll('[data-time-preset]');
      presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          this.jumpToPresetTime(btn.dataset.timePreset);
        });
      });

      // Manual Time Apply
      hud.querySelector('#debug-btn-apply-time').addEventListener('click', () => {
        const timeInput = hud.querySelector('#debug-input-time').value;
        const dateInput = hud.querySelector('#debug-input-date').value;
        if (timeInput) {
          const [h, m, s] = timeInput.split(':').map(Number);
          const current = this.now();
          let y = current.getFullYear();
          let mon = current.getMonth() + 1;
          let d = current.getDate();

          if (dateInput) {
            const [dy, dm, dd] = dateInput.split('-').map(Number);
            y = dy;
            mon = dm;
            d = dd;
          }
          this.setSimulatedDateTime(y, mon, d, h, m, s || 0);
        }
      });

      // Timezone Dropdown
      const tzSelect = hud.querySelector('#debug-select-timezone');
      const customOffsetWrap = hud.querySelector('#debug-custom-offset-wrap');
      const customOffsetInput = hud.querySelector('#debug-custom-offset');

      tzSelect.addEventListener('change', () => {
        const val = tzSelect.value;
        customOffsetWrap.style.display = val === 'custom' ? 'block' : 'none';
        this.setTimezone(val, Number(customOffsetInput.value));
      });

      customOffsetInput.addEventListener('change', () => {
        if (tzSelect.value === 'custom') {
          this.setTimezone('custom', Number(customOffsetInput.value));
        }
      });

      // Moon Phase Slider
      const moonSlider = hud.querySelector('#debug-moon-slider');
      moonSlider.addEventListener('input', () => {
        const phaseVal = Number(moonSlider.value) / 100;
        this.setMoonPhaseOverride(phaseVal);
      });

      // Moon Preset Chips
      const moonChips = hud.querySelectorAll('[data-phase]');
      moonChips.forEach(chip => {
        chip.addEventListener('click', () => {
          const phase = chip.dataset.phase;
          this.setMoonPhaseOverride(phase === 'auto' ? null : Number(phase));
        });
      });

      // Day / Night Seg Buttons
      const dnButtons = hud.querySelectorAll('[data-daynight]');
      dnButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          dnButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.setDayNightOverride(btn.dataset.daynight);
        });
      });
    },

    /**
     * Update HUD UI values to match current state
     */
    updateHudUi() {
      const hud = document.getElementById('stargazer-debug-hud');
      if (!hud) return;

      // Update Time Display
      const timeDisplay = hud.querySelector('#debug-hud-time-display');
      if (timeDisplay) {
        const now = this.now();
        const timeStr = now.toLocaleTimeString(undefined, { hour12: false });
        const dateStr = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        const tzStr = state.timezone !== 'auto' ? ` (${state.timezone})` : '';
        const speedStr = state.speedMultiplier !== 1 ? ` • ${state.speedMultiplier}x speed` : '';
        timeDisplay.textContent = `${timeStr} • ${dateStr}${tzStr}${speedStr}`;
      }

      // Update speed chips active state
      const speedChips = hud.querySelectorAll('[data-speed]');
      speedChips.forEach(c => {
        c.classList.toggle('active', Number(c.dataset.speed) === state.speedMultiplier);
      });

      // Update Timezone Select
      const tzSelect = hud.querySelector('#debug-select-timezone');
      if (tzSelect) tzSelect.value = state.timezone;

      // Update Moon text and slider
      const moonText = hud.querySelector('#debug-moon-phase-text');
      const moonSlider = hud.querySelector('#debug-moon-slider');
      if (state.moonPhaseOverride !== null && state.moonPhaseOverride !== undefined) {
        const pct = Math.round(state.moonPhaseOverride * 100);
        if (moonText) moonText.textContent = `Manual: ${pct}% Phase`;
        if (moonSlider) moonSlider.value = pct;
      } else {
        if (moonText) moonText.textContent = 'Auto (Live Ephemeris)';
      }

      // Update Day / Night button
      const dnButtons = hud.querySelectorAll('[data-daynight]');
      dnButtons.forEach(b => {
        b.classList.toggle('active', b.dataset.daynight === state.dayNightOverride);
      });
    }
  };

  // Expose globally
  window.StargazerDebug = Debug;
  window.StargazerTime = Debug;

})(window);
