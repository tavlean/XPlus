# XPlus

A cross-browser extension focused on reducing distraction on X with redirect controls, feed cleanup tools, and screen-time tracking. Supports both Chrome and Firefox.

## Features

-   Smart Tab Opening: Open post timestamps in new tabs with delegated event handling
-   Notification Filtering: Per-type notification tab behavior (mentions/replies/likes/retweets)
-   Redirect Controls: Home, Explore, and DM redirects with configurable destinations
-   Feed Cleanup: Hide For You tab, trending sidebar modules, and Who to Follow suggestions
-   Thread Reader: Reader mode for thread pages with keyboard shortcut `R`
-   Keyword Mute Filter: Hide matching posts with reveal placeholders
-   Quick Bookmark: Inject one-click bookmark action into feed cards
-   Screen Time: Daily usage tracking, weekly chart, warning at 80%, hard block at 100%
-   Scheduling: Time-based automatic activation/deactivation of focus settings
-   Focus Friction: Confirmation + snooze flows with badge countdown for active snoozes

## Installation

### Chrome

#### For Development (Unpacked Extension)

1. Clone this repository
2. Run `npm run dev:chrome` to prepare the Chrome extension
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the `dist/chrome-dev` directory

#### For Regular Use (Production)

1. Clone this repository
2. Run `npm run build:chrome` to generate the Chrome distribution file
3. Find the generated `xplus-chrome.zip` in the `dist` directory
4. Open Chrome and navigate to `chrome://extensions/`
5. Enable "Developer mode" in the top right
6. Drag and drop the zip file into the extensions page
    - Alternatively, you can unzip the file and load it using "Load unpacked"

### Firefox

#### For Development (Unpacked Extension)

1. Clone this repository
2. Run `npm run dev:firefox` to prepare the Firefox extension
3. Open Firefox and navigate to `about:debugging`
4. Click "This Firefox" in the left sidebar
5. Click "Load Temporary Add-on..."
6. Select the `manifest.json` file from the `dist/firefox-dev` directory

#### For Regular Use (Production)

1. Clone this repository
2. Run `npm run build:firefox` to generate the Firefox distribution file
3. Find the generated `xplus-firefox.zip` in the `dist` directory
4. Open Firefox and navigate to `about:addons`
5. Click the gear icon and select "Install Add-on From File..."
6. Select the `xplus-firefox.zip` file

## Usage

Once installed, configure features from the popup:

-   Focus redirects (Home/Explore/DM) with per-feature redirect target selection
-   Feed controls (hide For You, trending modules, and suggestions)
-   Utility controls (posts in new tabs, notification filters, quick bookmark, muted words)
-   Usage controls (daily time limit + weekly usage view)
-   Schedule controls (day/time blocks with manual pause)

## Development

The extension is built using Manifest V3 and follows modern browser extension guidelines for both Chrome and Firefox.

Click the extension icon to open the popup and manage features:

**Utility Features:**

-   Posts: open post timestamps in a new tab
-   Notifications: choose which notification types open in new tabs
-   Quick Bookmark: inject one-click bookmark button
-   Muted Words: comma-separated post filtering
-   Daily Limit: enforce time limits with usage chart

**Focus Features:**

-   Home Redirect, Explore Redirect, and DM Redirect with configurable targets
-   Auto-Following Tab (mutually exclusive with Home Redirect)
-   Hide For You tab, trending modules, and suggestion modules
-   Thread Reader mode on thread pages (`R` shortcut)
-   Schedule engine for automatic feature activation during selected windows

### Project Structure

```
├── README.md              # This file
├── LICENSE                # MIT License
├── /src/                  # Extension implementation files (source of truth)
│   ├── /common/           # Shared code for both browsers
│   │   ├── background.js  # Shared service worker for extension lifecycle
│   │   ├── content.js     # Shared content script for page interaction
│   │   ├── redirect.js    # Content script for home page redirection
│   │   ├── redirect-rules.json # Declarative Net Request rules for redirection
│   │   ├── popup.html     # Shared popup UI
│   │   ├── popup.css      # Shared popup styles
│   │   └── popup.js       # Shared popup logic (storage-backed)
│   ├── /chrome/           # Chrome shell (only manifest)
│   │   └── manifest.json  # Chrome Manifest V3
│   └── /firefox/          # Firefox shell (only manifest)
│       └── manifest.json  # Firefox Manifest V3
├── /shared-assets/        # Shared icons and images (source)
│   ├── icon16.png         # 16x16 icon source
│   ├── icon48.png         # 48x48 icon source
│   └── icon128.png        # 128x128 icon source
├── /site/                 # Website files for extension landing page
│   ├── index.html         # Main landing page
│   ├── privacy.html       # Privacy policy page
│   ├── styles.css         # Website styling
│   └── screenshot.png     # Website screenshot
├── /screenshots/          # Store screenshots
│   ├── /chrome/           # Chrome Web Store screenshots
│   └── /firefox/          # Firefox Add-ons screenshots
├── /docs/                 # Additional documentation
│   └── CONTRIBUTING.md    # Contribution guidelines
├── /dist/                 # Dev and build staging (generated, not in repo)
│   ├── chrome-dev/        # Chrome dev folder to load unpacked
│   ├── firefox-dev/       # Firefox dev folder for temporary add-on
│   ├── chrome-build/      # Chrome staging for production zip
│   ├── firefox-build/     # Firefox staging for production zip
│   ├── xplus-chrome.zip    # Chrome Web Store distribution
│   └── xplus-firefox.zip   # Firefox Add-ons distribution
├── .gitignore             # Git ignore file
└── package.json           # NPM package configuration
```

### Building

The project uses npm scripts that stage dev builds into `dist/*-dev` and production builds into `dist/*-build`:

```bash
# Install dependencies (if needed)
npm install

# Development setup - prepares both Chrome and Firefox dev folders under dist/
npm run dev

# Browser-specific development setup (dist/chrome-dev and dist/firefox-dev)
npm run dev:chrome
npm run dev:firefox

# Production builds - stages into dist/*-build then zips
npm run build            # Build both Chrome and Firefox
npm run build:chrome     # Build Chrome (dist/xplus-chrome.zip)
npm run build:firefox    # Build Firefox (dist/xplus-firefox.zip)

# Clean build artifacts
npm run clean
```

Build files are generated in the `dist/` directory:

-   `xplus-chrome.zip` - Ready for submission to the Chrome Web Store
-   `xplus-firefox.zip` - Ready for submission to the Firefox Add-ons store

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
