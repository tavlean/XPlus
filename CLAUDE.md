# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XTab is a cross-browser extension that automatically opens X/Twitter post links and notifications in new tabs. It supports both Chrome and Firefox using Manifest V3 and consists of a service worker and content script that interact with twitter.com/x.com.

## Development Commands

```bash
# Development setup - prepares both Chrome and Firefox directories
npm run dev

# Production builds - creates separate packages for each browser
npm run build

# Browser-specific commands
npm run dev:chrome      # Prepare Chrome extension
npm run dev:firefox     # Prepare Firefox extension
npm run build:chrome    # Build Chrome extension (dist/xtab-chrome.zip)
npm run build:firefox   # Build Firefox extension (dist/xtab-firefox.zip)

# Clean build artifacts
npm run clean
```

## Extension Architecture

### Common Code (`src/common/`)
- **Content Script** (`src/common/content.js`) - Shared logic for intercepting clicks on:
  - Post links containing `/status/` with `<time>` elements
  - Notifications link with `data-testid="AppTabBar_Notifications_Link"`
- **Service Worker** (`src/common/background.js`) - Shared background logic for opening tabs

### Browser-Specific Configuration
- **Chrome** (`src/chrome/`) - Manifest V3 configuration for Chrome Web Store
- **Firefox** (`src/firefox/`) - Manifest V3 configuration for Firefox Add-ons

## Key Files

- `src/common/content.js` - Main logic using MutationObserver for dynamic content
- `src/common/background.js` - Background service worker for tab creation
- `shared-assets/` - Source icons (copied to browser-specific asset directories during build)
- `dist/xtab-chrome.zip` - Production build output for Chrome Web Store
- `dist/xtab-firefox.zip` - Production build output for Firefox Add-ons