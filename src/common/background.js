chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "openInNewTab") {
        chrome.tabs.create({ url: message.url, active: false });
    }
});

// Initialize DNR rules based on stored settings

// Enhanced storage defaults with friction data
const storageDefaults = {
    posts: true,
    notifications: true,
    homeRedirect: false,
    // Friction data fields
    snoozeEndTime: null,
    disableAttempts: 0,
    lastAttemptDate: null,
};

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

function initializeDNRRules() {
    safeStorageGet(["homeRedirect"], (items) => {
        if (chrome.declarativeNetRequest) {
            if (items.homeRedirect) {
                chrome.declarativeNetRequest.updateEnabledRulesets({
                    enableRulesetIds: ["ruleset_home_redirect"],
                });
            } else {
                chrome.declarativeNetRequest.updateEnabledRulesets({
                    disableRulesetIds: ["ruleset_home_redirect"],
                });
            }
        }
    });
}

// Snooze timer management functions
function handleSnoozeExpiration() {
    // Clear the snooze end time from storage
    safeStorageSet({ snoozeEndTime: null }, () => {
        // Re-enable the home redirect feature
        safeStorageSet({ homeRedirect: true }, () => {
            // Update DNR rules to enable home redirect
            if (chrome.declarativeNetRequest) {
                chrome.declarativeNetRequest.updateEnabledRulesets({
                    enableRulesetIds: ["ruleset_home_redirect"],
                });
            }

            // Show optional notification that feature has been re-enabled
            if (chrome.notifications) {
                chrome.notifications.create("snooze-expired", {
                    type: "basic",
                    iconUrl: "assets/icon48.png",
                    title: "Xtab Focus Feature Re-enabled",
                    message:
                        "Your Home Redirect feature is now active again to help maintain your focus.",
                });
            }
        });
    });
}

// Check for active snooze on startup and set up alarm if needed
function checkAndRestoreSnoozeAlarm() {
    safeStorageGet(["snoozeEndTime"], (items) => {
        if (items.snoozeEndTime) {
            const now = Date.now();
            const snoozeEndTime = items.snoozeEndTime;

            if (snoozeEndTime <= now) {
                // Snooze has already expired, handle it immediately
                handleSnoozeExpiration();
            } else {
                // Snooze is still active, recreate the alarm
                chrome.alarms.create("snoozeExpired", { when: snoozeEndTime });
            }
        }
    });
}

// Listen for alarm events (snooze expiration)
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "snoozeExpired") {
        handleSnoozeExpiration();
    }
});

// Check for active snooze when extension starts
chrome.runtime.onStartup.addListener(() => {
    initializeDNRRules();
    checkAndRestoreSnoozeAlarm();
});

chrome.runtime.onInstalled.addListener(() => {
    initializeDNRRules();
    checkAndRestoreSnoozeAlarm();
});
