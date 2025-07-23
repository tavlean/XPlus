# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XTab is a Chrome extension that automatically opens X/Twitter post links and notifications in new tabs. It uses Manifest V3 and consists of a service worker and content script that interact with twitter.com/x.com.

## Development Commands

```bash
# Development setup - copies assets to Chrome directory
npm run dev

# Production build - creates xtab.zip in dist/ directory
npm run build

# Clean build artifacts
npm run clean
```

## Extension Architecture

- **Manifest V3** (`src/chrome/manifest.json`) - Extension configuration with permissions for tabs
- **Service Worker** (`src/chrome/background.js:3`) - Handles `openInNewTab` messages from content script
- **Content Script** (`src/chrome/content.js`) - Injected into x.com pages to intercept clicks on:
  - Post links containing `/status/` with `<time>` elements
  - Notifications link with `data-testid="AppTabBar_Notifications_Link"`

## Key Files

- `src/chrome/content.js:66` - Main logic using MutationObserver for dynamic content
- `src/chrome/background.js:3` - Background service worker for tab creation
- `shared-assets/` - Source icons (copied to `src/chrome/assets/` during build)
- `dist/xtab.zip` - Production build output for Chrome Web Store submission