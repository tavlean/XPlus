# Design Document

## Overview

This design adds simple friction to disabling the home redirect feature while keeping the extension lightweight and maintainable. We'll enhance the existing popup interface with visual sections and add straightforward confirmation flows using minimal code changes.

## Architecture

### Simple Structure Approach

Keep the existing file structure but enhance the current files:

```
src/common/
├── popup.html        # Enhanced with section dividers
├── popup.js          # Extended with friction logic
├── popup.css         # Improved styling with sections
└── background.js     # Enhanced with snooze timers
```

No new components or complex abstractions - just enhance what's already there.

## Components and Interfaces

### 1. Enhanced Popup HTML Structure

Simple section dividers in the existing HTML:

```html
<section class="utility-features">
    <h3>🔧 Utility Features</h3>
    <!-- Posts and Notifications options -->
</section>

<section class="focus-features">
    <h3>🎯 Focus Features</h3>
    <!-- Home Redirect option with snooze indicator -->
</section>
```

### 2. Enhanced popup.js Logic

Add friction functions directly to the existing popup.js:

```javascript
// Simple friction functions added to existing file
function showConfirmDialog(message, onConfirm, onCancel) {
    /* ... */
}
function showSnoozeOptions(onSelect) {
    /* ... */
}
function startCountdown(seconds, onComplete) {
    /* ... */
}
function checkSnoozeStatus() {
    /* ... */
}
```

### 3. Simple Modal System

Use browser's native `confirm()` and custom overlays for better UX:

-   Confirmation dialog: Simple overlay with yes/no buttons
-   Snooze options: Overlay with time buttons (15min, 1hr, 4hr, tomorrow)
-   Countdown: Small overlay with timer and cancel button

## Data Models

### Enhanced Storage Schema

Simple additions to existing Chrome storage:

```javascript
// Enhanced storage (backward compatible)
{
  // Existing settings (unchanged)
  posts: boolean,
  notifications: boolean,
  homeRedirect: boolean,

  // Simple additions for friction
  snoozeEndTime: number,     // When snooze expires (timestamp)
  disableAttempts: number,   // Daily counter for reducing friction
  lastAttemptDate: string    // Date of last attempt (YYYY-MM-DD)
}
```

## Error Handling

### Simple Error Patterns

-   Use try/catch around storage operations with fallback to defaults
-   Validate timestamps to prevent invalid snooze states
-   Graceful degradation when friction features fail (allow normal toggle)

```javascript
// Simple error handling
function safeStorageGet(keys, callback) {
    try {
        chrome.storage.sync.get(keys, callback);
    } catch (e) {
        callback(getDefaults());
    }
}
```

## Testing Strategy

### Manual Testing Focus

-   Test friction flow: toggle off → confirm → snooze options → countdown
-   Test snooze expiration and re-enable
-   Test multiple attempts reducing friction
-   Test visual sections and improved styling
-   Test across different screen sizes

### Key Test Cases

1. First disable attempt shows full friction
2. Multiple attempts same day reduce friction after 3rd try
3. Snooze works correctly and auto re-enables
4. Visual sections clearly separate utility vs focus features
5. All existing functionality remains unchanged

## Implementation Approach

### Phase 1: Visual Improvements

-   Add section headers and dividers to popup.html
-   Enhance CSS with better spacing and visual hierarchy
-   Add icons and improved styling for focus vs utility features

### Phase 2: Basic Friction

-   Add confirmation dialog when toggling home redirect off
-   Implement simple 3-second countdown before disable
-   Add snooze options (15min, 1hr, 4hr, tomorrow)

### Phase 3: Smart Behavior

-   Track daily attempts and reduce friction after 3rd attempt
-   Implement snooze timer using chrome.alarms API
-   Add subtle re-engagement reminders

### Technical Decisions

**Why keep it simple:**

-   Extension should remain lightweight and fast
-   Easier to maintain and debug
-   Less surface area for bugs
-   Preserves the current clean architecture

**Friction Implementation:**

-   Use DOM overlays instead of separate modal components
-   Leverage existing CSS patterns for consistency
-   Add minimal JavaScript functions to existing popup.js
-   Use chrome.alarms for reliable snooze timing

**Visual Design:**

-   Enhance existing CSS rather than complete redesign
-   Use subtle visual cues (icons, colors) to distinguish sections
-   Maintain current dark theme and styling patterns
-   Focus on improved information hierarchy
