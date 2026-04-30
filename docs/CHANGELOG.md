# Changelog

All notable changes to XPlus will be documented in this file.

## [1.7.0] - 2026-05-01

### Added
- **Actual-Used Break Tracking**: Break history now tracks elapsed snooze time, not just requested duration.
  - Re-enabling a guard early only counts the time actually used.
  - Active breaks are included in the 3-hour, 24-hour, and 7-day popup totals while the break is still running.
  - Break history is stored locally and does not add extension permissions.
- **Risk-State Adaptive Friction**: Break friction now looks at behavioral pattern, not only total time.
  - Uses 24-hour break time, 3-hour break time, number of recent break starts, repeated 5-minute requests, and spacing since the last break.
  - Treats repeated short breaks close together as a stronger signal than well-spaced breaks.
- **Compact Focus State**: Popup now shows a compact current pattern state with 3-hour, 24-hour, and 7-day break totals.
  - Visible states include Steady, Building, Frequent checks, and High pull.
- **Adaptive Countdown Prompts**: Waiting periods now rotate brief prompts based on the actual countdown length.
  - Short waits show simple breath or attention-shift prompts.
  - Longer waits can suggest standing up, getting water, walking briefly, or reconsidering whether the break is still needed.
  - Prompt timing is based on the wait duration after adaptive friction is applied, not the selected break duration.
- **Focus Friction Philosophy Doc**: Added `docs/FOCUS_FRICTION_PHILOSOPHY.md` as a plain-language reference for the product philosophy and research behind focus friction.

### Improvements
- **Snooze Options**: Updated focus break choices to 5 minutes, 15 minutes, 30 minutes, and 1 hour.
- **Permanent Disable Placement**: Moved permanent guard removal behind a collapsed Advanced area while keeping the existing 10 minute countdown.
- **Focus Copy Pass**: Renamed focus controls around guards rather than redirects and tightened break-flow language.
- **Interaction Tone**: Reduced pulsing and sharpened motion/easing so the popup feels calmer and less alarm-like.

---

## [1.5.0] - 2026-04-14

### Added
- **Friction Overhaul**: Snooze options were reworked to 5 minutes, 15 minutes, 1 hour, and 4 hours.
  - Countdown wait times scaled by snooze duration: 5 minutes -> 10 seconds, 15 minutes -> 30 seconds, 1 hour -> 3 minutes, and 4 hours -> 8 minutes.
  - Permanent disable countdown increased to 10 minutes.
  - Countdown display switched to `mm:ss` for waits of 60 seconds or more.
  - Leaving the popup during a countdown now resets the countdown.
- **Popup Sync Fix**: Popup now listens for storage changes from the background script so toggle state and snooze indicators update when a snooze expires.

### Improvements
- **Focus Copy Cleanup**: Updated popup labels and snooze messages for feed, Explore, timestamps, resume status, temporary breaks, and permanent disable.
- **Code Cleanup**: Removed dead friction fields and unused helper paths, removed old tomorrow-snooze handling, and fixed the notification icon path.

---

## [1.4.1] - 2026-04-14

### Improvements
- **Popup Copy Tightening**: Streamlined popup section headers, option descriptions, and dialog text for improved clarity and reduced visual clutter.
- **Privacy Policy Update**: Revised privacy policy content and updated the last updated date.
- Version bump for patch release.

---

## [1.4.0] - 2025-01-26

### Added
- **Explore Redirect Feature**: Added redirection for X.com/explore pages to maintain focus.
  - Redirects all /explore paths including sub-paths to bookmarks.
  - Independent toggle control in Focus Features section with friction mechanisms.
  - Separate snooze timer system for Home and Explore redirects.
- **Enhanced Friction System**: Unified and improved disable confirmation flow.
  - Dynamic dialog titles based on the feature being disabled.
  - Feature-specific confirmation messages explaining the benefits of each redirect type.
- **Improved Visual Design**: Comprehensive UI/UX enhancements.
  - Added extension icon to popup header.
  - Reorganized popup with Focus Features at top, Utility Features at bottom.
  - Enhanced button styling and hover states.
  - Subtle amber/gold color scheme for focus features.
- **Enhanced Interaction Design**: More intuitive user interactions.
  - Entire option elements are now clickable.
  - Consistent button styling and improved visual hierarchy.

### Improvements
- **Button Color Scheme**: Updated dialog buttons for better visual consistency.
- **Popup Layout**: Reorganized interface with improved spacing and typography.
- **Friction Mechanisms**: Extended to support multiple redirect features with independent snooze management.

---

## [1.3.0] - 2025-01-25

### Added
- **Intentional Friction for Home Redirect Disable**: Added thoughtful barriers to prevent impulsive disabling.
  - Confirmation dialog with productivity reminder.
  - 3-5 second countdown timer with cancel option.
  - Respectful, non-judgmental language.
- **Smart Snooze System**: Temporary disable options that automatically re-enable the feature.
  - Snooze options: 15 minutes, 1 hour, 4 hours, until tomorrow.
  - Real-time snooze status indicator in popup.
  - Automatic re-enable when snooze period expires.
  - Optional notification when feature re-enables.
- **Enhanced Popup Interface**: Improved visual organization.
  - Separated settings into "Utility Features" and "Focus Features" sections.
  - Better spacing, typography, and visual hierarchy.
  - Improved hover states and transitions.
- **Enhanced Storage Schema**: Extended data model for friction and snooze functionality with full backward compatibility.
- **Robust Error Handling**: Comprehensive fallback mechanisms for reliability.
  - Safe storage operations with graceful degradation.
  - Timestamp validation to prevent invalid snooze states.

### Improvements
- **Home Redirect Toggle Behavior**: Enhanced with friction mechanisms while preserving user autonomy.
  - Standard utility features maintain immediate toggle behavior.
  - Home Redirect toggle now triggers confirmation flow when disabling.
  - Multiple disable attempts in the same day reduce friction after the 3rd attempt.
- **Background Script**: Extended to handle snooze timer management and automatic re-enable functionality.

---

## [1.2.0] - 2025-01-24

### Added
- **Home Page Redirection**: Automatically redirects X.com/home to X.com/i/bookmarks.
  - Works for both direct navigation and SPA navigation.
  - Toggle-able via extension popup.
- **Enhanced Error Handling**: Improved robustness with safe message passing and graceful degradation.

### Improvements
- **Permissions**: Added `declarativeNetRequest` permission and host permissions for `https://x.com/*` to support home redirection.

---

## [1.1.0] - Previous Release

### Features
- Open X/Twitter post timestamps in new tabs
- Open notifications in new tabs
- Toggle features via extension popup
- Cross-browser support (Chrome & Firefox)
- Lightweight and efficient implementation
