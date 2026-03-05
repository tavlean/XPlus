# XPlus — Feature Ideas

> Current permissions: `tabs`, `storage`, `declarativeNetRequest`, `alarms`, `notifications`
> Current host_permissions: `https://x.com/*`

---

## New Features

### 1. Hide "For You" / Algorithmic Timeline

Add a toggle to hide or collapse the "For You" tab on the home page (when home redirect is off) so users only see the "Following" timeline.

**Permissions:** No new permissions needed.
**UX:** Toggle in Focus Features: "Hide For You Tab". CSS injection hides the tab and auto-selects "Following". Lighter alternative to full home redirect.

### 2. Hide Trending / "What's Happening" Sidebar

The right sidebar shows trending topics. Add a toggle to hide this section entirely.

**Permissions:** No new permissions needed.
**UX:** Toggle in Focus Features: "Hide Trending Sidebar". Hides just the trending content while preserving the search bar.

### 3. Hide "Who to Follow" Suggestions

Remove "Who to follow" blocks from sidebar and inline feed.

**Permissions:** No new permissions needed.
**UX:** Toggle in Focus Features: "Hide Suggestions". MutationObserver catches dynamically loaded suggestion blocks.

### 4. Reading Mode / Thread Reader

Clean reading view for threads that strips away feed, sidebar, and reply noise.

**Permissions:** No new permissions needed.
**UX:** Small "Reader" button injected on thread pages. Overlays a centered reading pane with just thread content. Keyboard shortcut `R` to toggle.

### 5. Customizable Redirect Targets

Let users choose redirect destinations instead of always going to `/i/bookmarks`.

**Permissions:** No new permissions needed. (Switch from static rulesets to `declarativeNetRequest.updateDynamicRules`.)
**UX:** Dropdown below each redirect toggle: Bookmarks (default), Lists, Messages, specific list URL, or custom URL.

### 6. Usage Stats / Screen Time Tracker

Track time spent on X per day. Optionally set daily time limits.

**Permissions:** `idle` (new) for accurate active-time tracking.
**UX:** "Today: 45m" in popup header. Detail view with daily/weekly chart. Soft warning at 80% of limit, hard block at 100%.

### 7. Keyword / Topic Mute Filter

Define keywords to filter from the feed. Posts containing them get hidden.

**Permissions:** No new permissions needed.
**UX:** "Muted Words" section in settings. Hidden posts show collapsed placeholder with reveal option.

### 8. Auto-Switch "For You" to "Following"

Automatically switch to "Following" tab on home page load instead of redirecting away entirely.

**Permissions:** No new permissions needed.
**UX:** Toggle: "Auto-Following Tab". Mutually exclusive with Home Redirect. Enabling one disables the other with explanation toast.

### 9. Quick Bookmark from Feed

One-click bookmark button injected on each post in the feed.

**Permissions:** No new permissions needed.
**UX:** Small bookmark icon next to existing action buttons. Triggers X's native bookmark via DOM interaction. Filled/unfilled state matches X's indicator.

### 10. Notification Filtering

Filter which notification types open in new tabs.

**Permissions:** No new permissions needed.
**UX:** Expand Notifications toggle into sub-toggles: Mentions, Replies, Likes, Retweets. Each independently configurable.

### 11. DM Redirect / Focus

Redirect `/messages` to bookmarks or another page during focused sessions.

**Permissions:** No new permissions needed. (New DNR ruleset.)
**UX:** Toggle in Focus Features with same snooze/friction flow as Home and Explore.

### 12. Schedule-Based Feature Activation

Auto-enable/disable features on a time schedule.

**Permissions:** No new permissions needed. (`alarms` already granted.)
**UX:** Define time blocks with day-of-week and feature toggles. "Work mode (until 5:00 PM)" shown in popup header. Manual override with "Pause schedule".

---

## UX Improvements

### Snooze Countdown in Badge

Show remaining snooze time on the extension badge ("2h", "14m") so users don't need to open the popup.

### Reduce Countdown Friction for Longer Snoozes

The countdown scales with duration (15s for 15min, 60s for 1hr, 240s for 4hrs). 4 minutes to snooze for 4 hours is excessive. Cap at 15-30 seconds regardless of duration, or make it configurable. Friction should be a speed bump, not a roadblock.

### Content Script Performance

The MutationObserver re-queries all `<a>` tags on every mutation. Improve by:

- Only processing `mutation.addedNodes` instead of full document scan
- Event delegation on a parent container instead of per-link listeners
- `data-xplus` attribute on processed links to avoid duplicate handlers

### Fix Notification Icon Path

`background.js` uses `../shared-assets/icon48.png` which won't resolve in built extension. Should be `assets/icon48.png`.

### Popup Load Performance

Lazy-load friction/snooze logic only when a focus toggle is interacted with, instead of loading everything on every popup open.

### Explore Redirect Search Edge Case

Users sometimes reach `/explore` via search. Consider bypassing redirect for search-initiated visits, or add a setting.

### Option Row Click Discoverability

The asymmetric click behavior (click-to-enable anywhere, must click toggle to disable) isn't obvious. Add a subtle visual hint like a tooltip on focus feature rows.

### Popup Scroll on Small Screens

With growing feature count, add max-height with overflow scroll or a tabbed layout (Focus / Utility).

---

## Monetisation Ideas

### XPlus Pro — Full Feed Control Suite

Comprehensive feed customization:

- Per-account content filtering (hide without unfollowing)
- Keyword/regex filtering with AND/OR/NOT logic
- Media type filters (text-only mode, hide videos, hide images)
- Engagement threshold filters (hide posts below/above N likes)
- Custom CSS themes (OLED black, custom accent colors)
- Feed layout options (compact, expanded, card view)

Requires a sophisticated rule engine, efficient DOM scanning, and a polished rule-builder UI. The rule evaluation against X's constantly-changing DOM needs ongoing maintenance. Filtering + theming + layout together is genuinely hard to replicate well.

### XPlus Pro — Productivity Analytics

Deep usage analytics:

- Time per day/week/month with trend charts
- Activity breakdown (scrolling, reading threads, composing, DMs)
- "Distraction score" based on patterns and redirect bypass frequency
- Weekly email digest with insights
- Goal setting with progress tracking
- Period-over-period comparison

Requires persistent event collection, storage management, data aggregation, chart rendering, and a backend for email digests. Behavioral analysis and actionable insight generation is data science work, not just CRUD.

### XPlus Pro — Multi-Platform Focus Mode

Extend focus/redirect to other platforms:

- Instagram: redirect explore/reels to saved posts
- Reddit: redirect home to specific subreddits
- YouTube: redirect home to subscriptions, hide Shorts
- LinkedIn: redirect feed to jobs or messages
- TikTok: time limits and session warnings

Each platform needs its own content scripts, redirect rules, and DOM strategies. Cross-platform settings sync, unified UI, and per-platform customization create massive complexity. Maintaining compatibility across 5+ frequently-changing platforms is a full-time job — that's the moat.

**Permissions:** Host permissions for each platform domain.

### XPlus Pro — Team Focus Mode

For teams and organizations:

- Admin dashboard for focus policies
- Shared blocklists and keyword filters
- Aggregate anonymized usage stats
- Slack/Teams integration for focus summaries
- Shared "focus sessions" for social accountability

Requires a backend for team management, auth, policy distribution, and analytics. The admin dashboard, policy engine, and real-time sync make this a genuine SaaS product. No vibe-coding produces a multi-user system with admin controls.

### XPlus Pro — AI Content Curation

AI-powered feed filtering:

- Predict which posts user will find valuable vs. distracting
- "Focus mode" showing only high-signal posts
- Auto-categorize posts (news, memes, discourse, personal) with per-category visibility
- Smart notification prioritization

Requires ML inference (cloud API or on-device), training data from user behavior, and content classification. The model must handle X's post structure, multimedia, and evolving preferences. This is a real AI product, not a prompt wrapper.
