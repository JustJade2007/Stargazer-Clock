/**
 * Stargazer Storage Engine
 * Provides persistent configuration using browser cookies with automatic
 * localStorage synchronization for local file:// and offline resilience.
 */

(function (window) {
  'use strict';

  const COOKIE_PREFIX = 'stargazer_';
  const COOKIE_MAX_AGE_DAYS = 365;

  const DEFAULT_SETTINGS = {
    theme: 'cyan',
    activeMode: 'clock',
    clockArc: 'day', // 'day' (24h), 'hour' (60m), 'halfday' (12h)
    timeFormat: '12', // '12' or '24'
    showSeconds: true,
    showDate: true,
    soundEnabled: true,
    soundVolume: 70,
    starDensity: 'medium',
    shootingStars: true,
    mouseParallax: true,
    shiftSettings: {
      title: 'Workday Shift',
      startTime: '08:00',
      endTime: '17:00'
    },
    timerSettings: {
      totalSeconds: 25 * 60,
      activePreset: '25'
    },
    timerSubmode: 'duration', // 'duration' or 'target'
    targetCountdownSettings: {
      title: 'Target Countdown',
      targetTime: '17:00',
      targetDate: '',
      setTimestamp: 0
    },
    combinedFocal: 'clock',
    centerDisplayMode: 'time', // 'time', 'remaining', 'percent'
    popoutViewMode: 'dial', // 'dial' (semicircle + text) or 'text' (text only)
    pointerMode: 'auto' // 'auto', 'sun', 'moon', 'orb'
  };

  const Storage = {
    /**
     * Reads a cookie value by key
     */
    getCookie(key) {
      try {
        const name = encodeURIComponent(COOKIE_PREFIX + key) + '=';
        const cookies = document.cookie ? document.cookie.split(';') : [];
        for (let i = 0; i < cookies.length; i++) {
          let c = cookies[i].trim();
          if (c.indexOf(name) === 0) {
            const rawVal = decodeURIComponent(c.substring(name.length));
            try {
              return JSON.parse(rawVal);
            } catch (e) {
              return rawVal;
            }
          }
        }
      } catch (e) {
        console.warn('Cookie read error:', e);
      }
      return null;
    },

    /**
     * Writes a cookie value by key with expiration
     */
    setCookie(key, value) {
      try {
        const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        const date = new Date();
        date.setTime(date.getTime() + (COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000));
        const expires = '; expires=' + date.toUTCString();
        // SameSite=Lax and path=/ for cross-page persistence
        document.cookie = encodeURIComponent(COOKIE_PREFIX + key) + '=' + encodeURIComponent(valStr) + expires + '; path=/; SameSite=Lax';
      } catch (e) {
        console.warn('Cookie write error:', e);
      }
    },

    /**
     * Delete a cookie by key
     */
    deleteCookie(key) {
      document.cookie = encodeURIComponent(COOKIE_PREFIX + key) + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    },

    /**
     * Synchronized getter: checks cookie first, falls back to localStorage, then default.
     */
    get(key, fallback = null) {
      // 1. Try Cookie
      let val = this.getCookie(key);
      if (val !== null && val !== undefined) {
        return val;
      }

      // 2. Try localStorage (e.g. for file:/// origins or strict cookie policies)
      try {
        const localVal = localStorage.getItem(COOKIE_PREFIX + key);
        if (localVal !== null) {
          try {
            return JSON.parse(localVal);
          } catch (e) {
            return localVal;
          }
        }
      } catch (e) {
        // Storage access might be restricted in some sandboxes
      }

      // 3. Fallback to default
      if (fallback !== null) return fallback;
      return DEFAULT_SETTINGS[key] !== undefined ? DEFAULT_SETTINGS[key] : null;
    },

    /**
     * Synchronized setter: writes to both cookie and localStorage
     */
    set(key, value) {
      this.setCookie(key, value);
      try {
        localStorage.setItem(COOKIE_PREFIX + key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      } catch (e) {
        // Fallback silently if localStorage quota is exceeded or restricted
      }
    },

    /**
     * Loads all current settings merged with defaults
     */
    loadSettings() {
      const settings = {};
      for (const key of Object.keys(DEFAULT_SETTINGS)) {
        settings[key] = this.get(key, DEFAULT_SETTINGS[key]);
      }
      return settings;
    },

    /**
     * Saves a batch settings object
     */
    saveSettings(settings) {
      for (const [key, val] of Object.entries(settings)) {
        this.set(key, val);
      }
    },

    /**
     * Resets all settings to factory defaults
     */
    resetDefaults() {
      for (const key of Object.keys(DEFAULT_SETTINGS)) {
        this.deleteCookie(key);
        try {
          localStorage.removeItem(COOKIE_PREFIX + key);
        } catch (e) {}
      }
      return { ...DEFAULT_SETTINGS };
    },

    /**
     * Exports settings as a downloadable JSON string
     */
    exportJSON() {
      const settings = this.loadSettings();
      return JSON.stringify(settings, null, 2);
    },

    /**
     * Imports and validates settings from JSON
     */
    importJSON(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        for (const [key, val] of Object.entries(parsed)) {
          if (DEFAULT_SETTINGS[key] !== undefined) {
            this.set(key, val);
          }
        }
        return true;
      } catch (e) {
        console.error('Invalid JSON configuration import:', e);
        return false;
      }
    }
  };

  window.StargazerStorage = Storage;
})(window);
