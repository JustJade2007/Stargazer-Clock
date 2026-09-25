# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-09-25

### Added
- **Pop Out & Always-on-Top Pinned Window (`js/popout.js`, `desktop_launcher.py`, `index.html`, `css/style.css`, `js/app.js`)**:
  - Added ability to pop out the currently displayed clock into a floating, compact window.
  - Native **OS-level Always-on-Top Pinning** via Chromium/Edge **Document Picture-in-Picture API** (`documentPictureInPicture.requestWindow`), keeping the floating clock pinned above all windows, games, and applications.
  - Desktop executable Windows API pinning support (`/api/pin`) using `ctypes.windll.user32.SetWindowPos(HWND_TOPMOST)` for standalone launcher and fallback popups.
  - Interactive mini popout header with quick mode switcher tabs (Clock, Shift Tracker, Timer, Stopwatch), Pin status/toggle button (`📌 Pinned on Top`), and Dock back button (`⤵ Dock`).
  - Context-sensitive mini controls inside the popout window: start/pause/reset for Timer, start/pause/lap for Stopwatch, arc toggles for Clock, and status info for Shift.
  - 1-click center display swapping directly inside the popout window (Time ⇄ Time Left ⇄ %).
  - Top navigation launch button (`#btn-popout`), settings dialog launcher, and global keyboard shortcut <kbd>P</kbd> to pop out and dock the floating clock.

## [0.3.0] - 2026-09-25

### Added
- **Timer Sub-Mode Architecture (`index.html`, `js/app.js`, `js/storage.js`, `css/style.css`)**:
  - Expanded Timer mode to seamlessly toggle between **Duration Timer** (countdown from a fixed duration, e.g. 25m, 45m) and **Time Until / Countdown** (countdown to a specific target clock time/event, e.g. 17:00, lunch, or custom date & time).
  - Added dedicated sub-mode switcher with persistent state saved in cookies/localStorage.
  - Added quick target presets: **Next Hour**, **Lunch / Noon (12:00)**, **End of Day (5:00 PM)**, **Midnight (00:00)**, and **Tomorrow 9 AM**.
  - Custom target event inputs supporting custom title label, target time (`HH:MM`), and optional target date (`YYYY-MM-DD`).
  - Seamless integration with the 1-click center display swapping: switch between **Time Left**, **Percentage Elapsed**, and **Current Local Time** in both timer sub-modes.
  - Automatic chime alert and radial pulse effect when the target event arrives.

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
