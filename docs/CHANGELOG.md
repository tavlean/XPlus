# Changelog

All notable changes to XPlus will be documented in this file.

## [1.3.0] - 2025-01-25

### Added - Detailed Changelog

-   **Intentional Friction for Home Redirect Disable**: Added thoughtful barriers to prevent impulsive disabling of the focus-enhancing home redirect feature
    -   Confirmation dialog with productivity reminder when attempting to disable home redirect
    -   3-5 second countdown timer with cancel option before disable takes effect
    -   Respectful, non-judgmental language in all friction mechanisms
-   **Smart Snooze System**: Temporary disable options that automatically re-enable the feature
    -   Snooze options: 15 minutes, 1 hour, 4 hours, until tomorrow
    -   Real-time snooze status indicator in popup showing remaining time
    -   Automatic re-enable when snooze period expires using chrome.alarms API
    -   Optional notification when feature automatically re-enables
-   **Enhanced Popup Interface**: Improved visual organization and user experience
    -   Separated settings into "Utility Features" and "Focus Features" sections
    -   Added section headers with icons (🔧 Utility, 🎯 Focus) for clear categorization
    -   Enhanced visual hierarchy with better spacing, typography, and colors
    -   Improved hover states and smooth transitions for better interaction feedback
    -   Visual cues to distinguish between standard utility toggles and focus-oriented features
-   **Enhanced Storage Schema**: Extended data model for friction and snooze functionality
    -   Added snoozeEndTime field for tracking active snooze periods
    -   Added disableAttempts counter for smart friction reduction
    -   Added lastAttemptDate for daily attempt tracking
    -   Maintained full backward compatibility with existing settings
-   **Robust Error Handling**: Comprehensive fallback mechanisms for reliability
    -   Safe storage operations with try/catch blocks and default fallbacks
    -   Graceful degradation when friction features fail (allows normal toggle)
    -   Timestamp validation to prevent invalid snooze states
    -   Extension remains fully functional even if friction system encounters errors

### Changed

-   **Home Redirect Toggle Behavior**: Enhanced with friction mechanisms while preserving user autonomy
    -   Standard utility features (Posts, Notifications) maintain immediate toggle behavior
    -   Home Redirect toggle now triggers confirmation flow when disabling
    -   Multiple disable attempts in same day will reduce friction after 3rd attempt
-   **Background Script**: Extended to handle snooze timer management
    -   Added alarm listener for reliable snooze expiration handling
    -   Automatic re-enable functionality when snooze periods end
    -   Enhanced storage management for friction-related data

### Technical Implementation

-   Implemented modal overlay system for confirmation dialogs and snooze options
-   Enhanced popup.js with friction flow functions while maintaining existing architecture
-   Used chrome.alarms API for reliable cross-session snooze timing
-   Added visual section dividers and improved CSS styling
-   Maintained lightweight extension architecture with minimal code additions

---

## [1.3.0] - 2025-01-25 - Brief User-Focused Changelog

### New Features

-   **Smarter Home Redirect Settings**: Added gentle confirmation and "snooze" options when turning off the home redirect feature
    -   Choose to disable temporarily (15 min, 1 hour, 4 hours, or until tomorrow) instead of permanently
    -   Feature automatically turns back on after your chosen snooze time
    -   See remaining snooze time right in the popup
-   **Better Settings Organization**: Reorganized popup into clear "Utility Features" and "Focus Features" sections
    -   Easier to understand which settings affect your productivity habits
    -   Improved visual design with better spacing and icons
-   **Thoughtful Friction**: Brief confirmation before disabling focus features to help maintain good habits
    -   Respectful 3-second countdown with option to cancel
    -   Reduces friction if you disable multiple times in one day

### Improvements

-   Enhanced popup interface with cleaner visual design
-   More reliable snooze timing that works across browser sessions
-   Better error handling for improved stability

---

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
