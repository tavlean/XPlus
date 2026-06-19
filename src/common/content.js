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
let xplusSettings = {
    posts: true,
    notifications: true,
};

// Load settings from storage (with defaults)
try {
    if (chrome?.storage?.sync) {
        chrome.storage.sync.get({ posts: true, notifications: true }, (items) => {
            xplusSettings = { posts: !!items.posts, notifications: !!items.notifications };
        });
        chrome.storage.onChanged?.addListener((changes, area) => {
            if (area === "sync") {
                if (Object.prototype.hasOwnProperty.call(changes, "posts")) {
                    xplusSettings.posts = !!changes.posts.newValue;
                }
                if (Object.prototype.hasOwnProperty.call(changes, "notifications")) {
                    xplusSettings.notifications = !!changes.notifications.newValue;
                }
            }
        });
    }
} catch (e) {
    // ignore storage errors; keep defaults
}

// Safe message sending with fallback
function safeOpenInNewTab(url) {
    try {
        if (chrome?.runtime?.sendMessage) {
            chrome.runtime.sendMessage({
                action: "openInNewTab",
                url: url,
            });
        } else {
            // Fallback: open in new tab using window.open
            window.open(url, "_blank");
        }
    } catch (e) {
        // Fallback: open in new tab using window.open
        window.open(url, "_blank");
    }
}

// Single delegated click handler for the whole page.
//
// Instead of scanning every <a> on the page and attaching listeners on each
// DOM mutation (very expensive on X's constantly-mutating SPA), we listen once
// and resolve the clicked link only when a click actually happens. This does
// zero work while scrolling.
function handleDelegatedClick(event) {
    // Resolve the click target up to its nearest anchor (clicks often land on a
    // child element such as the <time> or text inside the link).
    const anchor = event.target?.closest?.("a[href]");
    if (!anchor) return;

    if (xplusSettings.posts && isPostLink(anchor)) {
        event.preventDefault();
        safeOpenInNewTab(anchor.href);
        return;
    }

    if (xplusSettings.notifications && isNotificationsLink(anchor)) {
        event.preventDefault();
        const fullUrl = anchor.href;
        safeOpenInNewTab(fullUrl.startsWith("http") ? fullUrl : `https://x.com${fullUrl}`);
    }
}

// Capture phase so we intercept the click before X's own SPA navigation
// handlers can act on it. The settings checks above are read live, so the
// listener correctly does nothing when both features are disabled.
document.addEventListener("click", handleDelegatedClick, true);
