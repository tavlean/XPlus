// Initialize DNR rules based on stored settings

// Enhanced storage defaults with friction data
const storageDefaults = {
    posts: true,
    notifications: true,
    homeRedirect: false,
    exploreRedirect: false,
    // Friction data fields for home redirect
    snoozeEndTime: null,
    disableAttempts: 0,
    lastAttemptDate: null,
    // Friction data fields for explore redirect
    exploreSnoozeEndTime: null,
    exploreDisableAttempts: 0,
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

            // Show notification that feature has been re-enabled (requirement 2.4)
            showSnoozeExpirationNotification("home");
        });
    });
}

// Snooze timer management functions for explore redirect
function handleExploreSnoozeExpiration() {
    console.log("Handling explore snooze expiration...");

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
                console.warn("Failed to update DNR rules on explore snooze expiration:", e);
            }

            // Show notification that feature has been re-enabled (requirement 2.4)
            showSnoozeExpirationNotification("explore");
        });
    });
}

// Show notification when snooze expires and feature re-enables
function showSnoozeExpirationNotification(featureType = "home") {
    try {
        if (chrome.notifications) {
            const featureName = featureType === "home" ? "Home Redirect" : "Explore Redirect";
            const notificationId = `${featureType}-snooze-expired`;

            chrome.notifications.create(notificationId, {
                type: "basic",
                iconUrl: "../shared-assets/icon48.png", // Corrected icon path
                title: "XPlus Focus Feature Re-enabled",
                message: `Your ${featureName} feature is now active again to help maintain your focus.`,
                silent: false, // Brief, non-intrusive notification
            });

            // Auto-clear notification after 5 seconds to keep it brief
            setTimeout(() => {
                chrome.notifications.clear(notificationId);
            }, 5000);
        }
    } catch (e) {
        console.warn("Failed to show snooze expiration notification:", e);
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
                    chrome.alarms.create("homeSnoozeExpired", { when: homeSnoozeEndTime });
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
                    chrome.alarms.create("exploreSnoozeExpired", { when: exploreSnoozeEndTime });
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
    }
});

// Helper function to set up snooze alarm for a specific feature (can be called from popup)
function setupSnoozeAlarm(featureType, snoozeEndTime) {
    try {
        const alarmName = featureType === "home" ? "homeSnoozeExpired" : "exploreSnoozeExpired";

        // Clear any existing snooze alarm for this feature
        chrome.alarms.clear(alarmName);

        // Create new alarm for the snooze end time
        chrome.alarms.create(alarmName, { when: snoozeEndTime });

        console.log(`${featureType} snooze alarm set for:`, new Date(snoozeEndTime).toISOString());
        return true;
    } catch (e) {
        console.warn(`Failed to setup ${featureType} snooze alarm:`, e);
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
