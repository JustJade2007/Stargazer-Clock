/**
 * Stargazer Clock - Main Application Orchestrator
 * Coordinates Time Tracking Modes, Celestial Sun & Moon Phases, Semicircle Dials,
 * Center Display Swapping, Audio, and Persistent Cookie State.
 */

(function () {
  'use strict';

  // Application State
  const state = {
    settings: {},
    activeMode: 'clock',
    clockArcMode: 'day', // 'day', 'hour', 'halfday'
    
    // Center display swap modes: 'time' | 'remaining' | 'percent'
    clockCenterDisplay: 'time',
    shiftCenterDisplay: 'percent',
    timerCenterDisplay: 'remaining',

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

    // Timer Sub-Mode: 'duration' (standard duration countdown) or 'target' (time until / event countdown)
    timerSubmode: 'duration',
    targetCountdown: {
      title: 'Target Countdown',
      targetTime: '17:00',
      targetDate: '',
      setTimestamp: 0,
      hasTarget: false,
      hasReached: false
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
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('popout') === 'true') {
      elements.body.classList.add('popout-mode');
      const paramMode = urlParams.get('mode');
      if (paramMode) {
        state.settings.activeMode = paramMode;
      }
      if (urlParams.get('view') === 'text') {
        elements.body.classList.add('mode-text-only');
      }
    }
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
    elements.btnPopout = document.getElementById('btn-popout');
    elements.btnSettingsPopout = document.getElementById('btn-settings-popout');
    elements.cookieStatusBadge = document.getElementById('cookie-status-badge');
    elements.footerCelestialStatus = document.getElementById('footer-celestial-status');

    // Clock
    elements.clockCenterClickArea = document.getElementById('clock-center-click-area');
    elements.clockModeLabel = document.getElementById('clock-mode-label');
    elements.clockDigitalTime = document.getElementById('clock-digital-time');
    elements.clockDate = document.getElementById('clock-date');
    elements.clockArcLabel = document.getElementById('clock-arc-label');
    elements.clockArcButtons = document.querySelectorAll('[data-clock-arc]');
    elements.clockCenterButtons = document.querySelectorAll('[data-clock-center]');

    // Shift
    elements.shiftCenterClickArea = document.getElementById('shift-center-click-area');
    elements.shiftTitleInput = document.getElementById('shift-input-title');
    elements.shiftStartInput = document.getElementById('shift-input-start');
    elements.shiftEndInput = document.getElementById('shift-input-end');
    elements.btnSaveShift = document.getElementById('btn-save-shift');
    elements.shiftNameLabel = document.getElementById('shift-name-label');
    elements.shiftPercent = document.getElementById('shift-progress-percent');
    elements.shiftElapsed = document.getElementById('shift-elapsed');
    elements.shiftRemaining = document.getElementById('shift-remaining');
    elements.shiftStatusText = document.getElementById('shift-status-text');
    elements.shiftCenterButtons = document.querySelectorAll('[data-shift-center]');

    // Timer
    elements.timerCenterClickArea = document.getElementById('timer-center-click-area');
    elements.timerTitleBadge = document.getElementById('timer-title-badge');
    elements.timerDisplay = document.getElementById('timer-display');
    elements.timerSubText = document.getElementById('timer-sub-text');
    elements.timerStatusText = document.getElementById('timer-status-text');
    elements.btnTimerToggle = document.getElementById('btn-timer-toggle');
    elements.timerToggleIcon = document.getElementById('timer-toggle-icon');
    elements.timerToggleLabel = document.getElementById('timer-toggle-label');
    elements.btnTimerReset = document.getElementById('btn-timer-reset');
    elements.timerPresetButtons = document.querySelectorAll('#panel-timer-duration .preset-chip');
    elements.timerInputH = document.getElementById('timer-input-h');
    elements.timerInputM = document.getElementById('timer-input-m');
    elements.timerInputS = document.getElementById('timer-input-s');
    elements.btnSetCustomTimer = document.getElementById('btn-set-custom-timer');
    elements.timerCenterButtons = document.querySelectorAll('[data-timer-center]');

    // Timer Submode Elements
    elements.btnSubmodeDuration = document.getElementById('btn-submode-duration');
    elements.btnSubmodeTarget = document.getElementById('btn-submode-target');
    elements.panelTimerDuration = document.getElementById('panel-timer-duration');
    elements.panelTimerTarget = document.getElementById('panel-timer-target');

    // Target Countdown Elements
    elements.targetInputTitle = document.getElementById('target-input-title');
    elements.targetInputTime = document.getElementById('target-input-time');
    elements.targetInputDate = document.getElementById('target-input-date');
    elements.btnSetTargetCountdown = document.getElementById('btn-set-target-countdown');
    elements.btnClearTargetCountdown = document.getElementById('btn-clear-target-countdown');
    elements.targetPresetButtons = document.querySelectorAll('#panel-timer-target .preset-chip');

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
    elements.combCenterClickArea = document.getElementById('comb-center-click-area');
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
    elements.settingPointerMode = document.getElementById('setting-pointer-mode');
    elements.settingMoonPhasePreview = document.getElementById('setting-moon-phase-preview');
    elements.settingDaynightPreview = document.getElementById('setting-daynight-preview');
    elements.settingStarDensity = document.getElementById('setting-star-density');
    elements.settingShootingStars = document.getElementById('setting-shooting-stars');
    elements.settingParallax = document.getElementById('setting-parallax');
    elements.settingCenterDisplay = document.getElementById('setting-center-display');
    elements.settingTimeFormat = document.getElementById('setting-time-format');
    elements.settingShowSeconds = document.getElementById('setting-show-seconds');
    elements.settingShowDate = document.getElementById('setting-show-date');
    elements.settingSoundEnabled = document.getElementById('setting-sound-enabled');
    elements.settingSoundVolume = document.getElementById('setting-sound-volume');
    elements.btnTestChime = document.getElementById('btn-test-chime');
    elements.btnExportSettings = document.getElementById('btn-export-settings');
    elements.inputImportSettings = document.getElementById('input-import-settings');
    elements.btnResetSettings = document.getElementById('btn-reset-settings');

    // Debug Simulation Controls
    elements.btnDebugHud = document.getElementById('btn-debug-hud');
    elements.btnOpenDebugHud = document.getElementById('btn-open-debug-hud');
    elements.btnResetDebugSim = document.getElementById('btn-reset-debug-sim');
    elements.settingDebugStatus = document.getElementById('setting-debug-status');
  }

  /**
   * Load stored settings from Cookie/Storage
   */
  function loadPersistentSettings() {
    state.settings = window.StargazerStorage.loadSettings();

    // Initialize Debug & Simulation engine
    if (window.StargazerDebug) {
      window.StargazerDebug.init(state.settings.debugSettings || {});
    }

    // Apply theme
    applyTheme(state.settings.theme);

    // Apply clock arc
    state.clockArcMode = state.settings.clockArc || 'day';
    updateClockArcButtons();

    // Apply center display modes
    state.clockCenterDisplay = state.settings.clockCenterDisplay || 'time';
    state.shiftCenterDisplay = state.settings.shiftCenterDisplay || 'percent';
    state.timerCenterDisplay = state.settings.timerCenterDisplay || 'remaining';
    updateCenterDisplayButtons();

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

    // Apply timer sub-mode and target countdown settings
    state.timerSubmode = state.settings.timerSubmode || 'duration';
    if (state.settings.targetCountdownSettings) {
      state.targetCountdown = Object.assign(state.targetCountdown, state.settings.targetCountdownSettings);
      if (elements.targetInputTitle && state.targetCountdown.title) {
        elements.targetInputTitle.value = state.targetCountdown.title;
      }
      if (elements.targetInputTime && state.targetCountdown.targetTime) {
        elements.targetInputTime.value = state.targetCountdown.targetTime;
      }
      if (elements.targetInputDate && state.targetCountdown.targetDate) {
        elements.targetInputDate.value = state.targetCountdown.targetDate;
      }
    }
    setTimerSubmode(state.timerSubmode);

    // Apply combined focal
    state.combinedFocal = state.settings.combinedFocal || 'clock';
    updateCombinedFocalButtons();

    // Apply celestial pointer mode
    const pointerMode = state.settings.pointerMode || 'auto';
    applyPointerMode(pointerMode);

    // Populate Settings UI
    if (elements.settingPointerMode) elements.settingPointerMode.value = pointerMode;
    if (elements.settingCenterDisplay) elements.settingCenterDisplay.value = state.clockCenterDisplay;
    elements.settingStarDensity.value = state.settings.starDensity;
    elements.settingShootingStars.checked = state.settings.shootingStars;
    elements.settingParallax.checked = state.settings.mouseParallax;
    elements.settingTimeFormat.value = state.settings.timeFormat;
    elements.settingShowSeconds.checked = state.settings.showSeconds;
    elements.settingShowDate.checked = state.settings.showDate;
    elements.settingSoundEnabled.checked = state.settings.soundEnabled;
    elements.settingSoundVolume.value = state.settings.soundVolume;
    updateSoundButton();
    updateEphemerisPreview();
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
   * Apply Pointer Mode (Auto Sun/Moon, Sun, Moon, Orb)
   */
  function applyPointerMode(mode) {
    state.settings.pointerMode = mode;
    window.StargazerStorage.set('pointerMode', mode);
    const dials = [dialClock, dialShift, dialTimer, dialStopwatch, dialCombFocal, dialCombTimer, dialCombStopwatch, dialCombShift];
    dials.forEach(dial => {
      if (dial) dial.setPointerMode(mode);
    });
    updateEphemerisPreview();
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
    const pMode = state.settings.pointerMode || 'auto';

    dialClock = new window.StargazerDial('dial-canvas-clock', {
      pointerMode: pMode,
      labelFormat: (pct) => `${Math.round(pct * 100)}%`
    });

    dialShift = new window.StargazerDial('dial-canvas-shift', {
      pointerMode: pMode,
      labelFormat: (pct) => `${Math.round(pct * 100)}%`
    });

    dialTimer = new window.StargazerDial('dial-canvas-timer', {
      pointerMode: pMode,
      labelFormat: (pct) => `${Math.round(pct * 100)}%`
    });

    dialStopwatch = new window.StargazerDial('dial-canvas-stopwatch', {
      pointerMode: pMode,
      labelFormat: (pct) => `${Math.round(pct * 60)}s`
    });

    dialCombFocal = new window.StargazerDial('dial-canvas-combined-focal', {
      pointerMode: pMode,
      labelFormat: (pct) => `${Math.round(pct * 100)}%`
    });

    dialCombTimer = new window.StargazerDial('dial-canvas-comb-timer', {
      isMini: true,
      showTicks: false,
      pointerMode: pMode
    });

    dialCombStopwatch = new window.StargazerDial('dial-canvas-comb-stopwatch', {
      isMini: true,
      showTicks: false,
      pointerMode: pMode
    });

    dialCombShift = new window.StargazerDial('dial-canvas-comb-shift', {
      isMini: true,
      showTicks: false,
      pointerMode: pMode
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

    elements.modeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === modeName);
    });

    elements.modeViews.forEach(view => {
      view.classList.toggle('view-active', view.id === `view-${modeName}`);
    });

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
  }

  /**
   * Cycle Center Display Modes
   */
  function cycleClockCenterDisplay() {
    const cycle = { time: 'remaining', remaining: 'percent', percent: 'time' };
    state.clockCenterDisplay = cycle[state.clockCenterDisplay] || 'time';
    state.settings.clockCenterDisplay = state.clockCenterDisplay;
    window.StargazerStorage.set('clockCenterDisplay', state.clockCenterDisplay);
    updateCenterDisplayButtons();
    tickClock();
  }

  function cycleShiftCenterDisplay() {
    const cycle = { percent: 'remaining', remaining: 'time', time: 'percent' };
    state.shiftCenterDisplay = cycle[state.shiftCenterDisplay] || 'percent';
    state.settings.shiftCenterDisplay = state.shiftCenterDisplay;
    window.StargazerStorage.set('shiftCenterDisplay', state.shiftCenterDisplay);
    updateCenterDisplayButtons();
    tickClock();
  }

  function cycleTimerCenterDisplay() {
    const cycle = { remaining: 'percent', percent: 'time', time: 'remaining' };
    state.timerCenterDisplay = cycle[state.timerCenterDisplay] || 'remaining';
    state.settings.timerCenterDisplay = state.timerCenterDisplay;
    window.StargazerStorage.set('timerCenterDisplay', state.timerCenterDisplay);
    updateCenterDisplayButtons();
    if (state.timerSubmode === 'target') {
      tickTargetCountdown();
    } else {
      updateTimerDisplay();
    }
  }

  function updateCenterDisplayButtons() {
    if (elements.clockCenterButtons) {
      elements.clockCenterButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.clockCenter === state.clockCenterDisplay);
      });
    }
    if (elements.shiftCenterButtons) {
      elements.shiftCenterButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.shiftCenter === state.shiftCenterDisplay);
      });
    }
    if (elements.timerCenterButtons) {
      elements.timerCenterButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.timerCenter === state.timerCenterDisplay);
      });
    }
  }

  /**
   * Central Time Getter (Supports Simulated Time, Time Warping, & Timezones)
   */
  function getNow() {
    return window.StargazerTime ? window.StargazerTime.now() : new Date();
  }

  /**
   * Update Ephemeris (Sun & Moon phase preview)
   */
  function updateEphemerisPreview() {
    const now = getNow();
    const moon = window.StargazerMoon.calculateMoonPhase(now);
    const isDay = window.StargazerMoon.isDaytime(now);

    const mode = state.settings.pointerMode || 'auto';
    let celestialText = '';
    if (mode === 'sun') {
      celestialText = '☀️ Sun (Solar Mode)';
    } else if (mode === 'moon') {
      celestialText = `${moon.emoji} ${moon.name} (${moon.illuminatedPercent})`;
    } else if (mode === 'orb') {
      celestialText = '⚪ Classic Luminous Orb';
    } else {
      // Auto
      celestialText = isDay
        ? '☀️ Daylight (Sun Corona)'
        : `${moon.emoji} Night (${moon.name} ${moon.illuminatedPercent})`;
    }

    if (elements.footerCelestialStatus) {
      elements.footerCelestialStatus.textContent = celestialText;
    }
    if (elements.settingMoonPhasePreview) {
      elements.settingMoonPhasePreview.textContent = `${moon.name} ${moon.emoji} (${moon.illuminatedPercent} illuminated)`;
    }
    if (elements.settingDaynightPreview) {
      elements.settingDaynightPreview.textContent = isDay ? '☀️ Daytime (Sun active)' : '🌙 Nighttime (Moon active)';
    }
  }

  /**
   * Format Time String
   */
  function formatCurrentTimeString(now) {
    const is12 = state.settings.timeFormat === '12';
    const showSec = state.settings.showSeconds;

    let hours = now.getHours();
    let ampm = '';
    if (is12) {
      ampm = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
    }

    const hStr = String(hours).padStart(2, '0');
    const mStr = String(now.getMinutes()).padStart(2, '0');
    const sStr = String(now.getSeconds()).padStart(2, '0');

    return showSec ? `${hStr}:${mStr}:${sStr}${ampm}` : `${hStr}:${mStr}${ampm}`;
  }

  /**
   * Standard Clock Tick & Calculation
   */
  function tickClock() {
    const now = getNow();
    const formattedTime = formatCurrentTimeString(now);

    // Date
    if (state.settings.showDate) {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      elements.clockDate.textContent = now.toLocaleDateString(undefined, options);
      elements.clockDate.style.display = 'block';
    } else {
      elements.clockDate.style.display = 'none';
    }

    // Arc Progress based on arc scope
    let arcProgress = 0;
    let arcLabelText = '';
    let remainingMsInScope = 0;

    if (state.clockArcMode === 'day') {
      const msToday = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) * 1000 + now.getMilliseconds();
      const totalMsInDay = 86400 * 1000;
      arcProgress = msToday / totalMsInDay;
      remainingMsInScope = totalMsInDay - msToday;
      arcLabelText = `Day: ${(arcProgress * 100).toFixed(1)}%`;
    } else if (state.clockArcMode === 'hour') {
      const msHour = (now.getMinutes() * 60 + now.getSeconds()) * 1000 + now.getMilliseconds();
      const totalMsInHour = 3600 * 1000;
      arcProgress = msHour / totalMsInHour;
      remainingMsInScope = totalMsInHour - msHour;
      arcLabelText = `Hour: ${(arcProgress * 100).toFixed(1)}%`;
    } else if (state.clockArcMode === 'halfday') {
      const ms12h = ((now.getHours() % 12) * 3600 + now.getMinutes() * 60 + now.getSeconds()) * 1000 + now.getMilliseconds();
      const totalMs12h = 43200 * 1000;
      arcProgress = ms12h / totalMs12h;
      remainingMsInScope = totalMs12h - ms12h;
      arcLabelText = `12h Arc: ${(arcProgress * 100).toFixed(1)}%`;
    }

    elements.clockArcLabel.textContent = arcLabelText;
    if (dialClock) dialClock.setProgress(arcProgress, false, now);

    // Center Display for Clock: Swap between Time, Remaining, and Percent
    const pctString = `${(arcProgress * 100).toFixed(1)}%`;
    const remString = formatHoursMinsSecs(remainingMsInScope);

    if (state.clockCenterDisplay === 'time') {
      elements.clockModeLabel.textContent = 'CURRENT TIME';
      elements.clockDigitalTime.textContent = formattedTime;
      elements.clockArcLabel.textContent = `${arcLabelText} • ${remString} left`;
    } else if (state.clockCenterDisplay === 'remaining') {
      elements.clockModeLabel.textContent = 'TIME REMAINING';
      elements.clockDigitalTime.textContent = remString;
      elements.clockArcLabel.textContent = `${formattedTime} • ${pctString} elapsed`;
    } else if (state.clockCenterDisplay === 'percent') {
      elements.clockModeLabel.textContent = `${state.clockArcMode.toUpperCase()} PROGRESS`;
      elements.clockDigitalTime.textContent = pctString;
      elements.clockArcLabel.textContent = `${formattedTime} • ${remString} left`;
    }

    // Shift Tracker Tick
    tickShift(now, formattedTime);

    // Timer Tick updates depending on active timer submode
    if (state.timerSubmode === 'target') {
      tickTargetCountdown(now, formattedTime);
    } else {
      if (state.timerCenterDisplay === 'time' && state.activeMode === 'timer') {
        elements.timerDisplay.textContent = formattedTime;
      }
    }

    // Combined Focal Mode Tick
    if (state.activeMode === 'combined') {
      if (state.combinedFocal === 'clock') {
        elements.combFocalBadge.textContent = elements.clockModeLabel.textContent;
        elements.combFocalDigital.textContent = elements.clockDigitalTime.textContent;
        elements.combFocalSub.textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
        elements.combFocalStatusText.textContent = elements.clockArcLabel.textContent;
        if (dialCombFocal) dialCombFocal.setProgress(arcProgress, false, now);
      } else {
        elements.combFocalBadge.textContent = elements.shiftNameLabel.textContent;
        elements.combFocalDigital.textContent = elements.shiftPercent.textContent;
        elements.combFocalSub.textContent = `${elements.shiftElapsed.textContent} elapsed | ${elements.shiftRemaining.textContent} left`;
        elements.combFocalStatusText.textContent = elements.shiftStatusText.textContent;
        if (dialCombFocal) dialCombFocal.setProgress(dialShift ? dialShift.currentProgress : 0, false, now);
      }
    }

    updateEphemerisPreview();

    // Update Debug simulation status in Settings modal if element exists
    if (elements.settingDebugStatus && window.StargazerDebug) {
      const isSim = window.StargazerDebug.isEnabled();
      elements.settingDebugStatus.textContent = isSim ? '⚡ Simulated Active' : 'Live System Time';
      elements.settingDebugStatus.style.color = isSim ? '#ffd54f' : 'var(--text-accent)';
    }

    // Keep floating HUD time readout in-sync
    if (window.StargazerDebug) {
      window.StargazerDebug.updateHudUi();
    }

    // Update Pop Out window if open
    if (window.StargazerPopout && window.StargazerPopout.isPopoutOpen()) {
      window.StargazerPopout.tick(state, {
        dialClock,
        dialShift,
        dialTimer,
        dialStopwatch,
        clockModeLabel: elements.clockModeLabel,
        clockDigitalTime: elements.clockDigitalTime,
        clockArcLabel: elements.clockArcLabel,
        shiftNameLabel: elements.shiftNameLabel,
        shiftPercent: elements.shiftPercent,
        shiftRemaining: elements.shiftRemaining,
        timerTitleBadge: elements.timerTitleBadge,
        timerDisplay: elements.timerDisplay,
        timerSubText: elements.timerSubText,
        stopwatchDisplay: elements.stopwatchDisplay,
        stopwatchLapCount: elements.stopwatchLapCount
      });
    }
  }

  /**
   * Shift / Timeframe Tracker Calculations
   */
  function tickShift(now, formattedTime) {
    const [startH, startM] = state.shift.startTime.split(':').map(Number);
    const [endH, endM] = state.shift.endTime.split(':').map(Number);

    const startTime = new Date(now);
    startTime.setHours(startH, startM, 0, 0);

    let endTime = new Date(now);
    endTime.setHours(endH, endM, 0, 0);

    // Handle overnight shifts (e.g. 22:00 to 06:00 or 18:00 to 06:00)
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
      progress = 0;
      const msUntil = startTime.getTime() - now.getTime();
      const hrsUntil = Math.floor(msUntil / (3600 * 1000));
      const minsUntil = Math.floor((msUntil % (3600 * 1000)) / (60 * 1000));
      statusText = `Starts in ${hrsUntil}h ${minsUntil}m`;
      elements.shiftElapsed.textContent = '0h 00m';
      elements.shiftRemaining.textContent = formatHoursMins(totalMs);
    } else if (now >= endTime) {
      progress = 1;
      const overtimeMs = now.getTime() - endTime.getTime();
      const otHrs = Math.floor(overtimeMs / (3600 * 1000));
      const otMins = Math.floor((overtimeMs % (3600 * 1000)) / (60 * 1000));
      statusText = otMins > 0 ? `Completed (Overtime: +${otHrs}h ${otMins}m)` : `Shift Completed`;
      elements.shiftElapsed.textContent = formatHoursMins(totalMs);
      elements.shiftRemaining.textContent = '0h 00m';
    } else {
      progress = Math.max(0, Math.min(1, elapsedMs / totalMs));
      statusText = `Ends at ${state.shift.endTime}`;
      elements.shiftElapsed.textContent = formatHoursMins(elapsedMs);
      elements.shiftRemaining.textContent = formatHoursMins(remainingMs);
    }

    const pctStr = `${(progress * 100).toFixed(1)}%`;
    const remStr = elements.shiftRemaining.textContent;
    const elapStr = elements.shiftElapsed.textContent;

    // Shift Center Display Swapping: Percent / Remaining / Current Time
    if (state.shiftCenterDisplay === 'percent') {
      elements.shiftNameLabel.textContent = `${state.shift.title.toUpperCase()} • PROGRESS`;
      elements.shiftPercent.textContent = pctStr;
    } else if (state.shiftCenterDisplay === 'remaining') {
      elements.shiftNameLabel.textContent = `${state.shift.title.toUpperCase()} • TIME LEFT`;
      elements.shiftPercent.textContent = remStr;
    } else if (state.shiftCenterDisplay === 'time') {
      elements.shiftNameLabel.textContent = `${state.shift.title.toUpperCase()} • CURRENT TIME`;
      elements.shiftPercent.textContent = formattedTime;
    }

    elements.shiftStatusText.textContent = statusText;
    if (dialShift) dialShift.setProgress(progress, false, now);

    // Sync Combined Shift Mini Card
    elements.combShiftDigits.textContent = pctStr;
    elements.combShiftStatus.textContent = `${state.shift.startTime} - ${state.shift.endTime}`;
    elements.combShiftRemaining.textContent = remStr;
    if (dialCombShift) dialCombShift.setProgress(progress, false, now);
  }

  function formatHoursMins(ms) {
    const totalMins = Math.max(0, Math.floor(ms / (60 * 1000)));
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
  }

  function formatHoursMinsSecs(ms) {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) {
      return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    }
    return `${m}m ${String(s).padStart(2, '0')}s`;
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
    if (dialTimer) dialTimer.setProgress(0, true, new Date());

    if (state.settings.soundEnabled) {
      window.StargazerAudio.playChime(state.settings.soundVolume / 100);
    }
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

    const progress = state.timer.totalSeconds > 0 ? (rem / state.timer.totalSeconds) : 0;
    const pctText = `${(progress * 100).toFixed(1)}%`;
    const now = getNow();

    // Timer Center Display Swapping: Remaining / Percent / Current Time
    if (state.timerCenterDisplay === 'remaining') {
      elements.timerTitleBadge.textContent = 'COUNTDOWN TIME LEFT';
      elements.timerDisplay.textContent = timeText;
    } else if (state.timerCenterDisplay === 'percent') {
      elements.timerTitleBadge.textContent = 'COUNTDOWN REMAINING %';
      elements.timerDisplay.textContent = pctText;
    } else if (state.timerCenterDisplay === 'time') {
      elements.timerTitleBadge.textContent = 'CURRENT LOCAL TIME';
      elements.timerDisplay.textContent = formatCurrentTimeString(now);
    }

    elements.combTimerDigits.textContent = timeText;

    if (dialTimer) dialTimer.setProgress(progress, false, now);
    if (dialCombTimer) dialCombTimer.setProgress(progress, false, now);

    const totalMins = Math.round(state.timer.totalSeconds / 60);
    elements.timerSubText.textContent = `Total: ${totalMins} minutes (${pctText} left)`;
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
   * Set Timer Sub-Mode: 'duration' (Duration Timer) or 'target' (Time Until / Countdown)
   */
  function setTimerSubmode(submode) {
    state.timerSubmode = submode;
    state.settings.timerSubmode = submode;
    window.StargazerStorage.set('timerSubmode', submode);

    if (elements.btnSubmodeDuration && elements.btnSubmodeTarget) {
      elements.btnSubmodeDuration.classList.toggle('active', submode === 'duration');
      elements.btnSubmodeTarget.classList.toggle('active', submode === 'target');
    }

    if (elements.panelTimerDuration && elements.panelTimerTarget) {
      elements.panelTimerDuration.style.display = submode === 'duration' ? 'block' : 'none';
      elements.panelTimerTarget.style.display = submode === 'target' ? 'block' : 'none';
    }

    if (submode === 'duration') {
      updateTimerDisplay();
      updateTimerControls();
    } else {
      tickTargetCountdown();
    }
  }

  /**
   * Set Target Countdown configuration
   */
  function setTargetCountdownValues(title, time, date) {
    state.targetCountdown.title = (title || 'Target Countdown').trim();
    state.targetCountdown.targetTime = time || '17:00';
    state.targetCountdown.targetDate = date || '';
    state.targetCountdown.setTimestamp = Date.now();
    state.targetCountdown.hasTarget = true;
    state.targetCountdown.hasReached = false;

    if (elements.targetInputTitle) elements.targetInputTitle.value = state.targetCountdown.title;
    if (elements.targetInputTime) elements.targetInputTime.value = state.targetCountdown.targetTime;
    if (elements.targetInputDate) elements.targetInputDate.value = state.targetCountdown.targetDate;

    state.settings.targetCountdownSettings = {
      title: state.targetCountdown.title,
      targetTime: state.targetCountdown.targetTime,
      targetDate: state.targetCountdown.targetDate,
      setTimestamp: state.targetCountdown.setTimestamp
    };
    window.StargazerStorage.set('targetCountdownSettings', state.settings.targetCountdownSettings);

    tickTargetCountdown();
  }

  /**
   * Target Countdown / Time Until Calculations & Display
   */
  function tickTargetCountdown(now, formattedTime) {
    if (!now) now = getNow();
    if (!formattedTime) formattedTime = formatCurrentTimeString(now);

    const title = (state.targetCountdown.title || 'Target Event').trim();
    const timeStr = state.targetCountdown.targetTime || '17:00';
    const dateStr = state.targetCountdown.targetDate || '';

    const [tH, tM] = timeStr.split(':').map(Number);
    let targetDateObj;

    if (dateStr) {
      const [year, month, day] = dateStr.split('-').map(Number);
      targetDateObj = new Date(year, month - 1, day, tH, tM, 0, 0);
    } else {
      targetDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), tH, tM, 0, 0);
      // If target time is earlier than current time today, roll over to tomorrow
      if (targetDateObj.getTime() <= now.getTime()) {
        targetDateObj.setDate(targetDateObj.getDate() + 1);
      }
    }

    const targetMs = targetDateObj.getTime();
    const currentMs = now.getTime();
    const diffMs = targetMs - currentMs;

    // Baseline start timestamp for progress bar
    let setMs = state.targetCountdown.setTimestamp;
    if (!setMs || setMs <= 0 || setMs >= targetMs || (targetMs - setMs) < 60000) {
      // Default baseline: 24 hours prior to target if duration was not recorded
      setMs = targetMs - (24 * 3600 * 1000);
      if (setMs > currentMs) {
        setMs = currentMs - 1000;
      }
    }

    const totalWindowMs = targetMs - setMs;
    const elapsedMs = Math.max(0, currentMs - setMs);
    let progress = totalWindowMs > 0 ? Math.max(0, Math.min(1, elapsedMs / totalWindowMs)) : 0;

    let timeText = '';
    let statusText = '';
    const isCompleted = diffMs <= 0;

    if (isCompleted) {
      progress = 1;
      timeText = '00:00:00';
      statusText = 'Target Reached!';
      if (!state.targetCountdown.hasReached) {
        state.targetCountdown.hasReached = true;
        if (state.settings.soundEnabled) {
          window.StargazerAudio.playChime(state.settings.soundVolume / 100);
        }
        flashCompletionEffect();
      }
    } else {
      state.targetCountdown.hasReached = false;
      timeText = formatRemainingCountdown(diffMs);
      const targetTimeFormatted = formatTargetDateTime(targetDateObj);
      statusText = `Counting down to ${targetTimeFormatted}`;
    }

    const pctText = `${(progress * 100).toFixed(1)}%`;

    // Center Display Swapping: Remaining / Percent / Time
    if (state.timerCenterDisplay === 'remaining') {
      elements.timerTitleBadge.textContent = `${title.toUpperCase()} • TIME UNTIL`;
      elements.timerDisplay.textContent = timeText;
      elements.timerSubText.textContent = isCompleted ? 'Target arrived' : `Target: ${formatTargetDateTime(targetDateObj)} (${pctText} elapsed)`;
    } else if (state.timerCenterDisplay === 'percent') {
      elements.timerTitleBadge.textContent = `${title.toUpperCase()} • PROGRESS`;
      elements.timerDisplay.textContent = pctText;
      elements.timerSubText.textContent = isCompleted ? 'Completed' : `${timeText} remaining until ${title}`;
    } else if (state.timerCenterDisplay === 'time') {
      elements.timerTitleBadge.textContent = 'CURRENT LOCAL TIME';
      elements.timerDisplay.textContent = formattedTime;
      elements.timerSubText.textContent = isCompleted ? `${title} arrived` : `${timeText} until ${title}`;
    }

    elements.timerStatusText.textContent = statusText;

    if (dialTimer) dialTimer.setProgress(progress, false, now);
    if (dialCombTimer) dialCombTimer.setProgress(progress, false, now);

    // Sync Combined mini timer card if active
    elements.combTimerDigits.textContent = isCompleted ? '00:00' : timeText;
    elements.combTimerStatus.textContent = isCompleted ? 'Completed' : `Until ${title}`;
  }

  function formatRemainingCountdown(ms) {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    const hStr = String(hours).padStart(2, '0');
    const mStr = String(minutes).padStart(2, '0');
    const sStr = String(seconds).padStart(2, '0');

    if (days > 0) {
      return `${days}d ${hStr}:${mStr}:${sStr}`;
    }
    return `${hStr}:${mStr}:${sStr}`;
  }

  function formatTargetDateTime(dateObj) {
    const is12 = state.settings.timeFormat === '12';
    let h = dateObj.getHours();
    let ampm = '';
    if (is12) {
      ampm = h >= 12 ? ' PM' : ' AM';
      h = h % 12;
      h = h ? h : 12;
    }
    const hStr = String(h).padStart(2, '0');
    const mStr = String(dateObj.getMinutes()).padStart(2, '0');
    const timeFormatted = `${hStr}:${mStr}${ampm}`;

    const today = getNow();
    const isToday = dateObj.getDate() === today.getDate() &&
                    dateObj.getMonth() === today.getMonth() &&
                    dateObj.getFullYear() === today.getFullYear();

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = dateObj.getDate() === tomorrow.getDate() &&
                      dateObj.getMonth() === tomorrow.getMonth() &&
                      dateObj.getFullYear() === tomorrow.getFullYear();

    if (isToday) return `Today at ${timeFormatted}`;
    if (isTomorrow) return `Tomorrow at ${timeFormatted}`;
    return `${dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${timeFormatted}`;
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
    if (dialStopwatch) dialStopwatch.setProgress(0, true, new Date());
    if (dialCombStopwatch) dialCombStopwatch.setProgress(0, true, new Date());
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
    const now = getNow();
    if (dialStopwatch) dialStopwatch.setProgress(progress, false, now);
    if (dialCombStopwatch) dialCombStopwatch.setProgress(progress, false, now);
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

    // 1-Click Center Display Swapping!
    if (elements.clockCenterClickArea) {
      elements.clockCenterClickArea.addEventListener('click', cycleClockCenterDisplay);
    }
    if (elements.shiftCenterClickArea) {
      elements.shiftCenterClickArea.addEventListener('click', cycleShiftCenterDisplay);
    }
    if (elements.timerCenterClickArea) {
      elements.timerCenterClickArea.addEventListener('click', cycleTimerCenterDisplay);
    }
    if (elements.combCenterClickArea) {
      elements.combCenterClickArea.addEventListener('click', () => {
        if (state.combinedFocal === 'clock') cycleClockCenterDisplay();
        else cycleShiftCenterDisplay();
      });
    }

    // Segmented Center Display Selectors
    if (elements.clockCenterButtons) {
      elements.clockCenterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          state.clockCenterDisplay = btn.dataset.clockCenter;
          state.settings.clockCenterDisplay = state.clockCenterDisplay;
          window.StargazerStorage.set('clockCenterDisplay', state.clockCenterDisplay);
          updateCenterDisplayButtons();
          tickClock();
        });
      });
    }

    if (elements.shiftCenterButtons) {
      elements.shiftCenterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          state.shiftCenterDisplay = btn.dataset.shiftCenter;
          state.settings.shiftCenterDisplay = state.shiftCenterDisplay;
          window.StargazerStorage.set('shiftCenterDisplay', state.shiftCenterDisplay);
          updateCenterDisplayButtons();
          tickClock();
        });
      });
    }

    if (elements.timerCenterButtons) {
      elements.timerCenterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          state.timerCenterDisplay = btn.dataset.timerCenter;
          state.settings.timerCenterDisplay = state.timerCenterDisplay;
          window.StargazerStorage.set('timerCenterDisplay', state.timerCenterDisplay);
          updateCenterDisplayButtons();
          if (state.timerSubmode === 'target') {
            tickTargetCountdown();
          } else {
            updateTimerDisplay();
          }
        });
      });
    }

    // Timer Submode Buttons
    if (elements.btnSubmodeDuration) {
      elements.btnSubmodeDuration.addEventListener('click', () => setTimerSubmode('duration'));
    }
    if (elements.btnSubmodeTarget) {
      elements.btnSubmodeTarget.addEventListener('click', () => setTimerSubmode('target'));
    }

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

    // Timer Duration Controls
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

    // Target Countdown Controls
    if (elements.btnSetTargetCountdown) {
      elements.btnSetTargetCountdown.addEventListener('click', () => {
        const title = elements.targetInputTitle ? elements.targetInputTitle.value.trim() : 'Target Countdown';
        const time = elements.targetInputTime ? elements.targetInputTime.value : '17:00';
        const date = elements.targetInputDate ? elements.targetInputDate.value : '';
        setTargetCountdownValues(title, time, date);
      });
    }

    if (elements.btnClearTargetCountdown) {
      elements.btnClearTargetCountdown.addEventListener('click', () => {
        setTargetCountdownValues('Target Countdown', '17:00', '');
        elements.targetPresetButtons.forEach(b => b.classList.remove('active'));
        elements.timerStatusText.textContent = 'Target cleared';
      });
    }

    if (elements.targetPresetButtons) {
      elements.targetPresetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          elements.targetPresetButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          const preset = btn.dataset.targetPreset;
          const now = getNow();

          if (preset === 'next-hour') {
            const nextHour = new Date(now);
            nextHour.setHours(now.getHours() + 1, 0, 0, 0);
            const hStr = String(nextHour.getHours()).padStart(2, '0');
            const mStr = String(nextHour.getMinutes()).padStart(2, '0');
            const isNextDay = nextHour.getDate() !== now.getDate();
            const dStr = isNextDay ? nextHour.toISOString().split('T')[0] : '';
            setTargetCountdownValues('Next Hour', `${hStr}:${mStr}`, dStr);
          } else if (preset === 'noon') {
            setTargetCountdownValues('Lunch / Noon', '12:00', '');
          } else if (preset === 'evening') {
            setTargetCountdownValues('End of Day (5 PM)', '17:00', '');
          } else if (preset === 'midnight') {
            setTargetCountdownValues('Midnight', '00:00', '');
          } else if (preset === 'tomorrow-morning') {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dStr = tomorrow.toISOString().split('T')[0];
            setTargetCountdownValues('Tomorrow 9 AM', '09:00', dStr);
          }
        });
      });
    }

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

    // Pop Out Window Button in Nav
    if (elements.btnPopout) {
      elements.btnPopout.addEventListener('click', () => {
        if (window.StargazerPopout) {
          window.StargazerPopout.toggle();
        }
      });
    }

    // Pop Out Launch Button in Settings
    if (elements.btnSettingsPopout) {
      elements.btnSettingsPopout.addEventListener('click', () => {
        if (elements.settingsDialog) elements.settingsDialog.close();
        if (window.StargazerPopout) {
          window.StargazerPopout.open();
        }
      });
    }

    // Settings Modal
    elements.btnSettings.addEventListener('click', () => {
      updateEphemerisPreview();
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

    // Pointer Mode Switcher in Settings
    if (elements.settingPointerMode) {
      elements.settingPointerMode.addEventListener('change', () => {
        applyPointerMode(elements.settingPointerMode.value);
      });
    }

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

    // Debug HUD Nav Button & Dialog Actions
    if (elements.btnDebugHud) {
      elements.btnDebugHud.addEventListener('click', () => {
        if (window.StargazerDebug) window.StargazerDebug.toggleHud();
      });
    }
    if (elements.btnOpenDebugHud) {
      elements.btnOpenDebugHud.addEventListener('click', () => {
        if (elements.settingsDialog) elements.settingsDialog.close();
        if (window.StargazerDebug) window.StargazerDebug.toggleHud();
      });
    }
    if (elements.btnResetDebugSim) {
      elements.btnResetDebugSim.addEventListener('click', () => {
        if (window.StargazerDebug) {
          window.StargazerDebug.resetAll();
          if (elements.settingDebugStatus) elements.settingDebugStatus.textContent = 'Live System Time';
        }
      });
    }
  }

  /**
   * Save Settings from Modal to Storage
   */
  function saveSettingsFromUI() {
    if (elements.settingPointerMode) {
      applyPointerMode(elements.settingPointerMode.value);
    }
    if (elements.settingCenterDisplay) {
      state.clockCenterDisplay = elements.settingCenterDisplay.value;
      state.settings.clockCenterDisplay = state.clockCenterDisplay;
      updateCenterDisplayButtons();
    }
    state.settings.starDensity = elements.settingStarDensity.value;
    state.settings.shootingStars = elements.settingShootingStars.checked;
    state.settings.mouseParallax = elements.settingParallax.checked;
    state.settings.timeFormat = elements.settingTimeFormat.value;
    state.settings.showSeconds = elements.settingShowSeconds.checked;
    state.settings.showDate = elements.settingShowDate.checked;
    state.settings.soundEnabled = elements.settingSoundEnabled.checked;
    state.settings.soundVolume = Number(elements.settingSoundVolume.value);

    window.StargazerStorage.saveSettings(state.settings);

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
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (state.activeMode === 'timer') toggleTimer();
        else if (state.activeMode === 'stopwatch') toggleStopwatch();
        else if (state.activeMode === 'combined') toggleTimer();
      }

      if (e.code === 'KeyR') {
        if (state.activeMode === 'timer') resetTimer();
        else if (state.activeMode === 'stopwatch') resetStopwatch();
      }

      if (e.code === 'KeyL' && state.activeMode === 'stopwatch') {
        recordLap();
      }

      // 'T': quick toggle center display between Time / Remaining / %
      if (e.code === 'KeyT') {
        if (state.activeMode === 'clock') cycleClockCenterDisplay();
        else if (state.activeMode === 'shift') cycleShiftCenterDisplay();
        else if (state.activeMode === 'timer') cycleTimerCenterDisplay();
      }

      // 'P': Pop out / dock clock window (Always on Top)
      if (e.code === 'KeyP') {
        if (window.StargazerPopout) {
          window.StargazerPopout.toggle();
        }
      }

      // 'D': Toggle Debug & Time Warp HUD
      if (e.code === 'KeyD') {
        if (window.StargazerDebug) {
          window.StargazerDebug.toggleHud();
        }
      }

      if (e.key === '1') setMode('clock');
      if (e.key === '2') setMode('shift');
      if (e.key === '3') setMode('timer');
      if (e.key === '4') setMode('stopwatch');
      if (e.key === '5') setMode('combined');
    });
  }

  // Global Orchestrator Bridge for Popout and External Controls
  window.StargazerApp = {
    getActiveMode: () => state.activeMode,
    setMode: (m) => setMode(m),
    cycleClockCenter: () => cycleClockCenterDisplay(),
    cycleShiftCenter: () => cycleShiftCenterDisplay(),
    cycleTimerCenter: () => cycleTimerCenterDisplay(),
    setClockArc: (arc) => {
      state.clockArcMode = arc;
      state.settings.clockArc = arc;
      window.StargazerStorage.set('clockArc', arc);
      updateClockArcButtons();
      tickClock();
    },
    toggleTimer: () => toggleTimer(),
    resetTimer: () => resetTimer(),
    isTimerRunning: () => state.timer.isRunning,
    toggleStopwatch: () => toggleStopwatch(),
    resetStopwatch: () => resetStopwatch(),
    recordLap: () => recordLap(),
    isStopwatchRunning: () => state.stopwatch.isRunning
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
