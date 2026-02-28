(function () {
    const DEFAULTS = {
        homeRedirect: false,
        exploreRedirect: false,
        messagesRedirect: false,
        exploreRedirectAllowSearch: true,
        redirectTargets: {
            home: "bookmarks",
            explore: "bookmarks",
            messages: "bookmarks",
        },
        customRedirectTargets: {
            home: "",
            explore: "",
            messages: "",
        },
    };

    const TARGETS = {
        bookmarks: "https://x.com/i/bookmarks",
        lists: "https://x.com/i/lists",
        messages: "https://x.com/messages",
        home: "https://x.com/home",
    };

    let settings = mergeSettings(DEFAULTS);
    let storageLoaded = false;
    let lastHref = location.href;
    let previousHref = "";

    function mergeSettings(raw) {
        const source = raw || {};
        return {
            ...DEFAULTS,
            ...source,
            redirectTargets: {
                ...DEFAULTS.redirectTargets,
                ...(source.redirectTargets || {}),
            },
            customRedirectTargets: {
                ...DEFAULTS.customRedirectTargets,
                ...(source.customRedirectTargets || {}),
            },
        };
    }

    function parseUrl(value) {
        try {
            return new URL(value, location.origin);
        } catch (error) {
            return null;
        }
    }

    function isValidHttpUrl(value) {
        if (!value) return false;
        try {
            const parsed = new URL(value);
            return parsed.protocol === "https:" || parsed.protocol === "http:";
        } catch (error) {
            return false;
        }
    }

    function resolveTarget(feature) {
        const targetType = settings.redirectTargets[feature] || "bookmarks";
        if (targetType === "custom") {
            const customValue = (settings.customRedirectTargets[feature] || "").trim();
            return isValidHttpUrl(customValue) ? customValue : TARGETS.bookmarks;
        }

        return TARGETS[targetType] || TARGETS.bookmarks;
    }

    function isHome(urlValue) {
        const parsed = parseUrl(urlValue);
        if (!parsed) return false;
        return parsed.origin === "https://x.com" && (parsed.pathname === "/home" || parsed.pathname === "/home/");
    }

    function isExplore(urlValue) {
        const parsed = parseUrl(urlValue);
        if (!parsed) return false;
        return parsed.origin === "https://x.com" && parsed.pathname.startsWith("/explore");
    }

    function isMessages(urlValue) {
        const parsed = parseUrl(urlValue);
        if (!parsed) return false;
        return parsed.origin === "https://x.com" && parsed.pathname.startsWith("/messages");
    }

    function isSameDestination(targetUrl) {
        const target = parseUrl(targetUrl);
        const current = parseUrl(location.href);

        if (!target || !current) return false;

        return (
            target.origin === current.origin &&
            target.pathname === current.pathname &&
            target.search === current.search
        );
    }

    function shouldBypassExploreRedirect() {
        if (!settings.exploreRedirectAllowSearch) {
            return false;
        }

        const parsed = parseUrl(location.href);
        if (!parsed) return false;

        if (parsed.searchParams.has("q")) {
            return true;
        }

        const referrer = (document.referrer || "").toLowerCase();
        if (referrer.includes("/search") || referrer.includes("/explore/search")) {
            return true;
        }

        const previous = parseUrl(previousHref);
        if (previous && previous.pathname.startsWith("/search")) {
            return true;
        }

        return false;
    }

    function redirectTo(targetUrl) {
        if (!targetUrl || isSameDestination(targetUrl)) {
            return false;
        }

        location.replace(targetUrl);
        return true;
    }

    function redirectIfNeeded() {
        if (settings.homeRedirect && isHome(location.href)) {
            return redirectTo(resolveTarget("home"));
        }

        if (settings.messagesRedirect && isMessages(location.href)) {
            return redirectTo(resolveTarget("messages"));
        }

        if (settings.exploreRedirect && isExplore(location.href)) {
            if (!shouldBypassExploreRedirect()) {
                return redirectTo(resolveTarget("explore"));
            }
        }

        return false;
    }

    function onUrlMaybeChanged() {
        if (location.href === lastHref) return;
        previousHref = lastHref;
        lastHref = location.href;
        redirectIfNeeded();
    }

    function setupUrlChangeListeners() {
        const observer = new MutationObserver(onUrlMaybeChanged);
        observer.observe(document, { childList: true, subtree: true });

        const wrapHistory = (methodName) => {
            const original = history[methodName];
            if (typeof original !== "function") return;

            history[methodName] = function () {
                const result = original.apply(this, arguments);
                window.dispatchEvent(new Event("locationchange"));
                return result;
            };
        };

        wrapHistory("pushState");
        wrapHistory("replaceState");

        window.addEventListener("popstate", () => {
            window.dispatchEvent(new Event("locationchange"));
        });

        window.addEventListener("locationchange", onUrlMaybeChanged);
    }

    function initialize() {
        setupUrlChangeListeners();
        redirectIfNeeded();
    }

    try {
        if (chrome?.storage?.sync) {
            chrome.storage.sync.get(DEFAULTS, (items) => {
                settings = mergeSettings(items);
                storageLoaded = true;
                initialize();
            });

            chrome.storage.onChanged?.addListener((changes, area) => {
                if (area !== "sync") return;

                let hasRelevantChange = false;
                Object.keys(changes).forEach((key) => {
                    if (Object.prototype.hasOwnProperty.call(DEFAULTS, key)) {
                        hasRelevantChange = true;
                    }
                });

                if (!hasRelevantChange) return;

                chrome.storage.sync.get(DEFAULTS, (items) => {
                    settings = mergeSettings(items);
                    if (!storageLoaded) {
                        storageLoaded = true;
                        initialize();
                    } else {
                        redirectIfNeeded();
                    }
                });
            });
        } else {
            initialize();
        }
    } catch (error) {
        initialize();
    }
})();
