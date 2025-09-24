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
    console.log("Handling snooze expiration...");

    // Clear the snooze end time from storage
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
                console.warn("Failed to update DNR rules on snooze expiration:", e);
            }

            // Show notification that feature has been re-enabled (requirement 2.4)
            showSnoozeExpirationNotification();
        });
    });
}

// Show notification when snooze expires and feature re-enables
function showSnoozeExpirationNotification() {
    try {
        if (chrome.notifications) {
            chrome.notifications.create("snooze-expired", {
                type: "basic",
                iconUrl: "../shared-assets/icon48.png", // Corrected icon path
                title: "Xtab Focus Feature Re-enabled",
                message:
                    "Your Home Redirect feature is now active again to help maintain your focus.",
                silent: false, // Brief, non-intrusive notification
            });

            // Auto-clear notification after 5 seconds to keep it brief
            setTimeout(() => {
                chrome.notifications.clear("snooze-expired");
            }, 5000);
        }
    } catch (e) {
        console.warn("Failed to show snooze expiration notification:", e);
    }
}

// Check for active snooze on startup and set up alarm if needed
function checkAndRestoreSnoozeAlarm() {
    safeStorageGet(["snoozeEndTime"], (items) => {
        if (items.snoozeEndTime) {
            const now = Date.now();
            const snoozeEndTime = items.snoozeEndTime;

            console.log("Checking snooze status on startup:", {
                now: new Date(now).toISOString(),
                snoozeEnd: new Date(snoozeEndTime).toISOString(),
                expired: snoozeEndTime <= now,
            });

            if (snoozeEndTime <= now) {
                // Snooze has already expired, handle it immediately
                console.log("Snooze expired while extension was inactive, handling now");
                handleSnoozeExpiration();
            } else {
                // Snooze is still active, recreate the alarm
                try {
                    chrome.alarms.create("snoozeExpired", { when: snoozeEndTime });
                    console.log(
                        "Restored snooze alarm for:",
                        new Date(snoozeEndTime).toISOString()
                    );
                } catch (e) {
                    console.warn("Failed to create snooze alarm:", e);
                    // If alarm creation fails, fall back to immediate expiration
                    handleSnoozeExpiration();
                }
            }
        }
    });
}

// Listen for alarm events (snooze expiration)
chrome.alarms.onAlarm.addListener((alarm) => {
    console.log("Alarm triggered:", alarm.name);
    if (alarm.name === "snoozeExpired") {
        handleSnoozeExpiration();
    }
});

// Helper function to set up snooze alarm (can be called from popup)
function setupSnoozeAlarm(snoozeEndTime) {
    try {
        // Clear any existing snooze alarm
        chrome.alarms.clear("snoozeExpired");

        // Create new alarm for the snooze end time
        chrome.alarms.create("snoozeExpired", { when: snoozeEndTime });

        console.log("Snooze alarm set for:", new Date(snoozeEndTime).toISOString());
        return true;
    } catch (e) {
        console.warn("Failed to setup snooze alarm:", e);
        return false;
    }
}

// Listen for messages from popup to set up snooze
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "openInNewTab") {
        chrome.tabs.create({ url: message.url, active: false });
    } else if (message.action === "setupSnoozeAlarm") {
        const success = setupSnoozeAlarm(message.snoozeEndTime);
        sendResponse({ success });
    }
});

// Check for active snooze when extension starts
chrome.runtime.onStartup.addListener(() => {
    console.log("Extension startup - initializing...");
    initializeDNRRules();
    checkAndRestoreSnoozeAlarm();
});

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed/updated - initializing...");
    initializeDNRRules();
    checkAndRestoreSnoozeAlarm();
});
