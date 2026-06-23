// Initialize DNR rules based on stored settings

// Enhanced storage defaults with friction data
const storageDefaults = {
    posts: true,
    notifications: true,
    homeRedirect: false,
    exploreRedirect: false,
    snoozeEndTime: null,
    exploreSnoozeEndTime: null,
};
const BREAK_HISTORY_KEY = "focusBreakHistory";
const ACTIVE_BREAKS_KEY = "activeFocusBreaks";
const FIVE_YEARS_MS = 5 * 365 * 24 * 60 * 60 * 1000;
const MAX_BREAK_HISTORY_EVENTS = 5000;
// How long before a break ends to warn the user, so they can wrap up or open
// anything they want to keep before the guard starts redirecting again.
const SNOOZE_WARNING_LEAD_MS = 15 * 1000;
// Safety net: if the chained re-enable timer is lost (e.g. the service worker is
// killed during the lead window), this alarm re-enables the guard. Placed well
// after the end time so it can't collapse into the warning alarm.
const SNOOZE_BACKSTOP_MS = 60 * 1000;

// Helper functions for safe storage operations
function safeStorageGet(keys, callback) {
    try {
        chrome.storage.sync.get(keys || storageDefaults, (items) => {
            // Ensure backward compatibility by merging with defaults
            const mergedItems = { ...storageDefaults, ...items };
            callback(mergedItems);
        });
    } catch (e) {
        console.warn("Storage get failed, using defaults:", e);
        callback(storageDefaults);
    }
}

function safeStorageSet(items, callback) {
    try {
        chrome.storage.sync.set(items, () => {
            if (callback) callback();
        });
    } catch (e) {
        console.warn("Storage set failed:", e);
        if (callback) callback();
    }
}

function safeLocalGet(keys, callback) {
    try {
        if (!chrome.storage.local) {
            callback({});
            return;
        }
        chrome.storage.local.get(keys, (items) => {
            callback(items || {});
        });
    } catch (e) {
        console.warn("Local storage get failed:", e);
        callback({});
    }
}

function safeLocalSet(items, callback) {
    try {
        if (!chrome.storage.local) {
            if (callback) callback();
            return;
        }
        chrome.storage.local.set(items, () => {
            if (callback) callback();
        });
    } catch (e) {
        console.warn("Local storage set failed:", e);
        if (callback) callback();
    }
}

function pruneBreakHistory(history, now = Date.now()) {
    const cutoff = now - FIVE_YEARS_MS;
    return (Array.isArray(history) ? history : [])
        .filter((event) => event && event.endedAt >= cutoff && event.usedMs > 0)
        .slice(-MAX_BREAK_HISTORY_EVENTS);
}

function finalizeBreakSession(featureType, endedAt, callback) {
    safeLocalGet({ [ACTIVE_BREAKS_KEY]: {}, [BREAK_HISTORY_KEY]: [] }, (items) => {
        const activeBreaks = items[ACTIVE_BREAKS_KEY] || {};
        const session = activeBreaks[featureType];
        if (!session) {
            if (callback) callback(false);
            return;
        }

        const safeEndedAt = Math.min(endedAt || Date.now(), session.scheduledEndAt);
        const usedMs = Math.max(0, safeEndedAt - session.startedAt);
        delete activeBreaks[featureType];

        const history = pruneBreakHistory(items[BREAK_HISTORY_KEY]);
        if (usedMs > 0) {
            history.push({
                featureType,
                startedAt: session.startedAt,
                scheduledEndAt: session.scheduledEndAt,
                endedAt: safeEndedAt,
                requestedMinutes: session.requestedMinutes,
                appliedWaitSeconds: session.appliedWaitSeconds,
                frictionTier: session.frictionTier,
                frictionScore: session.frictionScore,
                usedMs,
            });
        }

        safeLocalSet(
            {
                [ACTIVE_BREAKS_KEY]: activeBreaks,
                [BREAK_HISTORY_KEY]: pruneBreakHistory(history),
            },
            () => {
                if (callback) callback(true);
            }
        );
    });
}

function initializeDNRRules() {
    safeStorageGet(["homeRedirect", "exploreRedirect"], (items) => {
        if (chrome.declarativeNetRequest) {
            const enableRulesets = [];
            const disableRulesets = [];

            // Handle home redirect rules
            if (items.homeRedirect) {
                enableRulesets.push("ruleset_home_redirect");
            } else {
                disableRulesets.push("ruleset_home_redirect");
            }

            // Handle explore redirect rules
            if (items.exploreRedirect) {
                enableRulesets.push("ruleset_explore_redirect");
            } else {
                disableRulesets.push("ruleset_explore_redirect");
            }

            // Apply rule changes in a single call for better performance
            const updateOptions = {};
            if (enableRulesets.length > 0) {
                updateOptions.enableRulesetIds = enableRulesets;
            }
            if (disableRulesets.length > 0) {
                updateOptions.disableRulesetIds = disableRulesets;
            }

            if (Object.keys(updateOptions).length > 0) {
                chrome.declarativeNetRequest.updateEnabledRulesets(updateOptions);
            }
        }
    });
}

// Snooze timer management functions for home redirect
function handleHomeSnoozeExpiration() {
    console.log("Handling home snooze expiration...");
    chrome.alarms.clear("homeSnoozeWarning");
    chrome.alarms.clear("homeSnoozeExpired");

    safeStorageGet(["snoozeEndTime"], (items) => {
        finalizeBreakSession("home", items.snoozeEndTime || Date.now(), () => {
            // Clear the home snooze end time from storage
            safeStorageSet({ snoozeEndTime: null }, () => {
                // Re-enable the home redirect feature
                safeStorageSet({ homeRedirect: true }, () => {
                    console.log("Home redirect re-enabled after snooze expiration");

                    // Update DNR rules to enable home redirect
                    try {
                        if (chrome.declarativeNetRequest) {
                            chrome.declarativeNetRequest.updateEnabledRulesets({
                                enableRulesetIds: ["ruleset_home_redirect"],
                            });
                        }
                    } catch (e) {
                        console.warn("Failed to update DNR rules on home snooze expiration:", e);
                    }

                    // No notification here — the user was already warned shortly
                    // before the break ended (see showSnoozeEndingSoonNotification).
                });
            });
        });
    });
}

// Snooze timer management functions for explore redirect
function handleExploreSnoozeExpiration() {
    console.log("Handling explore snooze expiration...");
    chrome.alarms.clear("exploreSnoozeWarning");
    chrome.alarms.clear("exploreSnoozeExpired");

    safeStorageGet(["exploreSnoozeEndTime"], (items) => {
        finalizeBreakSession("explore", items.exploreSnoozeEndTime || Date.now(), () => {
            // Clear the explore snooze end time from storage
            safeStorageSet({ exploreSnoozeEndTime: null }, () => {
                // Re-enable the explore redirect feature
                safeStorageSet({ exploreRedirect: true }, () => {
                    console.log("Explore redirect re-enabled after snooze expiration");

                    // Update DNR rules to enable explore redirect
                    try {
                        if (chrome.declarativeNetRequest) {
                            chrome.declarativeNetRequest.updateEnabledRulesets({
                                enableRulesetIds: ["ruleset_explore_redirect"],
                            });
                        }
                    } catch (e) {
                        console.warn(
                            "Failed to update DNR rules on explore snooze expiration:",
                            e
                        );
                    }

                    // No notification here — the user was already warned shortly
                    // before the break ended (see showSnoozeEndingSoonNotification).
                });
            });
        });
    });
}

// Warn shortly BEFORE a break ends, so the user can finish reading or open a
// post in a new tab before the guard starts redirecting again.
function showSnoozeEndingSoonNotification(featureType = "home") {
    try {
        if (chrome.notifications) {
            const featureName = featureType === "home" ? "Home Guard" : "Explore Guard";
            const leadSeconds = Math.round(SNOOZE_WARNING_LEAD_MS / 1000);
            const notificationId = `${featureType}-snooze-ending`;

            chrome.notifications.create(notificationId, {
                type: "basic",
                iconUrl: "assets/icon48.png",
                title: "Break ending soon",
                message: `Your ${featureName} comes back in about ${leadSeconds} seconds. Wrap up or open anything you want to keep in a new tab.`,
                silent: false,
            });

            // Clear it around the time the guard actually resumes.
            setTimeout(() => {
                chrome.notifications.clear(notificationId);
            }, SNOOZE_WARNING_LEAD_MS + 2000);
        }
    } catch (e) {
        console.warn("Failed to show snooze ending-soon notification:", e);
    }
}

// Check for active snooze on startup and set up alarms if needed
function checkAndRestoreSnoozeAlarms() {
    safeStorageGet(["snoozeEndTime", "exploreSnoozeEndTime"], (items) => {
        const now = Date.now();

        // Handle home redirect snooze
        if (items.snoozeEndTime) {
            const homeSnoozeEndTime = items.snoozeEndTime;

            console.log("Checking home snooze status on startup:", {
                now: new Date(now).toISOString(),
                snoozeEnd: new Date(homeSnoozeEndTime).toISOString(),
                expired: homeSnoozeEndTime <= now,
            });

            if (homeSnoozeEndTime <= now) {
                // Home snooze has already expired, handle it immediately
                console.log("Home snooze expired while extension was inactive, handling now");
                handleHomeSnoozeExpiration();
            } else {
                // Home snooze is still active, recreate the alarm
                try {
                    scheduleSnoozeAlarms("home", homeSnoozeEndTime);
                    console.log(
                        "Restored home snooze alarm for:",
                        new Date(homeSnoozeEndTime).toISOString()
                    );
                } catch (e) {
                    console.warn("Failed to create home snooze alarm:", e);
                    // If alarm creation fails, fall back to immediate expiration
                    handleHomeSnoozeExpiration();
                }
            }
        }

        // Handle explore redirect snooze
        if (items.exploreSnoozeEndTime) {
            const exploreSnoozeEndTime = items.exploreSnoozeEndTime;

            console.log("Checking explore snooze status on startup:", {
                now: new Date(now).toISOString(),
                snoozeEnd: new Date(exploreSnoozeEndTime).toISOString(),
                expired: exploreSnoozeEndTime <= now,
            });

            if (exploreSnoozeEndTime <= now) {
                // Explore snooze has already expired, handle it immediately
                console.log("Explore snooze expired while extension was inactive, handling now");
                handleExploreSnoozeExpiration();
            } else {
                // Explore snooze is still active, recreate the alarm
                try {
                    scheduleSnoozeAlarms("explore", exploreSnoozeEndTime);
                    console.log(
                        "Restored explore snooze alarm for:",
                        new Date(exploreSnoozeEndTime).toISOString()
                    );
                } catch (e) {
                    console.warn("Failed to create explore snooze alarm:", e);
                    // If alarm creation fails, fall back to immediate expiration
                    handleExploreSnoozeExpiration();
                }
            }
        }
    });
}

// Listen for alarm events (snooze expiration)
chrome.alarms.onAlarm.addListener((alarm) => {
    console.log("Alarm triggered:", alarm.name);
    if (alarm.name === "homeSnoozeExpired") {
        handleHomeSnoozeExpiration();
    } else if (alarm.name === "exploreSnoozeExpired") {
        handleExploreSnoozeExpiration();
    } else if (alarm.name === "homeSnoozeWarning") {
        handleSnoozeWarning("home");
    } else if (alarm.name === "exploreSnoozeWarning") {
        handleSnoozeWarning("explore");
    }
});

// When the warning alarm fires: notify, then re-enable the guard a short time
// later. The re-enable is chained off the warning (instead of a second alarm
// ~15s apart) because chrome.alarms is too coarse to keep two alarms that close
// from collapsing into one — which is what fired the notification and the
// redirect at the same instant. Measuring the delay from when the warning
// actually fired keeps the gap correct even if Chrome delivered the alarm late.
function handleSnoozeWarning(featureType) {
    showSnoozeEndingSoonNotification(featureType);

    setTimeout(() => {
        const key = featureType === "home" ? "snoozeEndTime" : "exploreSnoozeEndTime";
        safeStorageGet([key], (items) => {
            const end = items[key];
            // Re-enable only if this break is still active and has reached its
            // end — guards against a stale timer from a cancelled/replaced break.
            if (!end || Date.now() < end - 1000) return;
            if (featureType === "home") {
                handleHomeSnoozeExpiration();
            } else {
                handleExploreSnoozeExpiration();
            }
        });
    }, SNOOZE_WARNING_LEAD_MS);
}

// Schedule the break-ending warning alarm, plus a backstop expiration alarm in
// case the chained re-enable is lost. Clears existing alarms first so
// re-snoozing is idempotent.
function scheduleSnoozeAlarms(featureType, snoozeEndTime) {
    const expiredName = featureType === "home" ? "homeSnoozeExpired" : "exploreSnoozeExpired";
    const warningName = featureType === "home" ? "homeSnoozeWarning" : "exploreSnoozeWarning";

    chrome.alarms.clear(expiredName);
    chrome.alarms.clear(warningName);

    const warningTime = snoozeEndTime - SNOOZE_WARNING_LEAD_MS;
    if (warningTime > Date.now()) {
        // Normal case: warn first, then the chained timer re-enables ~lead later.
        chrome.alarms.create(warningName, { when: warningTime });
        // Backstop, placed well past the end so it can't collapse into the warning.
        chrome.alarms.create(expiredName, { when: snoozeEndTime + SNOOZE_BACKSTOP_MS });
    } else {
        // Already inside the lead window (e.g. restored late): just re-enable at
        // the scheduled end, no heads-up.
        chrome.alarms.create(expiredName, { when: snoozeEndTime });
    }
}

// Helper function to set up snooze alarms for a specific feature (can be called
// from the popup via the setupSnoozeAlarm message).
function setupSnoozeAlarm(featureType, snoozeEndTime) {
    try {
        scheduleSnoozeAlarms(featureType, snoozeEndTime);
        console.log(`${featureType} snooze alarms set for:`, new Date(snoozeEndTime).toISOString());
        return true;
    } catch (e) {
        console.warn(`Failed to setup ${featureType} snooze alarms:`, e);
        return false;
    }
}

// Listen for messages from popup to set up snooze
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "openInNewTab") {
        chrome.tabs.create({ url: message.url, active: false });
    } else if (message.action === "setupSnoozeAlarm") {
        const success = setupSnoozeAlarm(message.featureType || "home", message.snoozeEndTime);
        sendResponse({ success });
    }
});

// Check for active snooze when extension starts
chrome.runtime.onStartup.addListener(() => {
    console.log("Extension startup - initializing...");
    initializeDNRRules();
    checkAndRestoreSnoozeAlarms();
});

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed/updated - initializing...");
    initializeDNRRules();
    checkAndRestoreSnoozeAlarms();
});
