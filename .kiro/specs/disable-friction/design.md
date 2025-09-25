# Design Document

## Overview

This design adds simple friction to disabling focus redirect features (Home and Explore redirects) while keeping the extension lightweight and maintainable. We'll enhance the existing popup interface with improved visual design, better interaction patterns, and add a new Explore Redirect feature that uses the same friction mechanisms as Home Redirect.

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

Reorganized sections with Focus Features on top and improved interaction design:

```html
<section class="focus-features">
    <h3>🎯 Focus Features</h3>
    <!-- Home Redirect option with snooze indicator -->
    <!-- Explore Redirect option with snooze indicator -->
</section>

<section class="utility-features">
    <h3>🔧 Utility Features</h3>
    <!-- Posts and Notifications options -->
</section>
```

**Key UI Improvements:**

-   Focus Features section moved to top for priority
-   Entire option elements are clickable (not just toggle switches)
-   Hover states don't cause element movement
-   Subtle color scheme for focus features (replacing bright yellow)
-   Green "Keep Enabled" button in snooze dialogs

### 2. Enhanced popup.js Logic

Extend existing friction functions to support both redirect features:

```javascript
// Enhanced friction functions for both Home and Explore redirects
function showConfirmDialog(featureType, message, onConfirm, onCancel) {
    /* Handle both 'home' and 'explore' redirect types */
}
function showSnoozeOptions(featureType, onSelect) {
    /* Support independent snooze timers for each feature */
}
function handleRedirectToggle(featureType, toggleElement) {
    /* Unified friction handling for both redirect features */
}
function updateSnoozeStatusIndicator(featureType) {
    /* Show snooze status for each feature independently */
}

// New click handler for entire option elements
function makeOptionClickable(optionElement, toggleElement) {
    /* Make entire setting element clickable */
}
```

**Explore Redirect Implementation:**

-   Reuse existing friction mechanisms for consistency
-   Independent snooze timers for Home and Explore redirects
-   Same confirmation dialogs and countdown behavior
-   Unified redirect rule management

### 3. Simple Modal System

Use browser's native `confirm()` and custom overlays for better UX:

-   Confirmation dialog: Simple overlay with yes/no buttons
-   Snooze options: Overlay with time buttons (15min, 1hr, 4hr, tomorrow)
-   Countdown: Small overlay with timer and cancel button

## Data Models

### Enhanced Storage Schema

Extended storage to support both redirect features:

```javascript
// Enhanced storage (backward compatible)
{
  // Existing settings
  posts: boolean,
  notifications: boolean,
  homeRedirect: boolean,

  // New explore redirect setting
  exploreRedirect: boolean,

  // Enhanced friction data for both features
  homeSnoozeEndTime: number,     // When home snooze expires
  exploreSnoozeEndTime: number,  // When explore snooze expires
  homeDisableAttempts: number,   // Daily counter for home redirect
  exploreDisableAttempts: number, // Daily counter for explore redirect
  lastAttemptDate: string        // Date of last attempt (YYYY-MM-DD)
}
```

### Redirect Rules Schema

Enhanced declarativeNetRequest rules to support both redirects:

```javascript
// Rule structure for both Home and Explore redirects
{
  "ruleset_home_redirect": [
    {
      "id": 1,
      "condition": { "urlFilter": "*/home*" },
      "action": { "type": "redirect", "redirect": { "url": "*/bookmarks" } }
    }
  ],
  "ruleset_explore_redirect": [
    {
      "id": 2,
      "condition": { "urlFilter": "*/explore*" },
      "action": { "type": "redirect", "redirect": { "url": "*/bookmarks" } }
    }
  ]
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

-   Test friction flow for both Home and Explore redirects
-   Test independent snooze timers for each feature
-   Test UI improvements: clickable elements, stable hover states, subtle colors
-   Test redirect functionality for /explore paths and sub-paths
-   Test visual sections with Focus Features on top
-   Test green "Keep Enabled" button styling

### Key Test Cases

1. Home Redirect friction works as before (backward compatibility)
2. Explore Redirect friction works identically to Home Redirect
3. Independent snooze timers for each feature
4. Entire option elements are clickable (not just toggles)
5. Hover states don't cause visual movement
6. Focus Features use subtle colors instead of bright yellow
7. "Keep Enabled" button appears green in snooze dialogs
8. Focus Features section appears above Utility Features
9. /explore and /explore/\* paths redirect to bookmarks when enabled

## Implementation Approach

### Phase 1: UI Improvements

-   Reorganize sections: Focus Features on top, Utility Features on bottom
-   Update CSS for subtle colors instead of bright yellow
-   Fix hover states to prevent element movement
-   Make entire option elements clickable
-   Style "Keep Enabled" button with green color

### Phase 2: Explore Redirect Feature

-   Add Explore Redirect toggle to Focus Features section
-   Implement redirect rules for /explore paths
-   Extend friction mechanisms to support both redirect features
-   Add independent snooze status indicators

### Phase 3: Enhanced Friction System

-   Implement separate snooze timers for Home and Explore redirects
-   Update storage schema to support both features
-   Ensure backward compatibility with existing data
-   Test all friction flows work independently

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

-   Replace bright yellow with subtle amber/gold colors for focus features
-   Implement stable hover states that don't cause layout shifts
-   Make entire option elements interactive (not just toggle switches)
-   Use green color for positive actions ("Keep Enabled" button)
-   Maintain current dark theme while improving visual hierarchy
-   Prioritize Focus Features by placing them at the top

**Explore Redirect Implementation:**

-   Reuse existing friction system architecture for consistency
-   Support independent operation of Home and Explore redirects
-   Use same dialog components with feature-specific messaging
-   Implement separate snooze timers and status indicators
-   Extend declarativeNetRequest rules for /explore path matching
