# Implementation Plan

-   [x] 1. Enhance popup HTML structure with visual sections

    -   Add section headers and dividers to separate utility and focus features
    -   Restructure existing options into logical groups
    -   Add placeholder for snooze status indicator
    -   _Requirements: 5.1, 5.2, 6.1_

-   [x] 2. Improve CSS styling for better visual hierarchy

    -   Add styles for section headers and dividers
    -   Enhance spacing and typography for better readability
    -   Add visual cues (colors, icons) to distinguish feature types
    -   Implement hover states and smooth transitions
    -   _Requirements: 5.3, 5.5, 6.2, 6.3, 6.4_

-   [x] 3. Extend storage schema for friction data

    -   Add new storage fields: snoozeEndTime, disableAttempts, lastAttemptDate
    -   Implement backward compatibility with existing settings
    -   Create helper functions for safe storage operations
    -   _Requirements: 2.1, 3.4, 7.4_

-   [x] 4. Implement basic confirmation dialog system

    -   Create simple overlay modal for confirmation dialogs
    -   Add confirmation when user attempts to disable home redirect
    -   Include productivity reminder message in confirmation
    -   _Requirements: 1.1, 1.2, 7.3_

-   [ ] 5. Add countdown timer functionality

    -   Implement 3-5 second countdown before disable takes effect
    -   Show countdown with cancel option
    -   Apply countdown only after user confirms disable intent
    -   _Requirements: 1.3, 1.4, 7.2_

-   [ ] 6. Create snooze options interface

    -   Build snooze selection overlay with time options (15min, 1hr, 4hr, tomorrow)
    -   Integrate snooze choice into disable confirmation flow
    -   Add "permanent disable" option alongside snooze choices
    -   _Requirements: 2.1, 2.2_

-   [ ] 7. Implement snooze timer management

    -   Use chrome.alarms API for reliable snooze timing
    -   Store snooze end time in chrome.storage
    -   Handle snooze expiration and automatic re-enable
    -   _Requirements: 2.2, 2.3_

-   [ ] 8. Add snooze status indicator to popup

    -   Display remaining snooze time in focus features section
    -   Show clear visual indication when feature is snoozed
    -   Update indicator in real-time or on popup open
    -   _Requirements: 2.3, 5.4_

-   [ ] 9. Implement feedback collection for permanent disable

    -   Create feedback form with predefined reason options
    -   Add text field for custom feedback when "Other" is selected
    -   Store feedback locally for potential analysis
    -   Add 5-second reflection period after feedback submission
    -   _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

-   [ ] 10. Add smart friction reduction logic

    -   Track daily disable attempts in storage
    -   Reduce friction after 3rd attempt in same day
    -   Reset attempt counter daily
    -   _Requirements: 7.5_

-   [ ] 11. Implement re-engagement reminder system

    -   Show subtle indicator after 24 hours of being disabled
    -   Display gentle weekly reminders after 7 days
    -   Add one-click re-enable option in reminders
    -   Track dismissals and pause reminders after 3 dismissals
    -   _Requirements: 4.1, 4.2, 4.3, 4.4_

-   [ ] 12. Enhance background script for snooze management

    -   Add alarm listener for snooze expiration
    -   Implement automatic re-enable when snooze expires
    -   Add optional notification when feature re-enables
    -   _Requirements: 2.4_

-   [ ] 13. Update popup.js event handling for friction flow

    -   Modify home redirect toggle handler to trigger friction flow
    -   Integrate all friction components into smooth user experience
    -   Ensure existing utility features (posts, notifications) remain unchanged
    -   _Requirements: 1.1, 5.3, 7.1_

-   [ ] 14. Add error handling and fallback behavior

    -   Implement graceful degradation when friction features fail
    -   Add try/catch blocks around storage and alarm operations
    -   Ensure extension remains functional if friction system breaks
    -   _Requirements: 7.4_

-   [ ] 15. Test complete friction flow and edge cases
    -   Test full disable flow: confirmation → snooze → feedback → countdown
    -   Verify snooze timing accuracy and automatic re-enable
    -   Test multiple attempts and friction reduction
    -   Validate visual improvements and responsive design
    -   Test error scenarios and fallback behavior
    -   _Requirements: All requirements validation_
