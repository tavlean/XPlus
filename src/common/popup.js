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

    // Snooze options dialog functions
    function showSnoozeDialog(onSnoozeSelect, onPermanentDisable, onCancel) {
        const dialog = q("#snoozeDialog");
        const snoozeOptions = dialog.querySelectorAll(".snooze-option");
        const permanentBtn = q("#permanentDisable");
        const cancelBtn = q("#snoozeCancel");

        // Handle snooze option selection
        const handleSnoozeSelect = (e) => {
            const duration = e.currentTarget.getAttribute("data-duration");
            dialog.style.display = "none";
            removeEventListeners();
            if (onSnoozeSelect) onSnoozeSelect(duration);
        };

        // Handle permanent disable
        const handlePermanentDisable = () => {
            dialog.style.display = "none";
            removeEventListeners();
            if (onPermanentDisable) onPermanentDisable();
        };

        // Handle cancel
        const handleCancel = () => {
            dialog.style.display = "none";
            removeEventListeners();
            if (onCancel) onCancel();
        };

        // Remove all event listeners
        function removeEventListeners() {
            snoozeOptions.forEach((option) => {
                option.removeEventListener("click", handleSnoozeSelect);
            });
            permanentBtn.removeEventListener("click", handlePermanentDisable);
            cancelBtn.removeEventListener("click", handleCancel);
        }

        // Show the dialog
        dialog.style.display = "flex";

        // Add event listeners
        snoozeOptions.forEach((option) => {
            option.addEventListener("click", handleSnoozeSelect);
        });
        permanentBtn.addEventListener("click", handlePermanentDisable);
        cancelBtn.addEventListener("click", handleCancel);

        // Close dialog when clicking outside
        dialog.addEventListener("click", (e) => {
            if (e.target === dialog) {
                handleCancel();
            }
        });
    }

    // Countdown dialog functions
    function showCountdownDialog(seconds, onComplete, onCancel) {
        const dialog = q("#countdownDialog");
        const countdownNumber = q("#countdownNumber");
        const cancelBtn = q("#countdownCancel");

        let currentSeconds = seconds;
        let countdownInterval;

        // Update countdown display
        function updateCountdown() {
            countdownNumber.textContent = currentSeconds;

            if (currentSeconds <= 0) {
                clearInterval(countdownInterval);
                dialog.style.display = "none";
                cancelBtn.removeEventListener("click", handleCancel);
                if (onComplete) onComplete();
                return;
            }

            currentSeconds--;
        }

        // Handle cancel button
        const handleCancel = () => {
            clearInterval(countdownInterval);
            dialog.style.display = "none";
            cancelBtn.removeEventListener("click", handleCancel);
            if (onCancel) onCancel();
        };

        // Show the dialog
        dialog.style.display = "flex";

        // Set initial countdown number
        countdownNumber.textContent = currentSeconds;

        // Start countdown
        countdownInterval = setInterval(updateCountdown, 1000);

        // Add cancel button listener
        cancelBtn.addEventListener("click", handleCancel);

        // Close dialog when clicking outside (cancel countdown)
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

    // Helper function to calculate snooze end time
    function calculateSnoozeEndTime(duration) {
        const now = new Date();

        if (duration === "tomorrow") {
            // Set to tomorrow at 9 AM
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);
            return tomorrow.getTime();
        } else {
            // Duration is in minutes
            const minutes = parseInt(duration, 10);
            return now.getTime() + minutes * 60 * 1000;
        }
    }

    // Helper function to calculate countdown duration based on snooze time
    function getCountdownDuration(snoozeDuration) {
        if (snoozeDuration === "15") return 15; // 15 seconds for 15 minutes
        if (snoozeDuration === "60") return 60; // 60 seconds for 1 hour
        if (snoozeDuration === "240") return 240; // 240 seconds (4 minutes) for 4 hours
        if (snoozeDuration === "tomorrow") return 300; // 300 seconds (5 minutes) for tomorrow
        return 15; // Default fallback
    }

    // Helper function to get snooze duration display text
    function getSnoozeDurationText(duration) {
        if (duration === "15") return "15 minutes";
        if (duration === "60") return "1 hour";
        if (duration === "240") return "4 hours";
        if (duration === "tomorrow") return "until tomorrow";
        return duration;
    }

    // Helper function to handle snooze selection with countdown
    function handleSnoozeSelection(duration) {
        const countdownSeconds = getCountdownDuration(duration);
        const durationText = getSnoozeDurationText(duration);

        // Update countdown dialog title and message for snooze
        const countdownDialog = q("#countdownDialog");
        const dialogTitle = countdownDialog.querySelector(".dialog-title");
        const countdownMessage = countdownDialog.querySelector(".countdown-message");

        dialogTitle.textContent = `Snoozing for ${durationText}...`;
        countdownMessage.textContent = `Take a moment to reconsider. This will disable your focus feature for ${durationText}.`;

        // Show countdown before applying snooze
        showCountdownDialog(
            countdownSeconds,
            () => {
                // Countdown completed - apply the snooze
                const snoozeEndTime = calculateSnoozeEndTime(duration);

                // Store snooze data and disable the feature
                updateFrictionData({ snoozeEndTime }, () => {
                    // Disable the feature
                    $homeRedirect.checked = false;
                    save();

                    // Update the snooze status indicator
                    updateSnoozeStatusIndicator();

                    // Set up alarm for snooze expiration
                    if (chrome.alarms) {
                        // Clear any existing snooze alarm first
                        chrome.alarms.clear("snoozeExpired", () => {
                            // Create new alarm for this snooze period
                            chrome.alarms.create("snoozeExpired", { when: snoozeEndTime });
                        });
                    }
                });

                // Reset dialog title and message for future permanent disable use
                dialogTitle.textContent = "Disabling in...";
                countdownMessage.textContent =
                    "Take a deep breath and reconsider. This will disable your focus feature.";
            },
            () => {
                // User cancelled countdown - keep it enabled
                $homeRedirect.checked = true;

                // Reset dialog title and message
                dialogTitle.textContent = "Disabling in...";
                countdownMessage.textContent =
                    "Take a deep breath and reconsider. This will disable your focus feature.";
            }
        );
    }

    function load() {
        safeStorageGet(null, (items) => {
            $posts.checked = !!items.posts;
            $notifs.checked = !!items.notifications;
            $homeRedirect.checked = !!items.homeRedirect;

            // Check if there's an active snooze that has expired
            if (items.snoozeEndTime && items.snoozeEndTime <= Date.now()) {
                // Snooze has expired, clear it and re-enable the feature
                updateFrictionData({ snoozeEndTime: null }, () => {
                    if (!items.homeRedirect) {
                        // Re-enable the feature if it was disabled due to snooze
                        $homeRedirect.checked = true;
                        save();
                    }
                    // Update the snooze indicator after clearing expired snooze
                    updateSnoozeStatusIndicator();
                });
            } else {
                // Update the snooze indicator on load
                updateSnoozeStatusIndicator();
            }
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
        // If user is enabling the feature, clear any active snooze
        if (e.target.checked) {
            getFrictionData((frictionData) => {
                if (frictionData.snoozeEndTime) {
                    // Clear the snooze timer and alarm
                    updateFrictionData({ snoozeEndTime: null }, () => {
                        if (chrome.alarms) {
                            chrome.alarms.clear("snoozeExpired");
                        }
                        // Update the snooze indicator after clearing snooze
                        updateSnoozeStatusIndicator();
                        // Save after snooze is fully cleared
                        save();
                    });
                } else {
                    // No snooze to clear, just update indicator and save
                    updateSnoozeStatusIndicator();
                    save();
                }
            });
            return;
        }

        // If user is trying to disable (unchecking), show confirmation
        if (!e.target.checked) {
            // Prevent the toggle from changing immediately
            e.preventDefault();
            e.target.checked = true; // Keep it checked while showing confirmation

            showConfirmDialog(
                "The Home Redirect feature helps maintain your focus by redirecting you to your bookmarks instead of distracting social feeds. Are you sure you want to disable this productivity feature?",
                () => {
                    // User confirmed - show snooze options
                    showSnoozeDialog(
                        (duration) => {
                            // User selected snooze option
                            handleSnoozeSelection(duration);
                        },
                        () => {
                            // User selected permanent disable - show countdown
                            const countdownDialog = q("#countdownDialog");
                            const dialogTitle = countdownDialog.querySelector(".dialog-title");
                            const countdownMessage =
                                countdownDialog.querySelector(".countdown-message");

                            // Ensure dialog has correct text for permanent disable
                            dialogTitle.textContent = "Disabling in...";
                            countdownMessage.textContent =
                                "Take a deep breath and reconsider. This will disable your focus feature.";

                            showCountdownDialog(
                                5, // 5 second countdown for permanent disable
                                () => {
                                    // Countdown completed - proceed with permanent disable
                                    $homeRedirect.checked = false;
                                    save();
                                },
                                () => {
                                    // User cancelled countdown - keep it enabled
                                    $homeRedirect.checked = true;
                                }
                            );
                        },
                        () => {
                            // User cancelled snooze dialog - keep it enabled
                            $homeRedirect.checked = true;
                        }
                    );
                },
                () => {
                    // User cancelled confirmation - keep it enabled
                    $homeRedirect.checked = true;
                }
            );
        } else {
            // User is enabling - no friction needed
            save();
        }
    }

    // Snooze status indicator functions
    function updateSnoozeStatusIndicator() {
        const snoozeStatus = q("#snoozeStatus");
        const snoozeTimeEl = q("#snoozeTime");

        getFrictionData((frictionData) => {
            if (frictionData.snoozeEndTime && frictionData.snoozeEndTime > Date.now()) {
                // Snooze is active - show the indicator
                const remainingTime = frictionData.snoozeEndTime - Date.now();
                const timeText = formatRemainingTime(remainingTime);

                snoozeTimeEl.textContent = timeText;
                snoozeStatus.style.display = "block";
            } else {
                // No active snooze - hide the indicator
                snoozeStatus.style.display = "none";

                // If there was a snooze time but it's expired, clear it
                if (frictionData.snoozeEndTime && frictionData.snoozeEndTime <= Date.now()) {
                    updateFrictionData({ snoozeEndTime: null });
                }
            }
        });
    }

    // Helper function to format remaining time in a user-friendly way
    function formatRemainingTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const totalMinutes = Math.floor(totalSeconds / 60);
        const totalHours = Math.floor(totalMinutes / 60);
        const days = Math.floor(totalHours / 24);

        if (days > 0) {
            const hours = totalHours % 24;
            if (hours > 0) {
                return `${days}d ${hours}h`;
            }
            return `${days} day${days > 1 ? "s" : ""}`;
        } else if (totalHours > 0) {
            const minutes = totalMinutes % 60;
            if (minutes > 0) {
                return `${totalHours}h ${minutes}m`;
            }
            return `${totalHours} hour${totalHours > 1 ? "s" : ""}`;
        } else if (totalMinutes > 0) {
            return `${totalMinutes} minute${totalMinutes > 1 ? "s" : ""}`;
        } else {
            return "less than a minute";
        }
    }

    // Set up periodic updates for the snooze indicator
    function startSnoozeIndicatorUpdates() {
        // Update immediately
        updateSnoozeStatusIndicator();

        // Update every 30 seconds to keep the time current
        setInterval(updateSnoozeStatusIndicator, 30000);
    }

    // Function to make entire option elements clickable with asymmetric behavior for focus features
    function makeOptionClickable(optionElement, toggleElement) {
        optionElement.addEventListener("click", (e) => {
            // Prevent triggering if the click was on the toggle switch itself
            // This prevents double-triggering when clicking directly on the switch
            if (e.target.closest(".switch")) {
                return;
            }

            // Prevent event bubbling
            e.stopPropagation();

            // Check if this is a focus feature (has friction mechanism)
            const isFocusFeature = toggleElement.id === "homeRedirect"; // Add more focus features here as needed

            if (isFocusFeature) {
                // For focus features: only allow enabling via area click, require toggle click to disable
                if (!toggleElement.checked) {
                    // Feature is currently disabled, allow enabling via area click
                    toggleElement.checked = true;

                    // Trigger the change event to maintain existing functionality
                    const changeEvent = new Event("change", { bubbles: true });
                    toggleElement.dispatchEvent(changeEvent);
                }
                // If feature is enabled, do nothing - user must click toggle to disable (with friction)
            } else {
                // For utility features: maintain original toggle behavior
                toggleElement.checked = !toggleElement.checked;

                // Trigger the change event to maintain existing functionality
                const changeEvent = new Event("change", { bubbles: true });
                toggleElement.dispatchEvent(changeEvent);
            }
        });
    }

    // Add event listeners
    $posts.addEventListener("change", save);
    $notifs.addEventListener("change", save);
    $homeRedirect.addEventListener("change", handleHomeRedirectToggle);

    document.addEventListener("DOMContentLoaded", () => {
        load();
        startSnoozeIndicatorUpdates();

        // Make entire option elements clickable
        const optionElements = document.querySelectorAll(".option");
        optionElements.forEach((optionElement) => {
            // Find the checkbox within this option
            const checkbox = optionElement.querySelector('input[type="checkbox"]');
            if (checkbox) {
                makeOptionClickable(optionElement, checkbox);
            }
        });
    });
})();
