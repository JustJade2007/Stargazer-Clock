/**
 * Stargazer Audio Chime Engine
 * Synthesizes harmonious celestial bell tones via Web Audio API.
 * Requires zero external audio files, completely offline and lightweight.
 */

(function (window) {
  'use strict';

  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  const AudioEngine = {
    /**
     * Plays a celestial chime bell sound with harmonic resonance
     * @param {number} volume 0 to 1
     */
    playChime(volume = 0.7) {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), now);
      masterGain.connect(ctx.destination);

      // Frequencies for a celestial major chord chime (E5, B5, G#6)
      const frequencies = [659.25, 987.77, 1661.22];

      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        // Sine wave for crystal pure tone
        osc.type = index === 2 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);

        // Slight micro-pitch bend for shimmer
        osc.frequency.exponentialRampToValueAtTime(freq * 0.998, now + 2.5);

        // Envelope: instant attack, long ethereal decay
        const startTime = now + (index * 0.08); // Slight arpeggiation
        noteGain.gain.setValueAtTime(0, startTime);
        noteGain.gain.linearRampToValueAtTime(0.35 / (index + 1), startTime + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 2.8);

        osc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + 3.0);
      });
    },

    /**
     * Play a quick subtle click / tick feedback sound
     */
    playTick(volume = 0.2) {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

      gain.gain.setValueAtTime(volume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    }
  };

  // Resume audio context on first user click anywhere in the window
  window.addEventListener('click', function unlockAudio() {
    getAudioContext();
    window.removeEventListener('click', unlockAudio);
  }, { once: true });

  window.StargazerAudio = AudioEngine;
})(window);
