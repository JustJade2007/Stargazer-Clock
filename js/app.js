/**
 * Stargazer Clock - Main Application Orchestrator
 * Coordinates Time Tracking Modes, Starfield, Semicircle Dials, Audio,
 * and Persistent Cookie State.
 */

(function () {
  'use strict';

  // Application State
  const state = {
    settings: {},
    activeMode: 'clock',
    clockArcMode: 'day', // 'day', 'hour', 'halfday'
    
    // Shift Tracker
    shift: {
      title: 'Workday Shift',
      startTime: '08:00',
      endTime: '17:00'
    },

    // Timer
    timer: {
      totalSeconds: 25 * 60,
      remainingSeconds: 25 * 60,
      isRunning: false,
      intervalId: null
    },

    // Stopwatch
    stopwatch: {
      isRunning: false,
      startTime: 0,
      elapsedTime: 0,
      lastLapTime: 0,
      laps: [],
      animationFrameId: null
    },

    // Combined Focal view
    combinedFocal: 'clock' // 'clock' or 'shift'
  };

  // Dial Instances
  let dialClock = null;
  let dialShift = null;
  let dialTimer = null;
  let dialStopwatch = null;
  let dialCombFocal = null;
  let dialCombTimer = null;
  let dialCombStopwatch = null;
  let dialCombShift = null;
  let starfield = null;

  // DOM Elements Cache
  const elements = {};

  /**
   * Initialize Application
   */
  function init() {
    cacheElements();
    loadPersistentSettings();
    initStarfield();
    initDials();
    bindEvents();
    bindKeyboardShortcuts();

    // Start Clock Tick (100ms interval for precision)
    setInterval(tickClock, 100);
    tickClock();

    // Switch to initial mode
    setMode(state.settings.activeMode || 'clock');
  }

  /**
   * Cache DOM elements for rapid access
   */
  function cacheElements() {
    elements.body = document.body;
    elements.modeButtons = document.querySelectorAll('.mode-btn');
    elements.modeViews = document.querySelectorAll('.mode-view');
    elements.btnSettings = document.getElementById('btn-settings');
    elements.settingsDialog = document.getElementById('settings-dialog');
    elements.btnCloseSettings = document.getElementById('btn-close-settings');
    elements.btnSaveSettings = document.getElementById('btn-save-settings');
    elements.btnFullscreen = document.getElementById('btn-fullscreen');
    elements.btnSoundToggle = document.getElementById('btn-sound-toggle');
    elements.soundIcon = document.getElementById('sound-icon');
    elements.cookieStatusBadge = document.getElementById('cookie-status-badge');

    // Clock
    elements.clockDigitalTime = document.getElementById('clock-digital-time');
    elements.clockDate = document.getElementById('clock-date');
    elements.clockArcLabel = document.getElementById('clock-arc-label');
    elements.clockArcButtons = document.querySelectorAll('[data-clock-arc]');

    // Shift
    elements.shiftTitleInput = document.getElementById('shift-input-title');
    elements.shiftStartInput = document.getElementById('shift-input-start');
    elements.shiftEndInput = document.getElementById('shift-input-end');
    elements.btnSaveShift = document.getElementById('btn-save-shift');
    elements.shiftNameLabel = document.getElementById('shift-name-label');
    elements.shiftPercent = document.getElementById('shift-progress-percent');
    elements.shiftElapsed = document.getElementById('shift-elapsed');
    elements.shiftRemaining = document.getElementById('shift-remaining');
    elements.shiftStatusText = document.getElementById('shift-status-text');

    // Timer
    elements.timerDisplay = document.getElementById('timer-display');
    elements.timerSubText = document.getElementById('timer-sub-text');
    elements.timerStatusText = document.getElementById('timer-status-text');
    elements.btnTimerToggle = document.getElementById('btn-timer-toggle');
    elements.timerToggleIcon = document.getElementById('timer-toggle-icon');
    elements.timerToggleLabel = document.getElementById('timer-toggle-label');
    elements.btnTimerReset = document.getElementById('btn-timer-reset');
    elements.timerPresetButtons = document.querySelectorAll('.preset-chip');
    elements.timerInputH = document.getElementById('timer-input-h');
    elements.timerInputM = document.getElementById('timer-input-m');
    elements.timerInputS = document.getElementById('timer-input-s');
    elements.btnSetCustomTimer = document.getElementById('btn-set-custom-timer');

    // Stopwatch
    elements.stopwatchDisplay = document.getElementById('stopwatch-display');
    elements.stopwatchLapCount = document.getElementById('stopwatch-lap-count');
    elements.stopwatchStatusText = document.getElementById('stopwatch-status-text');
    elements.btnStopwatchToggle = document.getElementById('btn-stopwatch-toggle');
    elements.stopwatchToggleIcon = document.getElementById('stopwatch-toggle-icon');
    elements.stopwatchToggleLabel = document.getElementById('stopwatch-toggle-label');
    elements.btnStopwatchLap = document.getElementById('btn-stopwatch-lap');
    elements.btnStopwatchReset = document.getElementById('btn-stopwatch-reset');
    elements.lapsList = document.getElementById('laps-list');

    // Combined
    elements.btnCombFocalClock = document.getElementById('btn-comb-focal-clock');
    elements.btnCombFocalShift = document.getElementById('btn-comb-focal-shift');
    elements.combFocalBadge = document.getElementById('comb-focal-badge');
    elements.combFocalDigital = document.getElementById('comb-focal-digital');
    elements.combFocalSub = document.getElementById('comb-focal-sub');
    elements.combFocalStatusText = document.getElementById('comb-focal-status-text');

    elements.combTimerDigits = document.getElementById('comb-timer-digits');
    elements.combTimerStatus = document.getElementById('comb-timer-status');
    elements.btnCombTimerToggle = document.getElementById('btn-comb-timer-toggle');
    elements.btnCombTimerReset = document.getElementById('btn-comb-timer-reset');

    elements.combStopwatchDigits = document.getElementById('comb-stopwatch-digits');
    elements.combStopwatchStatus = document.getElementById('comb-stopwatch-status');
    elements.btnCombStopwatchToggle = document.getElementById('btn-comb-stopwatch-toggle');
    elements.btnCombStopwatchReset = document.getElementById('btn-comb-stopwatch-reset');

    elements.combShiftDigits = document.getElementById('comb-shift-digits');
    elements.combShiftStatus = document.getElementById('comb-shift-status');
    elements.combShiftRemaining = document.getElementById('comb-shift-remaining');

    // Settings Modal
    elements.themeSwatches = document.querySelectorAll('.theme-swatch');
    elements.settingStarDensity = document.getElementById('setting-star-density');
    elements.settingShootingStars = document.getElementById('setting-shooting-stars');
    elements.settingParallax = document.getElementById('setting-parallax');
    elements.settingTimeFormat = document.getElementById('setting-time-format');
    elements.settingShowSeconds = document.getElementById('setting-show-seconds');
    elements.settingShowDate = document.getElementById('setting-show-date');
    elements.settingSoundEnabled = document.getElementById('setting-sound-enabled');
    elements.settingSoundVolume = document.getElementById('setting-sound-volume');
    elements.btnTestChime = document.getElementById('btn-test-chime');
    elements.btnExportSettings = document.getElementById('btn-export-settings');
    elements.inputImportSettings = document.getElementById('input-import-settings');
    elements.btnResetSettings = document.getElementById('btn-reset-settings');
  }

  /**
   * Load stored settings from Cookie/Storage
   */
  function loadPersistentSettings() {
    state.settings = window.StargazerStorage.loadSettings();

    // Apply theme
    applyTheme(state.settings.theme);

    // Apply clock arc
    state.clockArcMode = state.settings.clockArc || 'day';
    updateClockArcButtons();

    // Apply shift settings
    if (state.settings.shiftSettings) {
      state.shift = Object.assign(state.shift, state.settings.shiftSettings);
      elements.shiftTitleInput.value = state.shift.title;
      elements.shiftStartInput.value = state.shift.startTime;
      elements.shiftEndInput.value = state.shift.endTime;
      elements.shiftNameLabel.textContent = state.shift.title.toUpperCase();
    }

    // Apply timer settings
    if (state.settings.timerSettings) {
      state.timer.totalSeconds = state.settings.timerSettings.totalSeconds || 25 * 60;
      state.timer.remainingSeconds = state.timer.totalSeconds;
      updateTimerDisplay();
    }

    // Apply combined focal
    state.combinedFocal = state.settings.combinedFocal || 'clock';
    updateCombinedFocalButtons();

    // Populate Settings UI
    elements.settingStarDensity.value = state.settings.starDensity;
    elements.settingShootingStars.checked = state.settings.shootingStars;
    elements.settingParallax.checked = state.settings.mouseParallax;
    elements.settingTimeFormat.value = state.settings.timeFormat;
    elements.settingShowSeconds.checked = state.settings.showSeconds;
    elements.settingShowDate.checked = state.settings.showDate;
    elements.settingSoundEnabled.checked = state.settings.soundEnabled;
    elements.settingSoundVolume.value = state.settings.soundVolume;
    updateSoundButton();
  }

  /**
   * Apply Visual Theme
   */
  function applyTheme(themeName) {
    elements.body.setAttribute('data-theme', themeName);
    state.settings.theme = themeName;
    elements.themeSwatches.forEach(swatch => {
      swatch.classList.toggle('active', swatch.dataset.theme === themeName);
    });

    // Theme color palettes for dials
    const themeColors = {
      cyan: { glow: '#00f2fe', start: '#00f2fe', end: '#4facfe' },
      violet: { glow: '#b388ff', start: '#b388ff', end: '#7c4dff' },
      amber: { glow: '#ffb300', start: '#ffb300', end: '#ff6f00' },
      emerald: { glow: '#00e676', start: '#00e676', end: '#00b0ff' },
      crimson: { glow: '#ff5252', start: '#ff5252', end: '#ff1744' }
    };

    const colors = themeColors[themeName] || themeColors.cyan;
    const dials = [dialClock, dialShift, dialTimer, dialStopwatch, dialCombFocal, dialCombTimer, dialCombStopwatch, dialCombShift];
    dials.forEach(dial => {
      if (dial) dial.setColors(colors.glow, colors.start, colors.end);
    });
  }

  /**
   * Initialize Starfield Engine
   */
  function initStarfield() {
    starfield = new window.StargazerStarfield('starfield-canvas');
    starfield.setDensity(state.settings.starDensity);
    starfield.setMeteors(state.settings.shootingStars);
    starfield.setParallax(state.settings.mouseParallax);
  }

  /**
   * Initialize Semicircle Dials
   */
  function initDials() {
    // 1. Clock Dial
    dialClock = new window.StargazerDial('dial-canvas-clock', {
      labelFormat: (pct) => `${Math.round(pct * 100)}%`
    });

    // 2. Shift Dial
    dialShift = new window.StargazerDial('dial-canvas-shift', {
      labelFormat: (pct) => `${Math.round(pct * 100)}%`
    });

    // 3. Timer Dial
    dialTimer = new window.StargazerDial('dial-canvas-timer', {
      labelFormat: (pct) => `${Math.round(pct * 100)}%`
    });

    // 4. Stopwatch Dial
    dialStopwatch = new window.StargazerDial('dial-canvas-stopwatch', {
      labelFormat: (pct) => `${Math.round(pct * 60)}s`
    });

    // 5. Combined Master Focal Dial
    dialCombFocal = new window.StargazerDial('dial-canvas-combined-focal', {
      labelFormat: (pct) => `${Math.round(pct * 100)}%`
    });

    // 6. Mini Dials for Combined View
    dialCombTimer = new window.StargazerDial('dial-canvas-comb-timer', {
      isMini: true,
      showTicks: false
    });

    dialCombStopwatch = new window.StargazerDial('dial-canvas-comb-stopwatch', {
      isMini: true,
      showTicks: false
    });

    dialCombShift = new window.StargazerDial('dial-canvas-comb-shift', {
      isMini: true,
      showTicks: false
    });

    applyTheme(state.settings.theme);
  }

  /**
   * Switch Active Mode
   */
  function setMode(modeName) {
    state.activeMode = modeName;
    state.settings.activeMode = modeName;
    window.StargazerStorage.set('activeMode', modeName);

    // Update Nav Buttons
    elements.modeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === modeName);
    });

    // Update View visibility
    elements.modeViews.forEach(view => {
      view.classList.toggle('view-active', view.id === `view-${modeName}`);
    });

    // Re-render active dials
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
  }

  /**
   * Standard Clock Tick & Calculation
   */
  function tickClock() {
    const now = new Date();

    // 1. Time Formatting
    const is12 = state.settings.timeFormat === '12';
    const showSec = state.settings.showSeconds;

    let hours = now.getHours();
    let ampm = '';
    if (is12) {
      ampm = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 => 12
    }

    const hStr = String(hours).padStart(2, '0');
    const mStr = String(now.getMinutes()).padStart(2, '0');
    const sStr = String(now.getSeconds()).padStart(2, '0');

    const formattedTime = showSec ? `${hStr}:${mStr}:${sStr}${ampm}` : `${hStr}:${mStr}${ampm}`;
    elements.clockDigitalTime.textContent = formattedTime;

    // Date
    if (state.settings.showDate) {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      elements.clockDate.textContent = now.toLocaleDateString(undefined, options);
      elements.clockDate.style.display = 'block';
    } else {
      elements.clockDate.style.display = 'none';
    }

    // 2. Arc Progress based on arc mode
    let arcProgress = 0;
    let arcLabelText = '';

    if (state.clockArcMode === 'day') {
      const msToday = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) * 1000 + now.getMilliseconds();
      const totalMsInDay = 86400 * 1000;
      arcProgress = msToday / totalMsInDay;
      arcLabelText = `Day: ${(arcProgress * 100).toFixed(1)}%`;
    } else if (state.clockArcMode === 'hour') {
      const msHour = (now.getMinutes() * 60 + now.getSeconds()) * 1000 + now.getMilliseconds();
      const totalMsInHour = 3600 * 1000;
      arcProgress = msHour / totalMsInHour;
      arcLabelText = `Hour: ${(arcProgress * 100).toFixed(1)}%`;
    } else if (state.clockArcMode === 'halfday') {
      const ms12h = ((now.getHours() % 12) * 3600 + now.getMinutes() * 60 + now.getSeconds()) * 1000 + now.getMilliseconds();
      const totalMs12h = 43200 * 1000;
      arcProgress = ms12h / totalMs12h;
      arcLabelText = `12h Arc: ${(arcProgress * 100).toFixed(1)}%`;
    }

    elements.clockArcLabel.textContent = arcLabelText;
    if (dialClock) dialClock.setProgress(arcProgress);

    // 3. Shift Tracker Tick
    tickShift(now);

    // 4. Combined Focal Mode Tick
    if (state.activeMode === 'combined') {
      if (state.combinedFocal === 'clock') {
        elements.combFocalBadge.textContent = 'CURRENT TIME';
        elements.combFocalDigital.textContent = formattedTime;
        elements.combFocalSub.textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
        elements.combFocalStatusText.textContent = arcLabelText;
        if (dialCombFocal) dialCombFocal.setProgress(arcProgress);
      } else {
        elements.combFocalBadge.textContent = state.shift.title.toUpperCase();
        elements.combFocalDigital.textContent = elements.shiftPercent.textContent;
        elements.combFocalSub.textContent = `${elements.shiftElapsed.textContent} elapsed | ${elements.shiftRemaining.textContent} left`;
        elements.combFocalStatusText.textContent = elements.shiftStatusText.textContent;
        if (dialCombFocal) dialCombFocal.setProgress(dialShift ? dialShift.currentProgress : 0);
      }
    }
  }

  /**
   * Shift / Timeframe Tracker Calculations
   */
  function tickShift(now) {
    const [startH, startM] = state.shift.startTime.split(':').map(Number);
    const [endH, endM] = state.shift.endTime.split(':').map(Number);

    const startTime = new Date(now);
    startTime.setHours(startH, startM, 0, 0);

    let endTime = new Date(now);
    endTime.setHours(endH, endM, 0, 0);

    // Handle overnight shifts (e.g. 22:00 to 06:00)
    if (endTime <= startTime) {
      if (now < startTime) {
        startTime.setDate(startTime.getDate() - 1);
      } else {
        endTime.setDate(endTime.getDate() + 1);
      }
    }

    const totalMs = endTime.getTime() - startTime.getTime();
    const elapsedMs = now.getTime() - startTime.getTime();
    const remainingMs = endTime.getTime() - now.getTime();

    let progress = 0;
    let statusText = '';

    if (now < startTime) {
      // Before shift
      progress = 0;
      const msUntil = startTime.getTime() - now.getTime();
      const hrsUntil = Math.floor(msUntil / (3600 * 1000));
      const minsUntil = Math.floor((msUntil % (3600 * 1000)) / (60 * 1000));
      statusText = `Starts in ${hrsUntil}h ${minsUntil}m`;
      elements.shiftElapsed.textContent = '0h 00m';
      elements.shiftRemaining.textContent = formatHoursMins(totalMs);
    } else if (now >= endTime) {
      // Completed or overtime
      progress = 1;
      const overtimeMs = now.getTime() - endTime.getTime();
      const otHrs = Math.floor(overtimeMs / (3600 * 1000));
      const otMins = Math.floor((overtimeMs % (3600 * 1000)) / (60 * 1000));
      statusText = otMins > 0 ? `Completed (Overtime: +${otHrs}h ${otMins}m)` : `Shift Completed`;
      elements.shiftElapsed.textContent = formatHoursMins(totalMs);
      elements.shiftRemaining.textContent = '0h 00m';
    } else {
      // In shift progress
      progress = Math.max(0, Math.min(1, elapsedMs / totalMs));
      statusText = `Ends at ${state.shift.endTime}`;
      elements.shiftElapsed.textContent = formatHoursMins(elapsedMs);
      elements.shiftRemaining.textContent = formatHoursMins(remainingMs);
    }

    const pctStr = `${(progress * 100).toFixed(1)}%`;
    elements.shiftPercent.textContent = pctStr;
    elements.shiftStatusText.textContent = statusText;

    if (dialShift) dialShift.setProgress(progress);

    // Sync Combined Shift Mini Card
    elements.combShiftDigits.textContent = pctStr;
    elements.combShiftStatus.textContent = `${state.shift.startTime} - ${state.shift.endTime}`;
    elements.combShiftRemaining.textContent = elements.shiftRemaining.textContent;
    if (dialCombShift) dialCombShift.setProgress(progress);
  }

  function formatHoursMins(ms) {
    const totalMins = Math.max(0, Math.floor(ms / (60 * 1000)));
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
  }

  /**
   * Countdown Timer Functions
   */
  function toggleTimer() {
    if (state.timer.isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }

  function startTimer() {
    if (state.timer.remainingSeconds <= 0) {
      state.timer.remainingSeconds = state.timer.totalSeconds;
    }
    state.timer.isRunning = true;
    updateTimerControls();

    state.timer.intervalId = setInterval(() => {
      if (state.timer.remainingSeconds > 0) {
        state.timer.remainingSeconds--;
        updateTimerDisplay();
      } else {
        // Timer Finished!
        onTimerComplete();
      }
    }, 1000);
  }

  function pauseTimer() {
    state.timer.isRunning = false;
    clearInterval(state.timer.intervalId);
    updateTimerControls();
  }

  function resetTimer() {
    pauseTimer();
    state.timer.remainingSeconds = state.timer.totalSeconds;
    updateTimerDisplay();
    updateTimerControls();
    elements.timerStatusText.textContent = 'Ready';
  }

  function onTimerComplete() {
    pauseTimer();
    elements.timerStatusText.textContent = 'Completed!';
    elements.timerDisplay.textContent = '00:00';
    if (dialTimer) dialTimer.setProgress(0, true);

    if (state.settings.soundEnabled) {
      window.StargazerAudio.playChime(state.settings.soundVolume / 100);
    }

    // Flash screen alert
    flashCompletionEffect();
  }

  function flashCompletionEffect() {
    const originalBorder = elements.body.style.boxShadow;
    elements.body.style.boxShadow = 'inset 0 0 100px var(--primary-color)';
    setTimeout(() => {
      elements.body.style.boxShadow = originalBorder;
    }, 1200);
  }

  function setTimerPreset(minutes) {
    resetTimer();
    state.timer.totalSeconds = minutes * 60;
    state.timer.remainingSeconds = state.timer.totalSeconds;
    state.settings.timerSettings = {
      totalSeconds: state.timer.totalSeconds,
      activePreset: String(minutes)
    };
    window.StargazerStorage.set('timerSettings', state.settings.timerSettings);

    elements.timerPresetButtons.forEach(btn => {
      btn.classList.toggle('active', Number(btn.dataset.minutes) === minutes);
    });

    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    const rem = state.timer.remainingSeconds;
    const h = Math.floor(rem / 3600);
    const m = Math.floor((rem % 3600) / 60);
    const s = rem % 60;

    let timeText = '';
    if (h > 0) {
      timeText = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    } else {
      timeText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    elements.timerDisplay.textContent = timeText;
    elements.combTimerDigits.textContent = timeText;

    const progress = state.timer.totalSeconds > 0 ? (rem / state.timer.totalSeconds) : 0;
    if (dialTimer) dialTimer.setProgress(progress);
    if (dialCombTimer) dialCombTimer.setProgress(progress);

    const totalMins = Math.round(state.timer.totalSeconds / 60);
    elements.timerSubText.textContent = `Total: ${totalMins} minutes`;
  }

  function updateTimerControls() {
    const isRunning = state.timer.isRunning;
    elements.timerToggleIcon.textContent = isRunning ? '⏸' : '▶';
    elements.timerToggleLabel.textContent = isRunning ? 'Pause' : 'Start';
    elements.timerStatusText.textContent = isRunning ? 'Counting down...' : 'Paused';

    elements.btnCombTimerToggle.textContent = isRunning ? 'Pause' : 'Start';
    elements.combTimerStatus.textContent = isRunning ? 'Active' : 'Paused';
  }

  /**
   * Precision Stopwatch Functions
   */
  function toggleStopwatch() {
    if (state.stopwatch.isRunning) {
      pauseStopwatch();
    } else {
      startStopwatch();
    }
  }

  function startStopwatch() {
    state.stopwatch.isRunning = true;
    state.stopwatch.startTime = performance.now() - state.stopwatch.elapsedTime;
    elements.btnStopwatchLap.disabled = false;
    updateStopwatchControls();

    const loop = (now) => {
      if (!state.stopwatch.isRunning) return;
      state.stopwatch.elapsedTime = now - state.stopwatch.startTime;
      updateStopwatchDisplay();
      state.stopwatch.animationFrameId = requestAnimationFrame(loop);
    };
    state.stopwatch.animationFrameId = requestAnimationFrame(loop);
  }

  function pauseStopwatch() {
    state.stopwatch.isRunning = false;
    cancelAnimationFrame(state.stopwatch.animationFrameId);
    elements.btnStopwatchLap.disabled = true;
    updateStopwatchControls();
  }

  function resetStopwatch() {
    pauseStopwatch();
    state.stopwatch.elapsedTime = 0;
    state.stopwatch.lastLapTime = 0;
    state.stopwatch.laps = [];
    updateStopwatchDisplay();
    updateStopwatchControls();
    elements.stopwatchLapCount.textContent = 'Lap 0';
    elements.lapsList.innerHTML = '<li class="lap-empty">No laps recorded</li>';
    if (dialStopwatch) dialStopwatch.setProgress(0, true);
    if (dialCombStopwatch) dialCombStopwatch.setProgress(0, true);
  }

  function recordLap() {
    if (!state.stopwatch.isRunning) return;
    const currentElapsed = state.stopwatch.elapsedTime;
    const splitTime = currentElapsed - state.stopwatch.lastLapTime;
    state.stopwatch.lastLapTime = currentElapsed;

    const lapNumber = state.stopwatch.laps.length + 1;
    const lapRecord = {
      lapNumber,
      splitMs: splitTime,
      totalMs: currentElapsed
    };
    state.stopwatch.laps.unshift(lapRecord);
    elements.stopwatchLapCount.textContent = `Lap ${lapNumber}`;
    renderLaps();
  }

  function renderLaps() {
    if (state.stopwatch.laps.length === 0) {
      elements.lapsList.innerHTML = '<li class="lap-empty">No laps recorded</li>';
      return;
    }

    // Determine fastest and slowest splits
    let minSplit = Infinity;
    let maxSplit = -Infinity;
    if (state.stopwatch.laps.length > 1) {
      state.stopwatch.laps.forEach(l => {
        if (l.splitMs < minSplit) minSplit = l.splitMs;
        if (l.splitMs > maxSplit) maxSplit = l.splitMs;
      });
    }

    elements.lapsList.innerHTML = state.stopwatch.laps.map(lap => {
      let speedClass = '';
      if (state.stopwatch.laps.length > 1) {
        if (lap.splitMs === minSplit) speedClass = 'fastest';
        else if (lap.splitMs === maxSplit) speedClass = 'slowest';
      }
      return `
        <li class="lap-item ${speedClass}">
          <span>Lap ${lap.lapNumber}</span>
          <span>+${formatStopwatch(lap.splitMs)}</span>
          <span>${formatStopwatch(lap.totalMs)}</span>
        </li>
      `;
    }).join('');
  }

  function formatStopwatch(ms) {
    const totalSecs = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSecs / 60);
    const seconds = totalSecs % 60;
    const hundredths = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
  }

  function updateStopwatchDisplay() {
    const timeStr = formatStopwatch(state.stopwatch.elapsedTime);
    elements.stopwatchDisplay.textContent = timeStr;
    elements.combStopwatchDigits.textContent = timeStr;

    // Dial sweeps 60 seconds per loop
    const progress = (state.stopwatch.elapsedTime % 60000) / 60000;
    if (dialStopwatch) dialStopwatch.setProgress(progress);
    if (dialCombStopwatch) dialCombStopwatch.setProgress(progress);
  }

  function updateStopwatchControls() {
    const isRunning = state.stopwatch.isRunning;
    elements.stopwatchToggleIcon.textContent = isRunning ? '⏸' : '▶';
    elements.stopwatchToggleLabel.textContent = isRunning ? 'Pause' : 'Start';
    elements.stopwatchStatusText.textContent = isRunning ? 'Running' : 'Stopped';

    elements.btnCombStopwatchToggle.textContent = isRunning ? 'Pause' : 'Start';
    elements.combStopwatchStatus.textContent = isRunning ? 'Running' : 'Stopped';
  }

  /**
   * Combined View Focal Toggle
   */
  function setCombinedFocal(focal) {
    state.combinedFocal = focal;
    state.settings.combinedFocal = focal;
    window.StargazerStorage.set('combinedFocal', focal);
    updateCombinedFocalButtons();
    tickClock();
  }

  function updateCombinedFocalButtons() {
    elements.btnCombFocalClock.classList.toggle('active', state.combinedFocal === 'clock');
    elements.btnCombFocalShift.classList.toggle('active', state.combinedFocal === 'shift');
  }

  function updateClockArcButtons() {
    elements.clockArcButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.clockArc === state.clockArcMode);
    });
  }

  function updateSoundButton() {
    elements.soundIcon.textContent = state.settings.soundEnabled ? '🔔' : '🔕';
  }

  /**
   * Bind DOM Events
   */
  function bindEvents() {
    // Mode Switcher Buttons
    elements.modeButtons.forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    // Clock Arc Selection
    elements.clockArcButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        state.clockArcMode = btn.dataset.clockArc;
        state.settings.clockArc = state.clockArcMode;
        window.StargazerStorage.set('clockArc', state.clockArcMode);
        updateClockArcButtons();
        tickClock();
      });
    });

    // Shift Update
    elements.btnSaveShift.addEventListener('click', () => {
      state.shift.title = elements.shiftTitleInput.value.trim() || 'Workday Shift';
      state.shift.startTime = elements.shiftStartInput.value;
      state.shift.endTime = elements.shiftEndInput.value;
      elements.shiftNameLabel.textContent = state.shift.title.toUpperCase();

      state.settings.shiftSettings = { ...state.shift };
      window.StargazerStorage.set('shiftSettings', state.settings.shiftSettings);
      tickClock();
    });

    // Timer Controls
    elements.btnTimerToggle.addEventListener('click', toggleTimer);
    elements.btnTimerReset.addEventListener('click', resetTimer);
    elements.btnCombTimerToggle.addEventListener('click', toggleTimer);
    elements.btnCombTimerReset.addEventListener('click', resetTimer);

    elements.timerPresetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mins = Number(btn.dataset.minutes);
        setTimerPreset(mins);
      });
    });

    elements.btnSetCustomTimer.addEventListener('click', () => {
      const h = parseInt(elements.timerInputH.value, 10) || 0;
      const m = parseInt(elements.timerInputM.value, 10) || 0;
      const s = parseInt(elements.timerInputS.value, 10) || 0;
      const total = h * 3600 + m * 60 + s;
      if (total > 0) {
        resetTimer();
        state.timer.totalSeconds = total;
        state.timer.remainingSeconds = total;
        updateTimerDisplay();
        elements.timerPresetButtons.forEach(b => b.classList.remove('active'));
      }
    });

    // Stopwatch Controls
    elements.btnStopwatchToggle.addEventListener('click', toggleStopwatch);
    elements.btnStopwatchLap.addEventListener('click', recordLap);
    elements.btnStopwatchReset.addEventListener('click', resetStopwatch);
    elements.btnCombStopwatchToggle.addEventListener('click', toggleStopwatch);
    elements.btnCombStopwatchReset.addEventListener('click', resetStopwatch);

    // Combined Focal buttons
    elements.btnCombFocalClock.addEventListener('click', () => setCombinedFocal('clock'));
    elements.btnCombFocalShift.addEventListener('click', () => setCombinedFocal('shift'));

    // Sound Toggle Button in Nav
    elements.btnSoundToggle.addEventListener('click', () => {
      state.settings.soundEnabled = !state.settings.soundEnabled;
      window.StargazerStorage.set('soundEnabled', state.settings.soundEnabled);
      elements.settingSoundEnabled.checked = state.settings.soundEnabled;
      updateSoundButton();
      if (state.settings.soundEnabled) {
        window.StargazerAudio.playChime(state.settings.soundVolume / 100);
      }
    });

    // Fullscreen Toggle
    elements.btnFullscreen.addEventListener('click', toggleFullscreen);

    // Settings Modal
    elements.btnSettings.addEventListener('click', () => {
      elements.settingsDialog.showModal();
    });

    elements.btnCloseSettings.addEventListener('click', () => {
      elements.settingsDialog.close();
    });

    elements.btnSaveSettings.addEventListener('click', () => {
      saveSettingsFromUI();
      elements.settingsDialog.close();
    });

    // Theme Swatches
    elements.themeSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        applyTheme(swatch.dataset.theme);
        window.StargazerStorage.set('theme', swatch.dataset.theme);
      });
    });

    // Sound Test Chime
    elements.btnTestChime.addEventListener('click', () => {
      const vol = Number(elements.settingSoundVolume.value) / 100;
      window.StargazerAudio.playChime(vol);
    });

    // Export Settings JSON
    elements.btnExportSettings.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(window.StargazerStorage.exportJSON());
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "stargazer-clock-settings.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });

    // Import Settings JSON
    elements.inputImportSettings.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const success = window.StargazerStorage.importJSON(event.target.result);
        if (success) {
          loadPersistentSettings();
          alert('Settings successfully imported!');
        } else {
          alert('Error importing configuration file.');
        }
      };
      reader.readAsText(file);
    });

    // Reset Defaults
    elements.btnResetSettings.addEventListener('click', () => {
      if (confirm('Reset all settings to default celestial configuration?')) {
        window.StargazerStorage.resetDefaults();
        loadPersistentSettings();
        setMode('clock');
      }
    });
  }

  /**
   * Save Settings from Modal to Storage
   */
  function saveSettingsFromUI() {
    state.settings.starDensity = elements.settingStarDensity.value;
    state.settings.shootingStars = elements.settingShootingStars.checked;
    state.settings.mouseParallax = elements.settingParallax.checked;
    state.settings.timeFormat = elements.settingTimeFormat.value;
    state.settings.showSeconds = elements.settingShowSeconds.checked;
    state.settings.showDate = elements.settingShowDate.checked;
    state.settings.soundEnabled = elements.settingSoundEnabled.checked;
    state.settings.soundVolume = Number(elements.settingSoundVolume.value);

    window.StargazerStorage.saveSettings(state.settings);

    // Apply immediate updates to engines
    if (starfield) {
      starfield.setDensity(state.settings.starDensity);
      starfield.setMeteors(state.settings.shootingStars);
      starfield.setParallax(state.settings.mouseParallax);
    }
    updateSoundButton();
    tickClock();
  }

  /**
   * Fullscreen Toggle
   */
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  /**
   * Keyboard Shortcuts
   */
  function bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      // Space: Toggle active timer or stopwatch
      if (e.code === 'Space') {
        e.preventDefault();
        if (state.activeMode === 'timer') toggleTimer();
        else if (state.activeMode === 'stopwatch') toggleStopwatch();
        else if (state.activeMode === 'combined') {
          // In combined mode, toggle timer if set, or stopwatch
          toggleTimer();
        }
      }

      // 'R': Reset active timer or stopwatch
      if (e.code === 'KeyR') {
        if (state.activeMode === 'timer') resetTimer();
        else if (state.activeMode === 'stopwatch') resetStopwatch();
      }

      // 'L': Lap in stopwatch
      if (e.code === 'KeyL' && state.activeMode === 'stopwatch') {
        recordLap();
      }

      // Numbers 1-5: Quick mode switch
      if (e.key === '1') setMode('clock');
      if (e.key === '2') setMode('shift');
      if (e.key === '3') setMode('timer');
      if (e.key === '4') setMode('stopwatch');
      if (e.key === '5') setMode('combined');
    });
  }

  // Start on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
