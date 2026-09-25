# Stargazer Clock 🌌⏱️

> **A cosmic desktop backdrop & customizable semicircle clock designed for work sessions, long events, and watching time pass by.**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Status: In Development](https://img.shields.io/badge/Status-In%20Development-orange.svg)](#roadmap)
[![Platform: Web | Desktop](https://img.shields.io/badge/Platform-Web%20%7C%20Windows%20(.exe)-purple.svg)](#deployment--packaging)

---

## Overview

**Stargazer-Clock** is a versatile timekeeping and progress visualization application created to serve as an ambient, aesthetic backdrop on your desktop during work, study, or extended events. Combining a serene starry cosmos backdrop with an intuitive semicircle dial, it offers both precision tracking and calm visual pacing as your day unfolds.

Whether run directly in your browser, hosted as a local service, or launched as a standalone lightweight desktop executable (`.exe`), Stargazer-Clock keeps you oriented without clutter or distraction.

---

## Key Features

### 🌌 1. Cosmic Display & Aesthetics
- **Starry Background:** Immersive, animated starry canvas with subtle twinkling stars and depth parallax designed for minimal CPU usage.
- **Semicircle Dial Interface:** A prominent curved radial dial that provides an intuitive visual arc of time elapsed and time remaining.
- **Clean Ambient UI:** Minimalist typography and sleek contrast tuned for dark desktop environments and second-monitor backdrops.

### ⏱️ 2. Time Tracking Modes
- **Standard Clock:** Crisp digital and radial representation of current local time with 12h/24h toggles and optional seconds.
- **Timeframe / Shift Tracker:** Visual progress mapped across a custom scheduled window (e.g. tracking an entire workday shift from `08:00` to `17:00` as the arc fills).
- **Countdown Timers:** Configurable countdown timers with intuitive interval controls and non-intrusive completion notifications.
- **Precision Stopwatch:** Fast elapsed-time counter with lap/split support for tracking focused intervals or activities.
- **Combined View:** Simultaneous display mode presenting the clock, active timers, and stopwatch within a harmonious dashboard layout.

### 🍪 3. Client-Side Persistence
- **Cookie & Local Storage Retention:** Preserves chosen theme accents, display preferences, shift schedules, and custom timer setups locally across launches with zero login required.
- **Privacy-First:** Operates 100% client-side with no tracking, telemetry, or remote server dependencies.

### 🚀 4. Deployment & Packaging
- **GitHub Pages:** Instant, one-click access directly in the web browser without any local installation.
- **Local Web App:** Lightweight web application that can be run on any local development server.
- **Desktop Executable:** Packaged as a standalone Windows executable (`.exe`) optimized to run as a borderless or floating ambient widget.

---

## Modes Breakdown

```
       .---.          .---.          .---.          .---.
      /     \        /     \        /     \        /     \
     | Clock |      | Shift |      | Timer |      | Stopw |
      \     /        \     /        \     /        \     /
       '---'          '---'          '---'          '---'
         \              |              |              /
          \             |              |             /
           ▼            ▼              ▼            ▼
     ┌─────────────────────────────────────────────────────┐
     │           🌌 STARGAZER SEMICIRCLE DIAL 🌌           │
     │                                                     │
     │                ╭───────────────╮                    │
     │              ╱   14:32:08 EST    ╲                  │
     │             │  [■■■■■■■□□□□□] 62% │                 │
     │                                                     │
     │        Combined Multi-Widget Ambient Layout         │
     └─────────────────────────────────────────────────────┘
```

| Mode | Purpose | Primary Indicator |
|---|---|---|
| **Clock** | Everyday current time awareness | Arc progress across current hour / day |
| **Shift Tracker** | Tracking work shifts and event milestones | Arc progress from shift start time to shift end time |
| **Timer** | Dedicated task countdowns & time-until events | Dual sub-modes: standard duration countdown or target countdown to a specific time/date |
| **Stopwatch** | Elapsed focus sessions and sprints | Continuous arc sweep with lap tracking |
| **Combined** | Comprehensive multi-monitoring | Central clock flanked by active timer and stopwatch gauges |

---

## Repository Structure

```
Stargazer-Clock/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md          # Structured bug report template
│   │   └── feature_request.md     # Feature and enhancement proposal template
│   └── pull_request_template.md   # PR checklist and contribution structure
├── .gitignore                     # Git ignore rules for build, AI tools, and secrets
├── CHANGELOG.md                   # Full version history and release notes
├── CONTRIBUTING.md                # Contribution guidelines and coding conventions
├── LICENSE                        # GNU General Public License v3.0
├── README.md                      # Project documentation and roadmap
├── SECURITY.md                    # Security policy and disclosure guidelines
└── keys.md                        # Registry for environment variables and secrets (ignored)
```

---

## Quick Start & Usage

### 1. Browser & GitHub Pages
Simply open [index.html](file:///c:/Users/jacob/OneDrive/Desktop/Coding/Stargazer-Clock/index.html) in any modern web browser, or host on GitHub Pages:
```bash
# Optional local development server
python -m http.server 8000
# Open http://localhost:8000 in your browser
```

### 2. Standalone Windows Desktop App (.exe)
Run the pre-compiled portable executable:
```bash
dist/Stargazer-Clock.exe
```
Or launch directly from Python:
```bash
python desktop_launcher.py
```

### 3. Rebuild Desktop Executable
To recompile the standalone single-file executable at any time:
```bash
python build.py
```
Outputs: `dist/Stargazer-Clock.exe` (Standalone windowed application with embedded web assets).

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| <kbd>Space</kbd> | Start / Pause active timer or stopwatch |
| <kbd>R</kbd> | Reset active timer or stopwatch |
| <kbd>L</kbd> | Record lap split (Stopwatch mode) |
| <kbd>T</kbd> | Cycle center display (Current Time ⇄ Time Left ⇄ %) |
| <kbd>1</kbd> - <kbd>5</kbd> | Quick switch between Clock, Shift, Timer, Stopwatch, and Combined |
| <kbd>F11</kbd> | Toggle ambient fullscreen mode |

---

## Roadmap

- [x] Repository initialization, project documentation, and issue templates.
- [x] Core HTML5/Canvas cosmic starry backdrop engine with meteor streaks and parallax.
- [x] SVG/Canvas dynamic semicircle radial gauge component with glowing pointer.
- [x] Clock, Shift Tracker, Countdown Timer, and Stopwatch modules.
- [x] Combined multi-widget ambient dashboard.
- [x] Cookie and localStorage state synchronization.
- [x] Web Audio API synthetic celestial chime notifications on timer completion.
- [x] Standalone desktop package build script (`dist/Stargazer-Clock.exe`).
- [ ] Automated GitHub Pages deployment workflow.

---

## Contributing

Contributions, feedback, and suggestions are warmly welcomed! Please check [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on code style, branch workflows, and submitting pull requests.

---

## Security

For security vulnerability reporting and policies, please review [SECURITY.md](SECURITY.md).

---

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
