chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "openInNewTab") {
        chrome.tabs.create({ url: message.url, active: false });
    }
});

// Initialize DNR rules based on stored settings
chrome.runtime.onStartup.addListener(() => {
    initializeDNRRules();
});

chrome.runtime.onInstalled.addListener(() => {
    initializeDNRRules();
});

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
