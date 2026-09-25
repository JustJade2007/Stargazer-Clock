# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-09-25

### Added
- **Dynamic Starry Background Canvas (`js/stars.js`)**:
  - Multi-layered starfield with realistic twinkling stars, variable brightness, and diffraction spikes.
  - Streaking meteor/shooting star generation with particle trails and luminous head glow.
  - Interactive mouse parallax motion with configurable sensitivity.
  - Performance modes (low, medium, high star density).
- **Celestial Semicircle Dial Engine (`js/semicircle.js`)**:
  - High-DPI canvas-based 180° radial semicircle gauge with smooth interpolation.
  - Micro-graduated major/minor tick marks with percentage and time interval labels.
  - Glowing progress needle pointer with radiant light halo.
  - Dynamic gradient arc tracking with customizable celestial color palettes.
- **Five Specialized Time Tracking Modes (`js/app.js`)**:
  - **Standard Clock**: 12h/24h toggle, AM/PM indicator, seconds toggle, full date display, and flexible arc tracking (day, hour, 12h cycle).
  - **Shift & Timeframe Tracker**: Custom shift title, start time, end time, real-time percentage completion, elapsed/remaining time, and overtime indicators.
  - **Countdown Timer**: Configurable duration, quick presets (Pomodoro 25m, Break 5m, Rest 15m, Focus 45m, Sprint 60m), start/pause/reset, and visual alert on zero.
  - **Precision Stopwatch**: Millisecond accuracy, start/pause/reset, dynamic 60s sweep dial, lap counter, split times, and fastest/slowest lap detection.
  - **Combined Multi-Widget Dashboard**: Simultaneous monitoring with focal master dial (Clock or Shift) alongside mini dials for active timers, stopwatch, and shift status.
- **Web Audio API Celestial Chime (`js/audio.js`)**:
  - Synthesized harmonic chord bells on timer completion with zero external audio assets.
  - Volume slider and chime test trigger.
- **Cookie & LocalStorage Persistence Engine (`js/storage.js`)**:
  - Synchronized cookie storage with fallback to localStorage for all settings and presets.
  - Export and import configuration as JSON.
- **Interactive Central Metric Swapping (`js/app.js`, `index.html`)**:
  - Central big display can now be seamlessly toggled between **Current Time**, **Time Left / Remaining**, and **Percentage (%)** across Clock, Shift Tracker, and Timer modes.
  - Interactive 1-click swapping directly on the dial numbers, dedicated segmented control selectors, and quick <kbd>T</kbd> keyboard shortcut.
  - Persistent preferences retained in cookies and local storage.
- **Astronomical Sun & Moon Phase Pointer (`js/semicircle.js`, `js/app.js`)**:
  - Semicircle progress indicator transforms into a radiant Sun with golden corona rays during daylight hours (06:00 to 18:00).
  - Automatically transitions to an astronomically calculated Moon at night matching the true lunar phase (New Moon, Waxing/Waning Crescent, First/Last Quarter, Waxing/Waning Gibbous, Full Moon) with detailed terminator shading and craters.
  - Live celestial ephemeris status display in bottom status bar and Settings dialog with customizable indicator modes (Auto, Always Moon, Always Sun, Classic Orb).
- **Desktop Executable Packaging (`desktop_launcher.py`, `build.py`)**:
  - Standalone single-file Windows executable (`dist/Stargazer-Clock.exe`) compiled with PyInstaller in windowed mode.
  - Dedicated Microsoft Edge App Mode runner with fallback to default browser.
### Fixed
- **Semicircle Progress Arc Direction & Coordinates (`js/semicircle.js`)**: Fixed canvas arc angle orientation and clockwise sweep direction so the progress fill tracks seamlessly across the upper arch from 0% to 100% instead of clipping below the baseline.
- **Build Script Process Lock Handling (`build.py`)**: Automatically terminates active desktop processes before compiling to prevent Windows executable write lock errors.

## [0.1.0] - 2026-09-25

### Added
- **Repository Architecture & Baseline Setup**:
  - Configured project `.gitignore` covering client-side AI tools (Antigravity), TODO documents, private secrets, and build targets.
  - Initialized maintained secrets and environment variables registry in `keys.md`.
  - Created `README.md` documenting project vision, feature specifications, UI architecture, modes, and deployment targets.
  - Established `CHANGELOG.md` following Keep a Changelog specifications.
  - Added `SECURITY.md` detailing security policies and responsible disclosure.
  - Configured `CONTRIBUTING.md` and GitHub pull request template `.github/pull_request_template.md`.
  - Added issue templates for structured bug reports and feature requests.
