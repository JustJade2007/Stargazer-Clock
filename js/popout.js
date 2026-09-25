/**
 * Stargazer Clock - Compact Pop Out & Always-on-Top Pinned Window Engine
 * Provides an ultra-compact floating desktop clock with:
 * - Option to show Semicircle dial or Just Text / numbers
 * - Compact default sizing with essential controls
 * - True OS-level Always-on-Top pinning across apps via Document PiP and Windows API
 */

(function (window) {
  'use strict';

  // Popout Manager State
  const state = {
    isOpen: false,
    isPinned: true,
    viewMode: 'dial', // 'dial' (semicircle + text) or 'text' (just numbers/text)
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
     * Get current view mode ('dial' or 'text')
     */
    getViewMode() {
      return state.viewMode;
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
      
      // Load saved view mode ('dial' or 'text')
      if (window.StargazerStorage) {
        state.viewMode = window.StargazerStorage.get('popoutViewMode') || 'dial';
      }

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
        const isText = state.viewMode === 'text';
        const pipOptions = {
          width: 270,
          height: isText ? 135 : 230,
          disallowReturnToOpener: false
        };

        const pipWin = await window.documentPictureInPicture.requestWindow(pipOptions);
        state.pipWindow = pipWin;
        state.isOpen = true;
        state.isPinned = true;

        // Copy styles, fonts, and theme from main window
        this.injectStylesToPip(pipWin);

        // Render compact popout UI structure
        this.renderPipContent(pipWin);

        // Bind events in PiP window
        this.bindPipEvents(pipWin);

        // Initialize Semicircle Dial if in dial mode
        this.initPipDial(pipWin);

        // Handle PiP window close
        pipWin.addEventListener('pagehide', () => {
          this.handlePipClosed();
        });

        // Update main window button
        this.updateMainUiButton(true);

        // Call desktop launcher pin API to reinforce OS-level topmost
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
      const isText = state.viewMode === 'text';
      const w = 270;
      const h = isText ? 135 : 230;
      const left = window.screenLeft !== undefined ? window.screenLeft + (window.outerWidth - w - 20) : 100;
      const top = window.screenTop !== undefined ? window.screenTop + 60 : 100;

      const url = `index.html?popout=true&mode=${encodeURIComponent(state.activeMode)}&view=${state.viewMode}`;
      const features = `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=no,status=no,toolbar=no,menubar=no,location=no`;

      const popup = window.open(url, 'StargazerPopout', features);
      if (popup) {
        state.pipWindow = popup;
        state.isOpen = true;
        state.isPinned = true;
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
     * Initialize Semicircle Dial inside PiP
     */
    initPipDial(pipWin) {
      const canvas = pipWin.document.getElementById('dial-canvas-popout');
      if (canvas && window.SemicircleDial) {
        state.dialPopout = new window.SemicircleDial(canvas, {
          radiusScale: 0.88,
          lineWidth: 14,
          trackWidth: 8,
          showTicks: true,
          tickCount: 20,
          needleLength: 0.88,
          showGlow: true
        });
        state.dialPopout.init();
      }
    },

    /**
     * Copy stylesheets, themes, and Google fonts into PiP window
     */
    injectStylesToPip(pipWin) {
      const doc = pipWin.document;
      doc.title = 'Stargazer Popout (Pinned)';

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

      // Compact Popout Styling
      const customStyle = doc.createElement('style');
      customStyle.textContent = `
        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: #060713;
          color: var(--text-main, #f0f4fc);
          font-family: var(--font-sans, -apple-system, sans-serif);
          user-select: none;
        }
        .popout-container {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          padding: 6px 10px 8px 10px;
          box-sizing: border-box;
          background: radial-gradient(circle at 50% 25%, #101538 0%, #080918 65%, #03040b 100%);
          transition: all 0.2s ease;
        }
        
        /* Header */
        .popout-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 4px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          gap: 4px;
          height: 24px;
          flex-shrink: 0;
        }
        .popout-modes {
          display: flex;
          gap: 2px;
        }
        .popout-mode-chip {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-muted, #8b9bb4);
          font-size: 0.72rem;
          padding: 2px 5px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.15s ease;
        }
        .popout-mode-chip.active {
          background: var(--primary-color-dim, rgba(0, 242, 254, 0.2));
          border-color: var(--primary-color, #00f2fe);
          color: #fff;
        }
        .popout-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .popout-icon-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: var(--text-muted, #8b9bb4);
          font-size: 0.72rem;
          padding: 2px 6px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 3px;
          font-weight: 500;
          transition: all 0.15s;
        }
        .popout-icon-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
        }
        .popout-icon-btn.active {
          background: rgba(0, 242, 254, 0.18);
          border-color: var(--primary-color, #00f2fe);
          color: var(--primary-color, #00f2fe);
          box-shadow: 0 0 8px var(--primary-glow, rgba(0, 242, 254, 0.3));
        }

        /* Center Body */
        .popout-body {
          position: relative;
          width: 100%;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .popout-canvas {
          width: 100%;
          height: 100%;
          display: block;
        }
        .popout-center-content {
          position: absolute;
          bottom: 12%;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          cursor: pointer;
          width: 95%;
        }
        .popout-badge {
          font-size: 0.6rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-dim, #54647e);
          margin-bottom: 1px;
        }
        .popout-digits {
          font-size: 1.85rem;
          font-family: var(--font-mono, monospace);
          font-weight: 700;
          color: var(--text-main, #fff);
          text-shadow: 0 0 14px var(--primary-glow, rgba(0, 242, 254, 0.4));
          letter-spacing: -0.02em;
          line-height: 1.05;
        }
        .popout-subtext {
          font-size: 0.68rem;
          color: var(--text-muted, #8b9bb4);
          margin-top: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        /* Text-Only Mode Styles */
        .popout-container.mode-text-only .popout-canvas {
          display: none !important;
        }
        .popout-container.mode-text-only .popout-center-content {
          position: relative;
          bottom: auto;
          left: auto;
          transform: none;
          padding: 4px 0;
          width: 100%;
        }
        .popout-container.mode-text-only .popout-digits {
          font-size: 2.3rem;
        }
        .popout-container.mode-text-only .popout-subtext {
          font-size: 0.75rem;
          margin-top: 2px;
        }

        /* Footer Controls */
        .popout-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding-top: 4px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          height: 26px;
          flex-shrink: 0;
        }
        .popout-btn-action {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: var(--text-main, #fff);
          font-size: 0.72rem;
          padding: 2px 10px;
          border-radius: 5px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 500;
          transition: all 0.15s;
        }
        .popout-btn-action.primary {
          background: var(--primary-color, #00f2fe);
          border-color: var(--primary-color, #00f2fe);
          color: #03040b;
          font-weight: 600;
        }
        .popout-btn-chip {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-muted, #8b9bb4);
          font-size: 0.68rem;
          padding: 2px 6px;
          border-radius: 4px;
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
      const isText = state.viewMode === 'text';

      doc.body.innerHTML = `
        <div class="popout-container ${isText ? 'mode-text-only' : ''}" id="popout-container">
          <header class="popout-header">
            <div class="popout-modes" role="group" aria-label="Popout Modes">
              <button type="button" class="popout-mode-chip active" data-popout-mode="clock" title="Standard Clock">🕐</button>
              <button type="button" class="popout-mode-chip" data-popout-mode="shift" title="Shift Tracker">📊</button>
              <button type="button" class="popout-mode-chip" data-popout-mode="timer" title="Countdown Timer">⏳</button>
              <button type="button" class="popout-mode-chip" data-popout-mode="stopwatch" title="Precision Stopwatch">⏱️</button>
            </div>
            <div class="popout-actions">
              <button type="button" class="popout-icon-btn ${isText ? 'active' : ''}" id="popout-btn-view-toggle" title="Toggle between Semicircle and Just Text">
                <span id="popout-view-icon">${isText ? '⌒' : '𝐓'}</span>
                <span id="popout-view-label">${isText ? 'Dial' : 'Text'}</span>
              </button>
              <button type="button" class="popout-icon-btn active" id="popout-pin-toggle" title="Pinned as Top Window (Always on Top)">
                <span id="popout-pin-icon">📌</span>
              </button>
              <button type="button" class="popout-icon-btn" id="popout-btn-dock" title="Dock back into main window">
                <span>✕</span>
              </button>
            </div>
          </header>

          <main class="popout-body">
            <canvas id="dial-canvas-popout" class="popout-canvas"></canvas>
            <div class="popout-center-content" id="popout-center-click" title="Click to swap Time / Left / %">
              <span class="popout-badge" id="popout-badge">CURRENT TIME</span>
              <span class="popout-digits" id="popout-digits">12:00:00</span>
              <span class="popout-subtext" id="popout-subtext">Day: 50.0%</span>
            </div>
          </main>

          <footer class="popout-footer" id="popout-controls-row">
            <!-- Dynamic compact controls populated based on mode -->
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

      // View Mode Toggle (Semicircle vs Just Text)
      const viewBtn = doc.getElementById('popout-btn-view-toggle');
      if (viewBtn) {
        viewBtn.addEventListener('click', () => {
          this.toggleViewMode();
        });
      }

      // Pin Toggle
      const pinBtn = doc.getElementById('popout-pin-toggle');
      if (pinBtn) {
        pinBtn.addEventListener('click', () => {
          this.togglePin();
        });
      }

      // Dock / Close button
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
     * Toggle View Mode between Semicircle and Just Text
     */
    toggleViewMode() {
      state.viewMode = state.viewMode === 'dial' ? 'text' : 'dial';
      if (window.StargazerStorage) {
        window.StargazerStorage.set('popoutViewMode', state.viewMode);
      }

      if (state.pipWindow && !state.pipWindow.closed) {
        const doc = state.pipWindow.document;
        const container = doc.getElementById('popout-container');
        const viewBtn = doc.getElementById('popout-btn-view-toggle');
        const viewIcon = doc.getElementById('popout-view-icon');
        const viewLabel = doc.getElementById('popout-view-label');

        const isText = state.viewMode === 'text';

        if (container) container.classList.toggle('mode-text-only', isText);
        if (viewBtn) viewBtn.classList.toggle('active', isText);
        if (viewIcon) viewIcon.textContent = isText ? '⌒' : '𝐓';
        if (viewLabel) viewLabel.textContent = isText ? 'Dial' : 'Text';

        // Dynamically resize window to match view mode
        try {
          if (isText) {
            state.pipWindow.resizeTo(270, 135);
          } else {
            state.pipWindow.resizeTo(270, 230);
            if (state.dialPopout) {
              setTimeout(() => state.dialPopout.resize(), 50);
            }
          }
        } catch (e) {}
      }
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
        btnDay.textContent = '24h';
        btnDay.title = 'Day Progress';
        btnDay.onclick = () => window.StargazerApp && window.StargazerApp.setClockArc('day');

        const btnHour = doc.createElement('button');
        btnHour.className = 'popout-btn-chip';
        btnHour.textContent = '60m';
        btnHour.title = 'Hour Progress';
        btnHour.onclick = () => window.StargazerApp && window.StargazerApp.setClockArc('hour');

        const btn12 = doc.createElement('button');
        btn12.className = 'popout-btn-chip';
        btn12.textContent = '12h';
        btn12.title = '12-Hour Cycle';
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
        btnReset.textContent = '🔄';
        btnReset.title = 'Reset Timer';
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
        btnToggle.textContent = isRunning ? '⏸' : '▶';
        btnToggle.onclick = () => {
          if (window.StargazerApp) {
            window.StargazerApp.toggleStopwatch();
            this.updatePopoutControls(doc);
          }
        };

        const btnLap = doc.createElement('button');
        btnLap.className = 'popout-btn-action';
        btnLap.textContent = '🏁';
        btnLap.title = 'Record Lap';
        btnLap.onclick = () => window.StargazerApp && window.StargazerApp.recordLap();

        const btnReset = doc.createElement('button');
        btnReset.className = 'popout-btn-action';
        btnReset.textContent = '🔄';
        btnReset.title = 'Reset Stopwatch';
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
        const pinIcon = state.pipWindow.document.getElementById('popout-pin-icon');
        if (pinBtn) {
          pinBtn.classList.toggle('active', state.isPinned);
          if (pinIcon) pinIcon.textContent = state.isPinned ? '📌' : '📍';
          pinBtn.title = state.isPinned ? 'Pinned as Top Window (Always on Top)' : 'Click to pin window on top';
        }
      }
    },

    /**
     * Call the desktop launcher /api/pin HTTP endpoint to toggle HWND_TOPMOST
     */
    callPinApi(pinState) {
      try {
        const s = pinState ? 1 : 0;
        // Search both Popout and Stargazer to ensure the window is captured
        fetch(`/api/pin?state=${s}&title=Popout`, { method: 'GET' }).catch(() => {});
        fetch(`/api/pin?state=${s}&title=Stargazer`, { method: 'GET' }).catch(() => {});
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
          swBtn.textContent = appState.stopwatch.isRunning ? '⏸' : '▶';
        }
      }

      if (badgeElem && badge) badgeElem.textContent = badge;
      if (digitsElem && digits) digitsElem.textContent = digits;
      if (subtextElem && subtext) subtextElem.textContent = subtext;

      // Update Semicircle Dial only if in dial mode
      if (state.viewMode === 'dial' && state.dialPopout) {
        state.dialPopout.setProgress(progress, false, now);
      }
    }
  };

  // Expose globally
  window.StargazerPopout = Popout;

})(window);
