/**
 * Stargazer Clock - Pop Out & Always-on-Top Pinned Window Engine
 * Enables popping out the active clock/timer into a floating, compact window
 * using Document Picture-in-Picture (Chromium/Edge native OS Topmost)
 * with seamless fallback to standalone popup windows and Windows API pinning.
 */

(function (window) {
  'use strict';

  // Popout Manager State
  const state = {
    isOpen: false,
    isPinned: true, // PiP windows are topmost by OS default
    pipWindow: null,
    dialPopout: null,
    activeMode: 'clock',
    lastProgress: 0,
    lastUpdateMs: 0
  };

  const Popout = {
    /**
     * Check if Document Picture-in-Picture is supported
     */
    isPipSupported() {
      return Boolean(window.documentPictureInPicture && typeof window.documentPictureInPicture.requestWindow === 'function');
    },

    /**
     * Is the popout window currently active
     */
    isPopoutOpen() {
      return state.isOpen && state.pipWindow && !state.pipWindow.closed;
    },

    /**
     * Toggle Pop Out window open / close
     */
    async toggle() {
      if (this.isPopoutOpen()) {
        this.close();
      } else {
        await this.open();
      }
    },

    /**
     * Open Pop Out Window
     */
    async open(preferredMode) {
      if (this.isPopoutOpen()) {
        try {
          state.pipWindow.focus();
        } catch (e) {}
        return;
      }

      state.activeMode = preferredMode || (window.StargazerApp ? window.StargazerApp.getActiveMode() : 'clock');

      if (this.isPipSupported()) {
        await this.openDocumentPip();
      } else {
        this.openFallbackWindow();
      }
    },

    /**
     * Open native Document Picture-in-Picture (OS Always-on-Top)
     */
    async openDocumentPip() {
      try {
        const pipOptions = {
          width: 380,
          height: 480,
          disallowReturnToOpener: false
        };

        const pipWin = await window.documentPictureInPicture.requestWindow(pipOptions);
        state.pipWindow = pipWin;
        state.isOpen = true;
        state.isPinned = true;

        // Copy styles and fonts from main window into PiP window
        this.injectStylesToPip(pipWin);

        // Render Popout HTML structure
        this.renderPipContent(pipWin);

        // Bind events in PiP window
        this.bindPipEvents(pipWin);

        // Initialize Semicircle Dial inside PiP window
        const canvas = pipWin.document.getElementById('dial-canvas-popout');
        if (canvas && window.SemicircleDial) {
          state.dialPopout = new window.SemicircleDial(canvas, {
            radiusScale: 0.88,
            lineWidth: 18,
            trackWidth: 10,
            showTicks: true,
            tickCount: 24,
            needleLength: 0.90,
            showGlow: true
          });
          state.dialPopout.init();
        }

        // Handle PiP window close
        pipWin.addEventListener('pagehide', () => {
          this.handlePipClosed();
        });

        // Update button state in main window
        this.updateMainUiButton(true);

        // Automatically pin via Windows API if running in desktop executable
        this.callPinApi(true);

      } catch (err) {
        console.warn('Document Picture-in-Picture open failed, falling back to popup window:', err);
        this.openFallbackWindow();
      }
    },

    /**
     * Open standard Popup Window as fallback
     */
    openFallbackWindow() {
      const w = 380;
      const h = 480;
      const left = window.screenLeft !== undefined ? window.screenLeft + (window.outerWidth - w) : 100;
      const top = window.screenTop !== undefined ? window.screenTop + 50 : 100;

      const url = `index.html?popout=true&mode=${encodeURIComponent(state.activeMode)}`;
      const features = `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=no,status=no,toolbar=no,menubar=no,location=no`;

      const popup = window.open(url, 'StargazerPopout', features);
      if (popup) {
        state.pipWindow = popup;
        state.isOpen = true;
        this.updateMainUiButton(true);
        this.callPinApi(true);
      } else {
        alert('Popup blocked. Please allow popups for Stargazer Clock to use the floating clock.');
      }
    },

    /**
     * Close Pop Out Window
     */
    close() {
      if (state.pipWindow && !state.pipWindow.closed) {
        try {
          state.pipWindow.close();
        } catch (e) {}
      }
      this.handlePipClosed();
    },

    /**
     * Handle cleanup when Popout window closes
     */
    handlePipClosed() {
      state.isOpen = false;
      state.pipWindow = null;
      if (state.dialPopout) {
        try {
          state.dialPopout.destroy();
        } catch (e) {}
        state.dialPopout = null;
      }
      this.updateMainUiButton(false);
      this.callPinApi(false);
    },

    /**
     * Copy stylesheets, themes, and Google fonts into PiP window
     */
    injectStylesToPip(pipWin) {
      const doc = pipWin.document;
      doc.title = 'Stargazer Clock (Pinned)';

      // Copy theme attribute
      const activeTheme = document.body.getAttribute('data-theme') || 'cyan';
      doc.body.setAttribute('data-theme', activeTheme);
      doc.body.className = 'popout-window-body';

      // Copy font links and style tags
      const headNodes = document.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"], style');
      headNodes.forEach(node => {
        try {
          if (node.tagName === 'STYLE') {
            const style = doc.createElement('style');
            style.textContent = node.textContent;
            doc.head.appendChild(style);
          } else if (node.tagName === 'LINK') {
            const link = doc.createElement('link');
            link.rel = node.rel;
            link.href = node.href;
            if (node.crossOrigin) link.crossOrigin = node.crossOrigin;
            doc.head.appendChild(link);
          }
        } catch (e) {
          console.warn('Failed to copy stylesheet to PiP window:', e);
        }
      });

      // Inject explicit compact popout styles
      const customStyle = doc.createElement('style');
      customStyle.textContent = `
        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: var(--bg-deep-space, #060713);
          color: var(--text-main, #f0f4fc);
          font-family: var(--font-sans, -apple-system, sans-serif);
          user-select: none;
        }
        .popout-container {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          padding: 10px 14px 14px 14px;
          box-sizing: border-box;
          background: radial-gradient(circle at 50% 25%, #101538 0%, #080918 60%, #03040b 100%);
        }
        .popout-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 6px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          gap: 6px;
        }
        .popout-modes {
          display: flex;
          gap: 4px;
        }
        .popout-mode-chip {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-muted, #8b9bb4);
          font-size: 0.72rem;
          padding: 4px 8px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s ease;
        }
        .popout-mode-chip.active {
          background: var(--primary-color-dim, rgba(0, 242, 254, 0.2));
          border-color: var(--primary-color, #00f2fe);
          color: var(--text-main, #fff);
          font-weight: 600;
        }
        .popout-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .popout-pin-btn {
          background: rgba(0, 242, 254, 0.12);
          border: 1px solid var(--primary-color, #00f2fe);
          color: var(--primary-color, #00f2fe);
          font-size: 0.72rem;
          padding: 4px 8px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .popout-pin-btn.unpinned {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.2);
          color: var(--text-muted, #8b9bb4);
        }
        .popout-dock-btn {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: var(--text-muted, #8b9bb4);
          font-size: 0.75rem;
          padding: 4px 7px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .popout-dock-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .popout-dial-area {
          position: relative;
          width: 100%;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 190px;
        }
        .popout-canvas {
          width: 100%;
          height: 100%;
          display: block;
        }
        .popout-center-content {
          position: absolute;
          bottom: 14%;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          cursor: pointer;
          width: 90%;
        }
        .popout-badge {
          font-size: 0.65rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-dim, #54647e);
          margin-bottom: 2px;
        }
        .popout-digits {
          font-size: 2.1rem;
          font-family: var(--font-mono, monospace);
          font-weight: 700;
          color: var(--text-main, #fff);
          text-shadow: 0 0 16px var(--primary-glow, rgba(0, 242, 254, 0.4));
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
        .popout-subtext {
          font-size: 0.75rem;
          color: var(--text-muted, #8b9bb4);
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .popout-swap-hint {
          font-size: 0.62rem;
          color: var(--text-dim, #54647e);
          opacity: 0.8;
          margin-top: 2px;
        }
        .popout-controls {
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 40px;
        }
        .popout-btn-action {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: var(--text-main, #fff);
          font-size: 0.78rem;
          padding: 6px 14px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .popout-btn-action.primary {
          background: var(--primary-color, #00f2fe);
          border-color: var(--primary-color, #00f2fe);
          color: #03040b;
          font-weight: 600;
        }
        .popout-btn-action:hover {
          filter: brightness(1.15);
        }
        .popout-btn-chip {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-muted, #8b9bb4);
          font-size: 0.7rem;
          padding: 4px 8px;
          border-radius: 6px;
          cursor: pointer;
        }
        .popout-btn-chip.active {
          background: var(--primary-color-dim, rgba(0, 242, 254, 0.2));
          border-color: var(--primary-color, #00f2fe);
          color: #fff;
        }
      `;
      doc.head.appendChild(customStyle);
    },

    /**
     * Render the Popout UI template inside PiP
     */
    renderPipContent(pipWin) {
      const doc = pipWin.document;
      doc.body.innerHTML = `
        <div class="popout-container">
          <header class="popout-header">
            <div class="popout-modes" role="group" aria-label="Popout Modes">
              <button type="button" class="popout-mode-chip active" data-popout-mode="clock" title="Standard Clock">🕐 Clock</button>
              <button type="button" class="popout-mode-chip" data-popout-mode="shift" title="Shift Tracker">📊 Shift</button>
              <button type="button" class="popout-mode-chip" data-popout-mode="timer" title="Timer">⏳ Timer</button>
              <button type="button" class="popout-mode-chip" data-popout-mode="stopwatch" title="Stopwatch">⏱️ Lap</button>
            </div>
            <div class="popout-actions">
              <button type="button" class="popout-pin-btn" id="popout-pin-toggle" title="Pinned as Top Window (Always on Top)">
                <span>📌</span>
                <span id="popout-pin-label">Pinned</span>
              </button>
              <button type="button" class="popout-dock-btn" id="popout-btn-dock" title="Dock back into main window">
                <span>⤵ Dock</span>
              </button>
            </div>
          </header>

          <main class="popout-dial-area">
            <canvas id="dial-canvas-popout" class="popout-canvas"></canvas>
            <div class="popout-center-content" id="popout-center-click" title="Click to swap Time / Left / %">
              <span class="popout-badge" id="popout-badge">CURRENT TIME</span>
              <span class="popout-digits" id="popout-digits">12:00:00</span>
              <span class="popout-subtext" id="popout-subtext">Day: 50.0%</span>
              <span class="popout-swap-hint">⇄ Click to swap</span>
            </div>
          </main>

          <footer class="popout-controls" id="popout-controls-row">
            <!-- Dynamic controls populated based on mode -->
          </footer>
        </div>
      `;
    },

    /**
     * Bind click and interaction events in the PiP window
     */
    bindPipEvents(pipWin) {
      const doc = pipWin.document;

      // Mode Switcher Chips
      const modeChips = doc.querySelectorAll('[data-popout-mode]');
      modeChips.forEach(chip => {
        chip.addEventListener('click', () => {
          const mode = chip.dataset.popoutMode;
          this.setPopoutMode(mode);
          if (window.StargazerApp) {
            window.StargazerApp.setMode(mode);
          }
        });
      });

      // Pin Toggle
      const pinBtn = doc.getElementById('popout-pin-toggle');
      if (pinBtn) {
        pinBtn.addEventListener('click', () => {
          this.togglePin();
        });
      }

      // Dock Back button
      const dockBtn = doc.getElementById('popout-btn-dock');
      if (dockBtn) {
        dockBtn.addEventListener('click', () => {
          this.close();
          window.focus();
        });
      }

      // Center Display 1-Click Swapping
      const centerArea = doc.getElementById('popout-center-click');
      if (centerArea) {
        centerArea.addEventListener('click', () => {
          if (window.StargazerApp) {
            if (state.activeMode === 'clock') window.StargazerApp.cycleClockCenter();
            else if (state.activeMode === 'shift') window.StargazerApp.cycleShiftCenter();
            else if (state.activeMode === 'timer') window.StargazerApp.cycleTimerCenter();
          }
        });
      }

      this.updatePopoutControls(doc);
    },

    /**
     * Switch Popout Mode
     */
    setPopoutMode(mode) {
      state.activeMode = mode;
      if (state.pipWindow && !state.pipWindow.closed) {
        const doc = state.pipWindow.document;
        const chips = doc.querySelectorAll('[data-popout-mode]');
        chips.forEach(c => {
          c.classList.toggle('active', c.dataset.popoutMode === mode);
        });
        this.updatePopoutControls(doc);
      }
    },

    /**
     * Update dynamic mini controls row in Popout based on active mode
     */
    updatePopoutControls(doc) {
      const row = doc.getElementById('popout-controls-row');
      if (!row) return;

      const mode = state.activeMode;
      row.innerHTML = '';

      if (mode === 'clock') {
        const btnDay = doc.createElement('button');
        btnDay.className = 'popout-btn-chip';
        btnDay.textContent = 'Day 24h';
        btnDay.onclick = () => window.StargazerApp && window.StargazerApp.setClockArc('day');

        const btnHour = doc.createElement('button');
        btnHour.className = 'popout-btn-chip';
        btnHour.textContent = 'Hour 60m';
        btnHour.onclick = () => window.StargazerApp && window.StargazerApp.setClockArc('hour');

        const btn12 = doc.createElement('button');
        btn12.className = 'popout-btn-chip';
        btn12.textContent = '12h Cycle';
        btn12.onclick = () => window.StargazerApp && window.StargazerApp.setClockArc('halfday');

        row.appendChild(btnDay);
        row.appendChild(btnHour);
        row.appendChild(btn12);

      } else if (mode === 'timer') {
        const isRunning = window.StargazerApp ? window.StargazerApp.isTimerRunning() : false;

        const btnToggle = doc.createElement('button');
        btnToggle.className = 'popout-btn-action primary';
        btnToggle.id = 'popout-btn-timer-toggle';
        btnToggle.textContent = isRunning ? '⏸ Pause' : '▶ Start';
        btnToggle.onclick = () => {
          if (window.StargazerApp) {
            window.StargazerApp.toggleTimer();
            this.updatePopoutControls(doc);
          }
        };

        const btnReset = doc.createElement('button');
        btnReset.className = 'popout-btn-action';
        btnReset.textContent = '🔄 Reset';
        btnReset.onclick = () => {
          if (window.StargazerApp) {
            window.StargazerApp.resetTimer();
            this.updatePopoutControls(doc);
          }
        };

        row.appendChild(btnToggle);
        row.appendChild(btnReset);

      } else if (mode === 'stopwatch') {
        const isRunning = window.StargazerApp ? window.StargazerApp.isStopwatchRunning() : false;

        const btnToggle = doc.createElement('button');
        btnToggle.className = 'popout-btn-action primary';
        btnToggle.id = 'popout-btn-sw-toggle';
        btnToggle.textContent = isRunning ? '⏸ Pause' : '▶ Start';
        btnToggle.onclick = () => {
          if (window.StargazerApp) {
            window.StargazerApp.toggleStopwatch();
            this.updatePopoutControls(doc);
          }
        };

        const btnLap = doc.createElement('button');
        btnLap.className = 'popout-btn-action';
        btnLap.textContent = '🏁 Lap';
        btnLap.onclick = () => window.StargazerApp && window.StargazerApp.recordLap();

        const btnReset = doc.createElement('button');
        btnReset.className = 'popout-btn-action';
        btnReset.textContent = '🔄 Reset';
        btnReset.onclick = () => {
          if (window.StargazerApp) {
            window.StargazerApp.resetStopwatch();
            this.updatePopoutControls(doc);
          }
        };

        row.appendChild(btnToggle);
        row.appendChild(btnLap);
        row.appendChild(btnReset);

      } else if (mode === 'shift') {
        const info = doc.createElement('span');
        info.className = 'popout-subtext';
        info.id = 'popout-shift-mini-status';
        info.textContent = 'Shift tracking active';
        row.appendChild(info);
      }
    },

    /**
     * Toggle Pin / Always on Top
     */
    togglePin() {
      state.isPinned = !state.isPinned;
      this.callPinApi(state.isPinned);

      if (state.pipWindow && !state.pipWindow.closed) {
        const pinBtn = state.pipWindow.document.getElementById('popout-pin-toggle');
        const pinLabel = state.pipWindow.document.getElementById('popout-pin-label');
        if (pinBtn && pinLabel) {
          pinBtn.classList.toggle('unpinned', !state.isPinned);
          pinLabel.textContent = state.isPinned ? 'Pinned' : 'Pin';
          pinBtn.title = state.isPinned ? 'Pinned as Top Window (Always on Top)' : 'Click to pin window on top';
        }
      }
    },

    /**
     * Call the desktop launcher /api/pin HTTP endpoint to toggle HWND_TOPMOST
     */
    callPinApi(pinState) {
      try {
        fetch(`/api/pin?state=${pinState ? 1 : 0}&title=Stargazer`, { method: 'GET' })
          .catch(() => {
            // Static/browser environment without local desktop launcher server - perfectly fine!
          });
      } catch (e) {}
    },

    /**
     * Update Pop Out toggle button in main UI
     */
    updateMainUiButton(active) {
      const btn = document.getElementById('btn-popout');
      if (btn) {
        btn.classList.toggle('active', active);
        btn.title = active ? 'Pop In Clock Window (Dock) [P]' : 'Pop Out Clock (Always on Top Window) [P]';
      }
    },

    /**
     * Tick loop called by main application orchestrator (every 100ms)
     */
    tick(appState, elements) {
      if (!this.isPopoutOpen()) return;

      const pipWin = state.pipWindow;
      const doc = pipWin.document;
      const now = new Date();

      const badgeElem = doc.getElementById('popout-badge');
      const digitsElem = doc.getElementById('popout-digits');
      const subtextElem = doc.getElementById('popout-subtext');

      let progress = 0;
      let badge = '';
      let digits = '';
      let subtext = '';

      const mode = state.activeMode;

      if (mode === 'clock') {
        progress = elements.dialClock ? elements.dialClock.currentProgress : 0;
        badge = elements.clockModeLabel ? elements.clockModeLabel.textContent : 'CURRENT TIME';
        digits = elements.clockDigitalTime ? elements.clockDigitalTime.textContent : '--:--:--';
        subtext = elements.clockArcLabel ? elements.clockArcLabel.textContent : '';

      } else if (mode === 'shift') {
        progress = elements.dialShift ? elements.dialShift.currentProgress : 0;
        badge = elements.shiftNameLabel ? elements.shiftNameLabel.textContent : 'SHIFT TRACKER';
        digits = elements.shiftPercent ? elements.shiftPercent.textContent : '0%';
        subtext = elements.shiftRemaining ? `${elements.shiftRemaining.textContent} left` : '';

      } else if (mode === 'timer') {
        progress = elements.dialTimer ? elements.dialTimer.currentProgress : 0;
        badge = elements.timerTitleBadge ? elements.timerTitleBadge.textContent : 'COUNTDOWN TIMER';
        digits = elements.timerDisplay ? elements.timerDisplay.textContent : '00:00';
        subtext = elements.timerSubText ? elements.timerSubText.textContent : '';

        // Keep timer toggle button text in sync
        const timerBtn = doc.getElementById('popout-btn-timer-toggle');
        if (timerBtn && appState.timer) {
          timerBtn.textContent = appState.timer.isRunning ? '⏸ Pause' : '▶ Start';
        }

      } else if (mode === 'stopwatch') {
        progress = elements.dialStopwatch ? elements.dialStopwatch.currentProgress : 0;
        badge = 'STOPWATCH';
        digits = elements.stopwatchDisplay ? elements.stopwatchDisplay.textContent : '00:00.00';
        subtext = elements.stopwatchLapCount ? elements.stopwatchLapCount.textContent : '';

        const swBtn = doc.getElementById('popout-btn-sw-toggle');
        if (swBtn && appState.stopwatch) {
          swBtn.textContent = appState.stopwatch.isRunning ? '⏸ Pause' : '▶ Start';
        }
      }

      if (badgeElem && badge) badgeElem.textContent = badge;
      if (digitsElem && digits) digitsElem.textContent = digits;
      if (subtextElem && subtext) subtextElem.textContent = subtext;

      // Update Semicircle Dial
      if (state.dialPopout) {
        state.dialPopout.setProgress(progress, false, now);
      }
    }
  };

  // Expose globally
  window.StargazerPopout = Popout;

})(window);
