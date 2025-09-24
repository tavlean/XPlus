# Changelog

All notable changes to Xtab will be documented in this file.

## [1.2.0] - 2025-01-24

### Added

-   **Home Page Redirection**: Automatically redirects X.com/home to X.com/i/bookmarks
    -   Works for both direct navigation (address bar, bookmarks) and SPA navigation (clicking links)
    -   Uses Declarative Net Request (DNR) for network-level redirects
    -   Uses content script for Single Page Application navigation
    -   Toggle-able via extension popup
-   **Enhanced Error Handling**: Improved robustness with fallback mechanisms
    -   Safe message passing with graceful degradation
    -   Fallback to `window.open()` when extension context is unavailable

### Changed

-   **File Structure**: Simplified file naming for better maintainability
    -   `redirect-home.js` → `redirect.js`
    -   `rules-home-redirect.json` → `redirect-rules.json`
-   **Permissions**: Added new permissions for home redirection feature
    -   Added `declarativeNetRequest` permission
    -   Added `host_permissions` for `https://x.com/*`

### Technical Details

-   Implemented dual-approach redirection system for comprehensive coverage
-   Added DNR rule management in background script
-   Enhanced popup with third toggle for home redirect feature
-   Updated build scripts to include new files
-   Improved content script error handling

---

## [1.1.0] - Previous Release

### Features

-   Open X/Twitter post timestamps in new tabs
-   Open notifications in new tabs
-   Toggle features via extension popup
-   Cross-browser support (Chrome & Firefox)
-   Lightweight and efficient implementation
