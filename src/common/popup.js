(function () {
    const q = (sel) => document.querySelector(sel);
    const $posts = q("#posts");
    const $notifs = q("#notifications");
    const defaults = { posts: true, notifications: true };

    function load() {
        try {
            chrome.storage.sync.get(defaults, (items) => {
                $posts.checked = !!items.posts;
                $notifs.checked = !!items.notifications;
            });
        } catch (e) {
            /* ignore */
        }
    }

    function save() {
        try {
            chrome.storage.sync.set({ posts: $posts.checked, notifications: $notifs.checked });
        } catch (e) {
            /* ignore */
        }
    }

    [$posts, $notifs].forEach((el) => el.addEventListener("change", save));

    document.addEventListener("DOMContentLoaded", load);
})();
