# XTab

A cross-browser extension that automatically opens X/Twitter post links and notifications in new tabs when clicked. Supports both Chrome and Firefox.

## Features

-   Automatically opens X post links in new tabs when clicking on post timestamps
-   Automatically opens notifications in new tabs when clicking the notifications link
-   Works with dynamically loaded content
-   Only affects specific links (posts and notifications), leaving other links unchanged
-   Lightweight and efficient

## Installation

### Chrome

#### For Development (Unpacked Extension)

1. Clone this repository
2. Run `npm run dev:chrome` to prepare the Chrome extension
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the `src/chrome` directory

#### For Regular Use (Production)

1. Clone this repository
2. Run `npm run build:chrome` to generate the Chrome distribution file
3. Find the generated `xtab-chrome.zip` in the `dist` directory
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
6. Select the `manifest.json` file from the `src/firefox` directory

#### For Regular Use (Production)

1. Clone this repository
2. Run `npm run build:firefox` to generate the Firefox distribution file
3. Find the generated `xtab-firefox.zip` in the `dist` directory
4. Open Firefox and navigate to `about:addons`
5. Click the gear icon and select "Install Add-on From File..."
6. Select the `xtab-firefox.zip` file

## Usage

Once installed, the extension will automatically:

-   Detect post links on X (Twitter) and open them in new tabs when clicking on post timestamps
-   Detect the notifications link in the left sidebar and open it in a new tab when clicked
-   Work with both static and dynamically loaded content

## Development

The extension is built using Manifest V3 and follows modern browser extension guidelines for both Chrome and Firefox.

### Project Structure

```
├── README.md              # This file
├── LICENSE                # MIT License
├── /src/                  # Extension implementation files
│   ├── /common/           # Shared code used by both browsers
│   │   ├── background.js  # Shared service worker for extension lifecycle
│   │   └── content.js     # Shared content script for page interaction
│   ├── /chrome/           # Chrome extension files
│   │   ├── assets/        # Extension icons
│   │   │   ├── icon16.png # 16x16 icon
│   │   │   ├── icon48.png # 48x48 icon
│   │   │   └── icon128.png # 128x128 icon
│   │   ├── manifest.json  # Chrome extension manifest (Manifest V3)
│   │   ├── background.js  # Symbolic link to ../common/background.js
│   │   └── content.js     # Symbolic link to ../common/content.js
│   └── /firefox/          # Firefox extension files
│       ├── assets/        # Extension icons
│       │   ├── icon16.png # 16x16 icon
│       │   ├── icon48.png # 48x48 icon
│       │   └── icon128.png # 128x128 icon
│       ├── manifest.json  # Firefox extension manifest (Manifest V3)
│       ├── background.js  # Symbolic link to ../common/background.js
│       └── content.js     # Symbolic link to ../common/content.js
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
├── /dist/                 # Build artifacts (generated, not in repo)
│   ├── xtab-chrome.zip    # Chrome Web Store distribution
│   └── xtab-firefox.zip   # Firefox Add-ons distribution
├── .gitignore             # Git ignore file
└── package.json           # NPM package configuration
```

### Building

The project uses npm scripts to build browser-specific distribution files:

```bash
# Install dependencies (if needed)
npm install

# Development setup - prepares both Chrome and Firefox directories
npm run dev

# Browser-specific development setup
npm run dev:chrome      # Prepare Chrome extension only
npm run dev:firefox     # Prepare Firefox extension only

# Production builds - creates separate packages for each browser
npm run build           # Build both Chrome and Firefox
npm run build:chrome    # Build Chrome extension (dist/xtab-chrome.zip)
npm run build:firefox   # Build Firefox extension (dist/xtab-firefox.zip)

# Clean build artifacts
npm run clean
```

Build files are generated in the `dist/` directory:
- `xtab-chrome.zip` - Ready for submission to the Chrome Web Store
- `xtab-firefox.zip` - Ready for submission to the Firefox Add-ons store

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
