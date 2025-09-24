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

function initializeDNRRules() {
    try {
        chrome.storage.sync.get({ homeRedirect: false }, (items) => {
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
    } catch (e) {
        // ignore errors
    }
}
