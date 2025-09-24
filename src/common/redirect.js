(function () {
    function isHome(url) {
        try {
            const u = new URL(url, location.origin);
            return (
                u.origin === "https://x.com" && (u.pathname === "/home" || u.pathname === "/home/")
            );
        } catch {
            return false;
        }
    }

    let homeRedirectEnabled = false;
    let storageLoaded = false;

    function redirectIfHome() {
        if (homeRedirectEnabled && isHome(location.href)) {
            location.replace("https://x.com/i/bookmarks");
            return true;
        }
        return false;
    }

    function initializeRedirectLogic() {
        if (!redirectIfHome()) {
            let lastHref = location.href;
            const onUrlChange = () => {
                if (location.href !== lastHref) {
                    lastHref = location.href;
                    redirectIfHome();
                }
            };

            const mo = new MutationObserver(onUrlChange);
            mo.observe(document, { subtree: true, childList: true });

            const wrap = (name) => {
                const orig = history[name];
                if (typeof orig !== "function") return;
                history[name] = function () {
                    const ret = orig.apply(this, arguments);
                    window.dispatchEvent(new Event("locationchange"));
                    return ret;
                };
            };

            wrap("pushState");
            wrap("replaceState");
            window.addEventListener("popstate", () =>
                window.dispatchEvent(new Event("locationchange"))
            );
            window.addEventListener("locationchange", onUrlChange);
        }
    }

    // Load setting from storage and initialize redirect logic
    try {
        if (chrome?.storage?.sync) {
            chrome.storage.sync.get({ homeRedirect: false }, (items) => {
                homeRedirectEnabled = !!items.homeRedirect;
                storageLoaded = true;
                initializeRedirectLogic();
            });
            chrome.storage.onChanged?.addListener((changes, area) => {
                if (
                    area === "sync" &&
                    Object.prototype.hasOwnProperty.call(changes, "homeRedirect")
                ) {
                    homeRedirectEnabled = !!changes.homeRedirect.newValue;
                    // If storage wasn't loaded yet, initialize now
                    if (!storageLoaded) {
                        storageLoaded = true;
                        initializeRedirectLogic();
                    } else {
                        // Storage was already loaded, just try redirect again
                        redirectIfHome();
                    }
                }
            });
        } else {
            // Fallback if storage is not available
            initializeRedirectLogic();
        }
    } catch (e) {
        // ignore storage errors; initialize with defaults
        initializeRedirectLogic();
    }
})();
