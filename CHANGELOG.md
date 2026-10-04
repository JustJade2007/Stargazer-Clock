# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-04

### Added
- **Official 1.0.0 Production Release for Web & Desktop**:
  - **General Availability (GA)**: Official landmark v1.0.0 production release of Stargazer Clock, delivering a complete, zero-install, privacy-first web application hosted on GitHub Pages alongside a standalone Windows desktop companion executable (`dist/Stargazer-Clock.exe`).
  - **Five Unified Timekeeping & Pacing Suites (`js/app.js`)**:
    - **Standard Clock**: High-precision 12h/24h digital readout, date display, optional seconds, and versatile radial arc sweeps (24-hour day cycle, 12-hour cycle, or current hour).
    - **Shift & Timeframe Tracker**: Workday and event progression tracking with custom start/end times, dynamic percentage progress fill, elapsed vs. remaining time calculations, and overtime indicators.
    - **Dual-Mode Countdown Timer**: Fixed duration intervals (Pomodoro 25m, Short Break 5m, Rest 15m, Deep Work 45m, Sprint 60m, custom duration) and Time Until / Target Event countdowns (Noon, End of Day, Midnight, custom calendar dates) with synthetic Web Audio chime notifications.
    - **Precision Millisecond Stopwatch**: High-refresh elapsed time counter with 60-second radial sweep dial, split lap tracking, and best/worst lap highlighting.
    - **Combined Ambient Dashboard**: Multi-widget command center presenting a focal master dial alongside live peripheral mini-dials for all active timers, stopwatch, and shift status.
  - **Cosmic Starfield & Ambient Particle Backdrop (`js/stars.js`)**:
    - Multi-layered procedural starfield with twinkling stars, depth parallax motion, and dynamic streaking meteors with particle trails.
    - Integrated atmospheric weather particle system rendering realistic falling rain with ground impact ripples, fluttering snowflakes, drifting misty cloud layers, and celestial thunderstorm lightning flashes.
    - Dynamic atmospheric temperature tinting shifting cosmic nebula tones based on live ambient temperature (icy glacial cyan for cold, cosmic indigo for mild, and warm solar amber for heat).
  - **Astronomical Solar Ephemeris & Dynamic Celestial Pointer (`js/ephemeris.js`, `js/semicircle.js`)**:
    - Built-in, zero-dependency NOAA solar calculation algorithm computing exact local sunrise, sunset, solar noon, and civil dawn/dusk times completely offline.
    - Dynamic radial pointer that seamlessly transitions between a radiant daytime Sun (with 30-minute twilight/golden-hour corona flare) and a detailed nighttime Moon.
    - Realistic lunar phase engine rendering exact physical illumination fractions, craters, and terminator shading across 8 astronomical phases.
  - **Live Geolocation & Weather Engine (`js/weather.js`)**:
    - Automatic HTML5 geolocation with privacy-first in-app consent banner, Open-Meteo live weather data integration, 30-minute smart caching, city geocoding search, and an offline major global cities dictionary.
  - **Always-on-Top Floating Popout Clock (`js/popout.js`, `desktop_launcher.py`)**:
    - Modern Chromium Document Picture-in-Picture API (`documentPictureInPicture.requestWindow`) allowing the clock to float above all windows, IDEs, and full-screen games.
    - Dual view mode toggle (`⌒ Semicircle` ⇄ `𝐓 Text Only`) with dynamic auto-resizing.
    - Win32 desktop pinning daemon maintaining `HWND_TOPMOST` z-order priority across external application focus changes.
    - In-popout interactive mode switcher, timer/stopwatch controls, and center metric swapping.
  - **Interactive 1-Click Center Metric Swapping (`js/app.js`)**:
    - Seamlessly cycle the central display between **Current Time**, **Time Left / Remaining**, and **Percentage (%)** via direct clicks on the dial numbers, segmented UI controls, or the <kbd>T</kbd> keyboard shortcut.
  - **Debug & Time Warp Simulation Suite (`js/debug.js`)**:
    - Draggable glassmorphic HUD panel (<kbd>D</kbd> shortcut or top nav 🛠️ button) enabling time acceleration (0x freeze up to 1440x warp speed), manual date/time overrides, global timezone conversions, lunar phase sliders, weather condition simulations, and temperature testing.
    - Floating cosmic indicator banner with one-click return to live system time.
  - **Zero-Dependency Web Audio Notifications (`js/audio.js`)**:
    - Harmonic chord chime bells synthesized entirely via the Web Audio API with zero audio file downloads or bandwidth overhead.
  - **100% Client-Side Privacy & Persistence (`js/storage.js`)**:
    - Local state synchronization across cookies and `localStorage` with zero accounts, no cloud database requirements, and one-click JSON export/import.
    - Five tailored celestial visual themes: Starlight Cyan, Nebula Purple, Solar Gold, Aurora Green, and Supernova Red.
  - **Cross-Platform Delivery**:
    - Instant browser access via GitHub Pages with responsive high-DPI canvas rendering.
    - Standalone single-file Windows executable (`dist/Stargazer-Clock.exe`) with embedded assets and dedicated desktop launcher.

## [0.8.0] - 2026-10-04

### Added
- **Location-Based Dynamic Sun/Moon Transitions & Ambient Weather Backdrop (Issue #5)**:
  - **Solar Ephemeris Engine (`js/ephemeris.js`)**: Implemented high-precision client-side NOAA astronomical algorithm to calculate local sunrise, sunset, solar noon, and civil dawn/dusk times completely offline with zero network latency.
  - **Dynamic Sun/Moon Transitions (`js/semicircle.js`, `js/app.js`)**: Connected dial celestial pointer state to real-world local sunrise and sunset times, complete with a ~30-minute twilight/golden-hour corona flare and horizon glow.
  - **Live Weather & Geolocation Engine (`js/weather.js`)**: Integrated keyless Open-Meteo weather API with 30-minute localStorage caching, offline fallback, HTML5 browser geolocation request workflow, and full city geocoding search plus offline major global cities dictionary.
  - **Atmospheric Backdrop & Particle Engine (`js/stars.js`)**: Added dynamic particle effects directly on the cosmic canvas for rain streaks with ground impact ripples, gently fluttering snow, rolling misty clouds, and celestial thunderstorm lightning flashes.
  - **Atmospheric Temperature Wash (`js/stars.js`)**: Deep space nebula dynamically adjusts ambient tone according to live temperature (icy glacial cyan for cold, cosmic indigo for mild, and warm solar amber for heat).
  - **In-App Permission Consent Banner & UI (`index.html`, `css/style.css`, `js/app.js`)**: Elegant floating consent banner explaining benefits with "Enable Location", "Select City", and "Maybe Later" options. Added clickable top-nav weather badge and dedicated Settings section for location, city search, temperature units (°C / °F), and weather backdrop toggle.
  - **Debug Simulation HUD (`js/debug.js`)**: Added weather condition chips (Clear, Clouds, Rain, Snow, Thunder, Fog) and simulated temperature slider (-20°C to 45°C) to allow instant testing and demonstration without waiting for weather changes.

## [0.7.4] - 2026-10-04

### Fixed
- **Pop-out Window Animated Clock Rendering (Issue #8 - `js/semicircle.js`, `js/popout.js`)**:
  - Resolved bug where the floating pop-out window only rendered text and failed to display the animated semicircle clock component.
  - Fixed constructor namespace mismatch where `js/popout.js` was querying `window.SemicircleDial`, while `js/semicircle.js` exported `window.StargazerDial`. Added dual global exports (`window.StargazerDial` and `window.SemicircleDial`) and updated `initPipDial()` to fallback safely.
  - Updated `SemicircleDial` to bind window resize listeners dynamically to the canvas's containing window context (`ownerDocument.defaultView`), ensuring Document Picture-in-Picture windows calculate proper high-DPI canvas dimensions rather than defaulting to unstyled 300×150 buffers.
  - Implemented idempotent `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` for context scaling and added formal `destroy()` cleanup.
  - Ensured the celestial pointer (Sun / Moon / Orb) is always rendered at the starting angle (`Math.PI`) even when progress is 0.0% (e.g. before a shift begins or on countdown reset), preventing empty tracks.
  - Added automatic theme color synchronization (`setColors`) and layout settle callbacks for the popout dial.
  - Recompiled standalone executable `dist/Stargazer-Clock.exe` (9.91 MB).

## [0.7.3] - 2026-10-04

### Fixed
- **Chromium Document Picture-in-Picture Origin Title Recognition & DPI Scaling (`desktop_launcher.py`, `js/popout.js`)**:
  - Fixed an issue where the pinned popout window did not stay on top because Chromium's Document Picture-in-Picture native window sets its OS title to the origin/port (e.g. `127.0.0.1:<port>` or `localhost`), which was bypassed by previous title matching filters.
  - Expanded physical window bounds matching up to `880x750` to fully support Windows high-DPI display scaling (125%, 150%, 175%, 200%) and user resizing without dropping topmost management.
  - Removed origin patterns from `is_main_window()` to eliminate edge cases where large or scaled Document PiP windows were falsely classified as the main window and stripped of topmost status.
  - Hardened `apply_window_pin()` using `SetWindowLongPtrW` with `SWP_FRAMECHANGED` and refined the background maintenance daemon to hold `HWND_TOPMOST` z-order priority across external application focus changes.
  - Recompiled standalone executable `dist/Stargazer-Clock.exe` (9.91 MB) to incorporate all latest launcher and script fixes.

## [0.7.2] - 2026-10-04

### Fixed
- **Persistent Always-on-Top Pinning Across External Focus Changes (`desktop_launcher.py`, `js/popout.js`, `js/app.js`, `index.html`)**:
  - Fixed an issue where the popout window was pushed to the background whenever an external application (e.g. editor, browser, explorer) took focus.
  - Added physical dimension-aware window discrimination (`is_popout_window()` vs `is_main_window()`) checking geometry (`w < 550 && h < 500`) alongside title keywords (`popout`, `picture-in-picture`, `pip`), eliminating false positives where `unpin_main_windows()` inadvertently demoted the popout window.
  - Set `SWP_FRAMECHANGED` and continuous `SWP_NOACTIVATE` Z-order maintenance in the background daemon (every 300ms) to maintain topmost position over external windows without stealing keyboard/mouse focus from the user.
  - Bound `blur` and `focus` event listeners inside the popout window (both Document PiP and popup fallback) to pulse `/api/pin` whenever the window loses focus.
  - Added early inline title assignment in `index.html` to guarantee the popout title `Stargazer Popout (Pinned)` is active immediately before any DOM or stylesheet parsing occurs.
  - Expanded browser detection to locate Microsoft EdgeCore (Windows on ARM / WebView), Samsung Internet, Brave, and Opera via Windows Registry `App Paths` and directory discovery.

## [0.7.1] - 2026-09-25

### Fixed
- **Popout Window Topmost Z-Order & Flickering (`desktop_launcher.py`, `js/popout.js`, `js/app.js`)**:
  - Eliminated window z-order fighting where the popout was pushed behind the main application window. The desktop launcher previously matched the main window ("Stargazer Clock") when querying for windows to pin, inadvertently setting `HWND_TOPMOST` on the main window.
  - Implemented `unpin_main_windows()` on launcher startup and during popout pin events to strictly force the main application window into the normal non-topmost window layer (`HWND_NOTOPMOST`), guaranteeing the popout widget is always in front.
  - Removed the aggressive 400ms `SetWindowPos` loop in the pinning daemon which caused window repaints and visual flickering; replaced with a passive 2-second style check that only re-applies if `WS_EX_TOPMOST` was lost.
  - Explicitly separated window titles: the popout window is given the distinct title `Stargazer Popout (Pinned)`, preventing title matching conflicts with the main window.
  - Added programmatic `.focus()` calls when creating the popout to immediately surface it in front.

## [0.7.0] - 2026-09-25

### Added
- **Debug & Time Warp Simulation Engine (`js/debug.js`, `index.html`, `css/style.css`, `js/app.js`, `js/semicircle.js`, `js/storage.js`)**:
  - **Manual Time & Date Overrides**: Full control to set specific target clock hours, minutes, seconds, and calendar dates with instant feedback on all dial trackers.
  - **Live Time Acceleration (Warp Speed Multipliers)**: Interactive speed chips for `0x Freeze`, `1x Realtime`, `10x`, `60x` (1 minute elapsed per second), and `1440x` (1 full day elapsed per minute) to stress-test celestial transitions and dial sweep behavior.
  - **Celestial Preset Jumps**: One-click quick-jump buttons to `🌅 Dawn (06:00)`, `☀️ Noon (12:00)`, `🌇 Dusk (18:00)`, and `🌙 Midnight (00:00)`.
  - **Global Timezone Overrides**: Dynamic timezone conversion supporting local system time, UTC/GMT, New York, Chicago, Denver, Los Angeles, London, Paris, Tokyo, Shanghai, India, Sydney, and arbitrary decimal custom UTC offsets (±14h).
  - **Manual Moon Stage & Lunar Phase Simulator**: Real-time slider (0% to 100%) and 8 phase presets (`🌑 New Moon`, `🌒 Waxing Crescent`, `🌓 First Quarter`, `🌔 Waxing Gibbous`, `🌕 Full Moon`, `🌖 Waning Gibbous`, `🌗 Last Quarter`, `🌘 Waning Crescent`, and `🔄 Auto Live Ephemeris`). Directly overrides dial pointer lunar renderings, illumination fractions, and status text.
  - **Celestial Pointer Force Mode**: Force the dial indicator to `☀️ Sun`, `🌙 Moon`, or `Auto` day/night tracking.
  - **Floating Glassmorphic Debug HUD**: Press <kbd>D</kbd> or click the 🛠️ icon in the top header or settings dialog to display an interactive, draggable glassmorphic HUD panel with live time readouts, speed chips, and instant resets.
  - **Persistent Simulation Active Banner**: Luminous floating cosmic pill at the top of the screen clearly indicating simulated time is active, with 1-click `Controls` and `Reset Time` actions to ensure users never remain trapped in simulated time.
  - **Centralized StargazerTime Provider**: Synchronized time provider used across Clock, Shift Tracker, Target Countdowns, Ephemeris, Dials, and Popout Floating Windows.

## [0.6.0] - 2026-09-25

### Fixed
- **OS-Level Window Pinning Above All Applications (`desktop_launcher.py`, `js/popout.js`)**:
  - Resolved 64-bit Windows ctypes integer truncation on `HWND_TOPMOST` handle pointer (`wintypes.HWND(-1)` vs 32-bit int), which previously caused Windows to place the window over the taskbar but not in front of active applications.
  - Added extended window style flag `WS_EX_TOPMOST` via `SetWindowLongPtrW`.
  - Added a background pinning daemon thread in `desktop_launcher.py` that continuously asserts the topmost z-order position, guaranteeing the window stays in front of all open applications.

### Added
- **Semicircle vs. Just Text View Toggle (`js/popout.js`, `css/style.css`, `js/storage.js`)**:
  - Added a one-click view toggle button (`⌒ Semicircle` ⇄ `𝐓 Text Only`) in the floating window header.
  - In **Text Only** mode, hides the semicircle canvas and presents a streamlined HUD displaying prominently centered digital numbers/time, badges, and status.
  - Automatically resizes the window dynamically (`270×230` for Semicircle mode, `270×135` for Text Only mode).
  - Persists the user's view mode preference in cookies and storage.
- **Compact Default Sizing & Streamlined Controls (`js/popout.js`, `css/style.css`)**:
  - Reduced the default floating window size by over 50% for a cleaner, non-intrusive desktop experience.
  - Minimalist layout focused strictly on the semicircle (or text), large primary digits, and essential control buttons.

## [0.5.0] - 2026-09-25

### Added
- **Moon & Galaxy App Icon Design (`assets/icon.png`, `assets/icon.ico`, `build.py`, `index.html`, `README.md`)**:
  - Created celestial app emblem depicting a luminous detailed moon surrounded by a cosmic swirling galaxy and starlight nebula.
  - Generated multi-resolution Windows icon (`assets/icon.ico`) with 16px to 256px mipmaps embedded directly into the standalone Windows executable (`Stargazer-Clock.exe`).
  - Added high-resolution favicon links (`assets/icon.png`, `assets/icon.ico`) and apple-touch-icon for web browser and GitHub Pages usage.
  - Featured the cosmic moon and galaxy icon directly in the application's top navigation brand bar and the top of `README.md`.

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
