(function () {
    const q = (sel) => document.querySelector(sel);
    const $posts = q("#posts");
    const $notifs = q("#notifications");
    const $homeRedirect = q("#homeRedirect");
    const defaults = { posts: true, notifications: true, homeRedirect: false };

    function load() {
        try {
            chrome.storage.sync.get(defaults, (items) => {
                $posts.checked = !!items.posts;
                $notifs.checked = !!items.notifications;
                $homeRedirect.checked = !!items.homeRedirect;
            });
        } catch (e) {
            /* ignore */
        }
    }

    function save() {
        try {
            chrome.storage.sync.set({
                posts: $posts.checked,
                notifications: $notifs.checked,
                homeRedirect: $homeRedirect.checked,
            });

            // Update DNR rules when home redirect setting changes
            if (chrome.declarativeNetRequest) {
                if ($homeRedirect.checked) {
                    chrome.declarativeNetRequest.updateEnabledRulesets({
                        enableRulesetIds: ["ruleset_home_redirect"],
                    });
                } else {
                    chrome.declarativeNetRequest.updateEnabledRulesets({
                        disableRulesetIds: ["ruleset_home_redirect"],
                    });
                }
            }
        } catch (e) {
            /* ignore */
        }
    }

    [$posts, $notifs, $homeRedirect].forEach((el) => el.addEventListener("change", save));

    document.addEventListener("DOMContentLoaded", load);
})();
