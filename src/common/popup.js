(function () {
    const q = (sel) => document.querySelector(sel);
    const $posts = q("#posts");
    const $notifs = q("#notifications");
    const $homeRedirect = q("#homeRedirect");
    const defaults = {
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
            chrome.storage.sync.get(keys || defaults, (items) => {
                // Ensure backward compatibility by merging with defaults
                const mergedItems = { ...defaults, ...items };
                callback(mergedItems);
            });
        } catch (e) {
            console.warn("Storage get failed, using defaults:", e);
            callback(defaults);
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

    // Helper function to get friction-specific data
    function getFrictionData(callback) {
        safeStorageGet(["snoozeEndTime", "disableAttempts", "lastAttemptDate"], (items) => {
            callback({
                snoozeEndTime: items.snoozeEndTime,
                disableAttempts: items.disableAttempts || 0,
                lastAttemptDate: items.lastAttemptDate,
            });
        });
    }

    // Helper function to update friction data
    function updateFrictionData(frictionData, callback) {
        const updateData = {};
        if (frictionData.snoozeEndTime !== undefined) {
            updateData.snoozeEndTime = frictionData.snoozeEndTime;
        }
        if (frictionData.disableAttempts !== undefined) {
            updateData.disableAttempts = frictionData.disableAttempts;
        }
        if (frictionData.lastAttemptDate !== undefined) {
            updateData.lastAttemptDate = frictionData.lastAttemptDate;
        }
        safeStorageSet(updateData, callback);
    }

    // Confirmation dialog functions
    function showConfirmDialog(message, onConfirm, onCancel) {
        const dialog = q("#confirmDialog");
        const messageEl = q(".dialog-message");
        const confirmBtn = q("#confirmProceed");
        const cancelBtn = q("#confirmCancel");

        // Set the message
        if (message) {
            messageEl.textContent = message;
        }

        // Show the dialog
        dialog.style.display = "flex";

        // Handle confirm button
        const handleConfirm = () => {
            dialog.style.display = "none";
            confirmBtn.removeEventListener("click", handleConfirm);
            cancelBtn.removeEventListener("click", handleCancel);
            if (onConfirm) onConfirm();
        };

        // Handle cancel button
        const handleCancel = () => {
            dialog.style.display = "none";
            confirmBtn.removeEventListener("click", handleConfirm);
            cancelBtn.removeEventListener("click", handleCancel);
            if (onCancel) onCancel();
        };

        // Add event listeners
        confirmBtn.addEventListener("click", handleConfirm);
        cancelBtn.addEventListener("click", handleCancel);

        // Close dialog when clicking outside
        dialog.addEventListener("click", (e) => {
            if (e.target === dialog) {
                handleCancel();
            }
        });
    }

    // Helper function to reset daily attempt counter if needed
    function resetDailyAttemptsIfNeeded(callback) {
        getFrictionData((frictionData) => {
            const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

            if (frictionData.lastAttemptDate !== today) {
                updateFrictionData(
                    {
                        disableAttempts: 0,
                        lastAttemptDate: today,
                    },
                    callback
                );
            } else {
                if (callback) callback();
            }
        });
    }

    function load() {
        safeStorageGet(null, (items) => {
            $posts.checked = !!items.posts;
            $notifs.checked = !!items.notifications;
            $homeRedirect.checked = !!items.homeRedirect;
        });
    }

    function save() {
        safeStorageSet(
            {
                posts: $posts.checked,
                notifications: $notifs.checked,
                homeRedirect: $homeRedirect.checked,
            },
            () => {
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
            }
        );
    }

    // Handle home redirect toggle with friction
    function handleHomeRedirectToggle(e) {
        // If user is trying to disable (unchecking), show confirmation
        if (!e.target.checked) {
            // Prevent the toggle from changing immediately
            e.preventDefault();
            e.target.checked = true; // Keep it checked while showing confirmation

            showConfirmDialog(
                "The Home Redirect feature helps maintain your focus by redirecting you to your bookmarks instead of distracting social feeds. Are you sure you want to disable this productivity feature?",
                () => {
                    // User confirmed - proceed with disable
                    $homeRedirect.checked = false;
                    save();
                },
                () => {
                    // User cancelled - keep it enabled
                    $homeRedirect.checked = true;
                }
            );
        } else {
            // User is enabling - no friction needed
            save();
        }
    }

    // Add event listeners
    $posts.addEventListener("change", save);
    $notifs.addEventListener("change", save);
    $homeRedirect.addEventListener("change", handleHomeRedirectToggle);

    document.addEventListener("DOMContentLoaded", load);
})();
