// Function to check if a link is a post link
function isPostLink(link) {
    return link.href.includes("/status/") && link.querySelector("time");
}

// Function to check if a link is the notifications link
function isNotificationsLink(link) {
    return (
        link.href.includes("/notifications") &&
        link.getAttribute("data-testid") === "AppTabBar_Notifications_Link"
    );
}

// User settings (defaults)
let xtabSettings = {
    posts: true,
    notifications: true,
};

// Load settings from storage (with defaults)
try {
    if (chrome?.storage?.sync) {
        chrome.storage.sync.get({ posts: true, notifications: true }, (items) => {
            xtabSettings = { posts: !!items.posts, notifications: !!items.notifications };
        });
        chrome.storage.onChanged?.addListener((changes, area) => {
            if (area === "sync") {
                if (Object.prototype.hasOwnProperty.call(changes, "posts")) {
                    xtabSettings.posts = !!changes.posts.newValue;
                }
                if (Object.prototype.hasOwnProperty.call(changes, "notifications")) {
                    xtabSettings.notifications = !!changes.notifications.newValue;
                }
            }
        });
    }
} catch (e) {
    // ignore storage errors; keep defaults
}

// Function to handle post link clicks
function handlePostLinkClick(event) {
    if (!xtabSettings.posts) return; // feature disabled
    if (isPostLink(event.currentTarget)) {
        event.preventDefault();
        const fullUrl = event.currentTarget.href;
        chrome.runtime.sendMessage({
            action: "openInNewTab",
            url: fullUrl,
        });
    }
}

// Function to handle notifications link clicks
function handleNotificationsLinkClick(event) {
    if (!xtabSettings.notifications) return; // feature disabled
    if (isNotificationsLink(event.currentTarget)) {
        event.preventDefault();
        const fullUrl = event.currentTarget.href;
        chrome.runtime.sendMessage({
            action: "openInNewTab",
            url: fullUrl.startsWith("http") ? fullUrl : `https://x.com${fullUrl}`,
        });
    }
}

// Function to add click handlers to post links and notifications link
function addClickHandlers() {
    const links = document.querySelectorAll("a");
    links.forEach((link) => {
        if (isPostLink(link)) {
            link.addEventListener("click", handlePostLinkClick);
        } else if (isNotificationsLink(link)) {
            link.addEventListener("click", handleNotificationsLinkClick);
        }
    });
}

// Create a MutationObserver to watch for new links
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            addClickHandlers();
        }
    });
});

// Start observing the document with the configured parameters
observer.observe(document.body, {
    childList: true,
    subtree: true,
});

// Initial setup
if (xtabSettings.posts || xtabSettings.notifications) {
    addClickHandlers();
}
