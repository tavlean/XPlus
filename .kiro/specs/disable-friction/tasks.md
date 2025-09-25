# Implementation Plan

> **Post-Task Command**: After completing each task, run `npm run dev` to build and test the extension.

-   [x] 1. Reorganize popup HTML structure for improved priority

    -   Move Focus Features section to top of popup interface
    -   Move Utility Features section to bottom
    -   Update section order in HTML structure
    -   _Requirements: 5.1_
    -   **After completion**: Run `npm run dev`

-   [x] 2. Update CSS for subtle focus feature styling

    -   Replace bright yellow colors with subtle amber/gold tones
    -   Reduce visual intensity while maintaining distinction
    -   Update focus feature text colors and borders
    -   Maintain readability and accessibility
    -   _Requirements: 9.3_
    -   **After completion**: Run `npm run dev`

-   [x] 3. Fix hover states to prevent element movement

    -   Remove transform: translateY from hover states
    -   Implement stable hover effects without layout shifts
    -   Ensure smooth transitions without position changes
    -   Test hover behavior across all option elements
    -   _Requirements: 9.1, 9.5_
    -   **After completion**: Run `npm run dev`

-   [x] 4. Make entire option elements clickable

    -   Add click event listeners to entire .option elements
    -   Ensure clicks anywhere on option toggle the setting
    -   Maintain existing toggle switch functionality
    -   Prevent event bubbling conflicts
    -   _Requirements: 9.2_
    -   **After completion**: Run `npm run dev`

-   [ ] 5. Style "Keep Enabled" button with green color

    -   Update CSS for .dialog-btn-cancel in snooze dialog
    -   Use green background and appropriate hover states
    -   Ensure good contrast and accessibility
    -   Make button visually encourage positive action
    -   _Requirements: 9.4_
    -   **After completion**: Run `npm run dev`

-   [ ] 6. Add Explore Redirect toggle to Focus Features section

    -   Create new HTML option element for Explore Redirect
    -   Add toggle switch and descriptive text
    -   Position it in Focus Features section alongside Home Redirect
    -   Include snooze status indicator for Explore Redirect
    -   _Requirements: 8.5_
    -   **After completion**: Run `npm run dev`

-   [ ] 7. Extend storage schema for Explore Redirect

    -   Add exploreRedirect boolean setting to storage
    -   Add exploreSnoozeEndTime for independent snooze timing
    -   Add exploreDisableAttempts for separate attempt tracking
    -   Ensure backward compatibility with existing data
    -   _Requirements: 8.4_
    -   **After completion**: Run `npm run dev`

-   [ ] 8. Implement Explore Redirect declarativeNetRequest rules

    -   Create ruleset_explore_redirect with /explore path matching
    -   Handle /explore and all sub-paths (/explore/tabs/\*, etc.)
    -   Redirect to bookmarks page when Explore Redirect is enabled
    -   Update rule management in popup.js save function
    -   _Requirements: 8.1_
    -   **After completion**: Run `npm run dev`

-   [ ] 9. Extend friction system to support both redirect features

    -   Modify showConfirmDialog to accept featureType parameter
    -   Update showSnoozeOptions to handle both home and explore
    -   Create unified handleRedirectToggle function for both features
    -   Ensure independent operation of friction mechanisms
    -   _Requirements: 8.2, 8.3_
    -   **After completion**: Run `npm run dev`

-   [ ] 10. Implement independent snooze timers for each feature

    -   Support separate snooze end times for home and explore redirects
    -   Update snooze status indicators to show correct feature status
    -   Handle alarm management for multiple concurrent snoozes
    -   Ensure snooze expiration works independently for each feature
    -   _Requirements: 8.4_
    -   **After completion**: Run `npm run dev`

-   [ ] 11. Update popup.js to handle Explore Redirect toggle events

    -   Add event listener for exploreRedirect checkbox
    -   Apply same friction flow as Home Redirect
    -   Integrate with existing confirmation and snooze dialogs
    -   Update save function to manage explore redirect rules
    -   _Requirements: 8.2, 8.3_
    -   **After completion**: Run `npm run dev`

-   [ ] 12. Add extension icon to popup header

    -   Include extension icon next to H1 title in popup
    -   Ensure proper sizing and alignment
    -   Maintain existing header layout and spacing
    -   _Requirements: 9.6_
    -   **After completion**: Run `npm run dev`

-   [ ] 13. Test UI improvements and interaction design

    -   Verify Focus Features appear above Utility Features
    -   Test entire option elements are clickable
    -   Confirm hover states don't cause movement
    -   Validate subtle color scheme for focus features
    -   Test green "Keep Enabled" button styling
    -   _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
    -   **After completion**: Run `npm run dev`

-   [ ] 14. Test Explore Redirect functionality

    -   Verify /explore paths redirect to bookmarks when enabled
    -   Test /explore sub-paths (tabs/trending, tabs/sports, etc.)
    -   Confirm friction mechanisms work for Explore Redirect
    -   Test independent snooze timers for both features
    -   Validate declarativeNetRequest rule management
    -   _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
    -   **After completion**: Run `npm run dev`

-   [ ] 15. Ensure backward compatibility and error handling
    -   Test existing Home Redirect functionality remains unchanged
    -   Verify storage migration handles new fields gracefully
    -   Implement fallback behavior for missing storage fields
    -   Test extension works with partial feature failures
    -   _Requirements: 7.4, 8.4_
    -   **After completion**: Run `npm run dev`
