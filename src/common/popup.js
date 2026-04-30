(function () {
    const q = (sel) => document.querySelector(sel);
    const $posts = q("#posts");
    const $notifs = q("#notifications");
    const $homeRedirect = q("#homeRedirect");
    const $exploreRedirect = q("#exploreRedirect");
    const BREAK_HISTORY_KEY = "focusBreakHistory";
    const ACTIVE_BREAKS_KEY = "activeFocusBreaks";
    const FIVE_YEARS_MS = 5 * 365 * 24 * 60 * 60 * 1000;
    const MAX_BREAK_HISTORY_EVENTS = 5000;
    const SNOOZE_DURATIONS = {
        5: { minutes: 5, label: "5 minutes", baseWaitSeconds: 10 },
        15: { minutes: 15, label: "15 minutes", baseWaitSeconds: 30 },
        30: { minutes: 30, label: "30 minutes", baseWaitSeconds: 60 },
        60: { minutes: 60, label: "1 hour", baseWaitSeconds: 180 },
    };
    const FRICTION_TIERS = [
        {
            minMinutes: 60,
            multiplier: 3,
            label: "High friction active",
            message:
                "You have used a lot of break time recently. This pause is here to help you choose intentionally.",
        },
        {
            minMinutes: 30,
            multiplier: 2,
            label: "Extra friction active",
            message: "This may be turning into a loop. Consider closing X after this.",
        },
        {
            minMinutes: 15,
            multiplier: 1.5,
            label: "Gentle friction active",
            message: "You have already taken a short break recently.",
        },
        {
            minMinutes: 0,
            multiplier: 1,
            label: "",
            message: "Pausing focus redirect...",
        },
    ];
    const defaults = {
        posts: true,
        notifications: true,
        homeRedirect: false,
        exploreRedirect: false,
        snoozeEndTime: null,
        exploreSnoozeEndTime: null,
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

    function safeLocalGet(keys, callback) {
        try {
            if (!chrome.storage.local) {
                callback({});
                return;
            }
            chrome.storage.local.get(keys, (items) => {
                callback(items || {});
            });
        } catch (e) {
            console.warn("Local storage get failed:", e);
            callback({});
        }
    }

    function safeLocalSet(items, callback) {
        try {
            if (!chrome.storage.local) {
                if (callback) callback();
                return;
            }
            chrome.storage.local.set(items, () => {
                if (callback) callback();
            });
        } catch (e) {
            console.warn("Local storage set failed:", e);
            if (callback) callback();
        }
    }

    function pruneBreakHistory(history, now = Date.now()) {
        const cutoff = now - FIVE_YEARS_MS;
        return (Array.isArray(history) ? history : [])
            .filter((event) => event && event.endedAt >= cutoff && event.usedMs > 0)
            .slice(-MAX_BREAK_HISTORY_EVENTS);
    }

    function startBreakSession(featureType, session, callback) {
        safeLocalGet({ [ACTIVE_BREAKS_KEY]: {} }, (items) => {
            const activeBreaks = items[ACTIVE_BREAKS_KEY] || {};
            activeBreaks[featureType] = session;
            safeLocalSet({ [ACTIVE_BREAKS_KEY]: activeBreaks }, callback);
        });
    }

    function finalizeBreakSession(featureType, endedAt, callback) {
        safeLocalGet({ [ACTIVE_BREAKS_KEY]: {}, [BREAK_HISTORY_KEY]: [] }, (items) => {
            const activeBreaks = items[ACTIVE_BREAKS_KEY] || {};
            const session = activeBreaks[featureType];
            if (!session) {
                if (callback) callback(false);
                return;
            }

            const safeEndedAt = Math.min(endedAt || Date.now(), session.scheduledEndAt);
            const usedMs = Math.max(0, safeEndedAt - session.startedAt);
            delete activeBreaks[featureType];

            const history = pruneBreakHistory(items[BREAK_HISTORY_KEY]);
            if (usedMs > 0) {
                history.push({
                    featureType,
                    startedAt: session.startedAt,
                    scheduledEndAt: session.scheduledEndAt,
                    endedAt: safeEndedAt,
                    requestedMinutes: session.requestedMinutes,
                    appliedWaitSeconds: session.appliedWaitSeconds,
                    frictionTier: session.frictionTier,
                    usedMs,
                });
            }

            safeLocalSet(
                {
                    [ACTIVE_BREAKS_KEY]: activeBreaks,
                    [BREAK_HISTORY_KEY]: pruneBreakHistory(history),
                },
                () => {
                    updateBreakReport();
                    if (callback) callback(true);
                }
            );
        });
    }

    function getBreakStats(callback) {
        safeLocalGet({ [BREAK_HISTORY_KEY]: [] }, (items) => {
            const now = Date.now();
            const history = pruneBreakHistory(items[BREAK_HISTORY_KEY], now);
            const last24h = now - 24 * 60 * 60 * 1000;
            const last7d = now - 7 * 24 * 60 * 60 * 1000;
            const totalMsSince = (cutoff) =>
                history.reduce((total, event) => {
                    if (event.endedAt < cutoff) return total;
                    return total + Math.max(0, event.usedMs || 0);
                }, 0);

            callback({
                last24hMs: totalMsSince(last24h),
                last7dMs: totalMsSince(last7d),
            });
        });
    }

    function getFrictionTier(totalMs) {
        const minutes = totalMs / (60 * 1000);
        return FRICTION_TIERS.find((tier) => minutes >= tier.minMinutes) || FRICTION_TIERS[3];
    }

    // Helper function to get friction-specific data for a feature type
    function getFrictionData(featureType, callback) {
        const key = featureType === "home" ? "snoozeEndTime" : "exploreSnoozeEndTime";
        safeStorageGet([key], (items) => {
            callback({ snoozeEndTime: items[key] });
        });
    }

    // Helper function to update friction data for a feature type
    function updateFrictionData(featureType, frictionData, callback) {
        const updateData = {};
        if (frictionData.snoozeEndTime !== undefined) {
            const key = featureType === "home" ? "snoozeEndTime" : "exploreSnoozeEndTime";
            updateData[key] = frictionData.snoozeEndTime;
        }
        safeStorageSet(updateData, callback);
    }

    // Confirmation dialog functions
    function showConfirmDialog(featureType, message, onConfirm, onCancel) {
        const dialog = q("#confirmDialog");
        const titleEl = q("#dialogTitle");
        const messageEl = q(".dialog-message");
        const confirmBtn = q("#confirmProceed");
        const cancelBtn = q("#confirmCancel");

        // Set feature-specific title
        if (featureType === "home") {
            titleEl.textContent = "Disable Home Redirect?";
        } else if (featureType === "explore") {
            titleEl.textContent = "Disable Explore Redirect?";
        }

        // Set feature-specific message if not provided
        if (!message) {
            if (featureType === "home") {
                message =
                    "This keeps you focused by redirecting your feed to bookmarks. Are you sure you want to disable it?";
            } else if (featureType === "explore") {
                message =
                    "This keeps you focused by redirecting away from trending content. Are you sure you want to disable it?";
            }
        }

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
    function showSnoozeOptions(featureType, onSnoozeSelect, onPermanentDisable, onCancel) {
        const dialog = q("#snoozeDialog");
        const snoozeOptions = dialog.querySelectorAll(".snooze-option");
        const advancedToggle = q("#advancedToggle");
        const advancedOptions = q("#advancedOptions");
        const permanentBtn = q("#permanentDisable");
        const cancelBtn = q("#snoozeCancel");

        function collapseAdvancedOptions() {
            if (!advancedToggle || !advancedOptions) return;
            advancedToggle.setAttribute("aria-expanded", "false");
            advancedOptions.hidden = true;
        }

        function toggleAdvancedOptions() {
            if (!advancedToggle || !advancedOptions) return;
            const isExpanded = advancedToggle.getAttribute("aria-expanded") === "true";
            advancedToggle.setAttribute("aria-expanded", String(!isExpanded));
            advancedOptions.hidden = isExpanded;
        }

        // Handle snooze option selection
        const handleSnoozeSelect = (e) => {
            const duration = e.currentTarget.getAttribute("data-duration");
            dialog.style.display = "none";
            removeEventListeners();
            collapseAdvancedOptions();
            if (onSnoozeSelect) onSnoozeSelect(duration);
        };

        // Handle permanent disable
        const handlePermanentDisable = () => {
            dialog.style.display = "none";
            removeEventListeners();
            collapseAdvancedOptions();
            if (onPermanentDisable) onPermanentDisable();
        };

        // Handle cancel
        const handleCancel = () => {
            dialog.style.display = "none";
            removeEventListeners();
            collapseAdvancedOptions();
            if (onCancel) onCancel();
        };

        // Remove all event listeners
        function removeEventListeners() {
            snoozeOptions.forEach((option) => {
                option.removeEventListener("click", handleSnoozeSelect);
            });
            advancedToggle?.removeEventListener("click", toggleAdvancedOptions);
            permanentBtn.removeEventListener("click", handlePermanentDisable);
            cancelBtn.removeEventListener("click", handleCancel);
        }

        // Show the dialog
        collapseAdvancedOptions();
        dialog.style.display = "flex";

        // Add event listeners
        snoozeOptions.forEach((option) => {
            option.addEventListener("click", handleSnoozeSelect);
        });
        advancedToggle?.addEventListener("click", toggleAdvancedOptions);
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
        const countdownLabel = q(".countdown-label");
        const cancelBtn = q("#countdownCancel");

        let currentSeconds = seconds;
        let countdownInterval;

        // Format the countdown display (mm:ss for 60+, raw number for <60)
        function formatCountdown(secs) {
            if (secs >= 60) {
                const mins = Math.floor(secs / 60);
                const s = secs % 60;
                countdownNumber.textContent = `${mins}:${s.toString().padStart(2, "0")}`;
                countdownLabel.textContent = "remaining";
            } else {
                countdownNumber.textContent = secs;
                countdownLabel.textContent = "seconds";
            }
        }

        // Cleanup all listeners and intervals
        function cleanup() {
            clearInterval(countdownInterval);
            dialog.style.display = "none";
            cancelBtn.removeEventListener("click", handleCancel);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        }

        // Update countdown display
        function updateCountdown() {
            formatCountdown(currentSeconds);

            if (currentSeconds <= 0) {
                cleanup();
                if (onComplete) onComplete();
                return;
            }

            currentSeconds--;
        }

        // Handle cancel button
        const handleCancel = () => {
            cleanup();
            if (onCancel) onCancel();
        };

        // Reset countdown if user switches away from the popup
        const handleVisibilityChange = () => {
            if (document.hidden) {
                cleanup();
                if (onCancel) onCancel();
            }
        };

        // Show the dialog
        dialog.style.display = "flex";

        // Set initial countdown display
        formatCountdown(currentSeconds);

        // Start countdown
        countdownInterval = setInterval(updateCountdown, 1000);

        // Add cancel button listener
        cancelBtn.addEventListener("click", handleCancel);

        // Reset countdown when user leaves the popup
        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Close dialog when clicking outside (cancel countdown)
        dialog.addEventListener("click", (e) => {
            if (e.target === dialog) {
                handleCancel();
            }
        });
    }

    // Helper function to calculate snooze end time
    function calculateSnoozeEndTime(duration) {
        const minutes = parseInt(duration, 10);
        return Date.now() + minutes * 60 * 1000;
    }

    // Helper function to calculate countdown duration based on snooze time
    function getCountdownDuration(snoozeDuration, frictionTier) {
        const duration = SNOOZE_DURATIONS[snoozeDuration];
        const baseWaitSeconds = duration ? duration.baseWaitSeconds : 10;
        const multiplier = frictionTier ? frictionTier.multiplier : 1;
        return Math.min(Math.ceil(baseWaitSeconds * multiplier), 600);
    }

    // Helper function to get snooze duration display text
    function getSnoozeDurationText(duration) {
        if (SNOOZE_DURATIONS[duration]) return SNOOZE_DURATIONS[duration].label;
        return duration;
    }

    // Helper function to handle snooze selection with countdown
    function handleSnoozeSelection(featureType, duration) {
        const durationConfig = SNOOZE_DURATIONS[duration];
        if (!durationConfig) return;

        getBreakStats((stats) => {
            const frictionTier = getFrictionTier(stats.last24hMs);
            const countdownSeconds = getCountdownDuration(duration, frictionTier);
            const durationText = getSnoozeDurationText(duration);

            // Update countdown dialog title and message for snooze
            const countdownDialog = q("#countdownDialog");
            const dialogTitle = countdownDialog.querySelector(".dialog-title");
            const countdownMessage = countdownDialog.querySelector(".countdown-message");

            dialogTitle.textContent = `Snoozing for ${durationText}...`;
            countdownMessage.textContent =
                frictionTier.multiplier > 1
                    ? frictionTier.message
                    : `Pausing focus redirect for ${durationText}.`;

            // Show countdown before applying snooze
            showCountdownDialog(
                countdownSeconds,
                () => {
                    // Countdown completed - apply the snooze
                    const startedAt = Date.now();
                    const snoozeEndTime = calculateSnoozeEndTime(duration);

                    startBreakSession(
                        featureType,
                        {
                            featureType,
                            startedAt,
                            scheduledEndAt: snoozeEndTime,
                            requestedMinutes: durationConfig.minutes,
                            appliedWaitSeconds: countdownSeconds,
                            frictionTier: frictionTier.label || "baseline",
                        },
                        () => {
                            // Store snooze data and disable the feature
                            updateFrictionData(featureType, { snoozeEndTime }, () => {
                                // Disable the appropriate feature
                                if (featureType === "home") {
                                    $homeRedirect.checked = false;
                                    updateSnoozeStatusIndicator();

                                    // Set up alarm for home snooze expiration
                                    if (chrome.alarms) {
                                        chrome.alarms.clear("homeSnoozeExpired", () => {
                                            chrome.alarms.create("homeSnoozeExpired", {
                                                when: snoozeEndTime,
                                            });
                                        });
                                    }
                                } else if (featureType === "explore") {
                                    if ($exploreRedirect) {
                                        $exploreRedirect.checked = false;
                                    }
                                    updateExploreSnoozeStatusIndicator();

                                    // Set up alarm for explore snooze expiration
                                    if (chrome.alarms) {
                                        chrome.alarms.clear("exploreSnoozeExpired", () => {
                                            chrome.alarms.create("exploreSnoozeExpired", {
                                                when: snoozeEndTime,
                                            });
                                        });
                                    }
                                }

                                save();
                            });
                        }
                    );

                    // Reset dialog title and message for future permanent disable use
                    dialogTitle.textContent = "Disabling in...";
                    countdownMessage.textContent = "This will disable your focus redirect.";
                },
                () => {
                    // User cancelled countdown - keep it enabled
                    if (featureType === "home") {
                        $homeRedirect.checked = true;
                    } else if (featureType === "explore") {
                        if ($exploreRedirect) {
                            $exploreRedirect.checked = true;
                        }
                    }

                    // Reset dialog title and message
                    dialogTitle.textContent = "Disabling in...";
                    countdownMessage.textContent = "This will disable your focus redirect.";
                }
            );
        });
    }

    function load() {
        safeStorageGet(null, (items) => {
            $posts.checked = !!items.posts;
            $notifs.checked = !!items.notifications;
            $homeRedirect.checked = !!items.homeRedirect;

            // Handle exploreRedirect if element exists
            if ($exploreRedirect) {
                $exploreRedirect.checked = !!items.exploreRedirect;
            }

            // Check if there's an active home snooze that has expired
            if (items.snoozeEndTime && items.snoozeEndTime <= Date.now()) {
                // Home snooze has expired, clear it and re-enable the feature
                finalizeBreakSession("home", items.snoozeEndTime, () => {
                    updateFrictionData("home", { snoozeEndTime: null }, () => {
                        if (!items.homeRedirect) {
                            // Re-enable the feature if it was disabled due to snooze
                            $homeRedirect.checked = true;
                            save();
                        }
                        // Update the snooze indicator after clearing expired snooze
                        updateSnoozeStatusIndicator();
                    });
                });
            } else {
                // Update the snooze indicator on load
                updateSnoozeStatusIndicator();
            }

            // Check if there's an active explore snooze that has expired
            if (items.exploreSnoozeEndTime && items.exploreSnoozeEndTime <= Date.now()) {
                // Explore snooze has expired, clear it and re-enable the feature
                finalizeBreakSession("explore", items.exploreSnoozeEndTime, () => {
                    updateFrictionData("explore", { snoozeEndTime: null }, () => {
                        if (!items.exploreRedirect && $exploreRedirect) {
                            // Re-enable the feature if it was disabled due to snooze
                            $exploreRedirect.checked = true;
                            save();
                        }
                        // Update the explore snooze indicator after clearing expired snooze
                        updateExploreSnoozeStatusIndicator();
                    });
                });
            } else {
                // Update the explore snooze indicator on load
                updateExploreSnoozeStatusIndicator();
            }

            updateBreakReport();
        });
    }

    function save() {
        const saveData = {
            posts: $posts.checked,
            notifications: $notifs.checked,
            homeRedirect: $homeRedirect.checked,
        };

        // Add exploreRedirect if element exists
        if ($exploreRedirect) {
            saveData.exploreRedirect = $exploreRedirect.checked;
        }

        safeStorageSet(saveData, () => {
            // Update DNR rules when redirect settings change
            if (chrome.declarativeNetRequest) {
                const enableRulesets = [];
                const disableRulesets = [];

                // Handle home redirect rules
                if ($homeRedirect.checked) {
                    enableRulesets.push("ruleset_home_redirect");
                } else {
                    disableRulesets.push("ruleset_home_redirect");
                }

                // Handle explore redirect rules if element exists
                if ($exploreRedirect) {
                    if ($exploreRedirect.checked) {
                        enableRulesets.push("ruleset_explore_redirect");
                    } else {
                        disableRulesets.push("ruleset_explore_redirect");
                    }
                }

                // Apply rule changes in a single call for better performance
                const updateOptions = {};
                if (enableRulesets.length > 0) {
                    updateOptions.enableRulesetIds = enableRulesets;
                }
                if (disableRulesets.length > 0) {
                    updateOptions.disableRulesetIds = disableRulesets;
                }

                if (Object.keys(updateOptions).length > 0) {
                    chrome.declarativeNetRequest.updateEnabledRulesets(updateOptions);
                }
            }
        });
    }

    // Unified function to handle redirect toggle with friction for both home and explore
    function handleRedirectToggle(featureType, toggleElement, e) {
        // If user is enabling the feature, clear any active snooze
        if (e.target.checked) {
            getFrictionData(featureType, (frictionData) => {
                if (frictionData.snoozeEndTime) {
                    // Clear the snooze timer and alarm
                    finalizeBreakSession(featureType, Date.now(), () => {
                        updateFrictionData(featureType, { snoozeEndTime: null }, () => {
                            if (chrome.alarms) {
                                const alarmName =
                                    featureType === "home"
                                        ? "homeSnoozeExpired"
                                        : "exploreSnoozeExpired";
                                chrome.alarms.clear(alarmName);
                            }
                            // Update the appropriate snooze indicator after clearing snooze
                            if (featureType === "home") {
                                updateSnoozeStatusIndicator();
                            } else if (featureType === "explore") {
                                updateExploreSnoozeStatusIndicator();
                            }
                            // Save after snooze is fully cleared
                            save();
                        });
                    });
                } else {
                    // No snooze to clear, just update indicator and save
                    if (featureType === "home") {
                        updateSnoozeStatusIndicator();
                    } else if (featureType === "explore") {
                        updateExploreSnoozeStatusIndicator();
                    }
                    updateBreakReport();
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
                featureType,
                null, // Use default message for the feature type
                () => {
                    // User confirmed - show snooze options
                    showSnoozeOptions(
                        featureType,
                        (duration) => {
                            // User selected snooze option
                            handleSnoozeSelection(featureType, duration);
                        },
                        () => {
                            // User selected permanent disable - show countdown
                            const countdownDialog = q("#countdownDialog");
                            const dialogTitle = countdownDialog.querySelector(".dialog-title");
                            const countdownMessage =
                                countdownDialog.querySelector(".countdown-message");

                            // Ensure dialog has correct text for permanent disable
                            dialogTitle.textContent = "Permanently disabling in...";
                            countdownMessage.textContent =
                                "You're about to remove your focus protection entirely.";

                            showCountdownDialog(
                                600, // 10 minute countdown for permanent disable
                                () => {
                                    // Countdown completed - proceed with permanent disable
                                    toggleElement.checked = false;
                                    save();
                                },
                                () => {
                                    // User cancelled countdown - keep it enabled
                                    toggleElement.checked = true;
                                }
                            );
                        },
                        () => {
                            // User cancelled snooze dialog - keep it enabled
                            toggleElement.checked = true;
                        }
                    );
                },
                () => {
                    // User cancelled confirmation - keep it enabled
                    toggleElement.checked = true;
                }
            );
        }
    }

    // Handle home redirect toggle with friction
    function handleHomeRedirectToggle(e) {
        handleRedirectToggle("home", $homeRedirect, e);
    }

    // Handle explore redirect toggle with friction
    function handleExploreRedirectToggle(e) {
        if ($exploreRedirect) {
            handleRedirectToggle("explore", $exploreRedirect, e);
        }
    }

    // Snooze status indicator functions
    function updateSnoozeStatusIndicator() {
        const snoozeStatus = q("#snoozeStatus");
        const snoozeTimeEl = q("#snoozeTime");

        getFrictionData("home", (frictionData) => {
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
                    finalizeBreakSession("home", frictionData.snoozeEndTime, () => {
                        updateFrictionData("home", { snoozeEndTime: null }, () => {
                            $homeRedirect.checked = true;
                            save();
                        });
                    });
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

    function formatBreakTotal(milliseconds) {
        const totalMinutes = Math.floor(milliseconds / (60 * 1000));
        if (totalMinutes < 60) return `${totalMinutes}m`;

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (minutes === 0) return `${hours}h`;
        return `${hours}h ${minutes}m`;
    }

    function updateBreakReport() {
        const breakTime24h = q("#breakTime24h");
        const breakTime7d = q("#breakTime7d");
        const breakFrictionTier = q("#breakFrictionTier");
        if (!breakTime24h || !breakTime7d || !breakFrictionTier) return;

        getBreakStats((stats) => {
            const tier = getFrictionTier(stats.last24hMs);
            breakTime24h.textContent = formatBreakTotal(stats.last24hMs);
            breakTime7d.textContent = formatBreakTotal(stats.last7dMs);

            if (tier.multiplier > 1) {
                breakFrictionTier.textContent = tier.label;
                breakFrictionTier.style.display = "block";
            } else {
                breakFrictionTier.style.display = "none";
            }
        });
    }

    // Explore snooze status indicator
    function updateExploreSnoozeStatusIndicator() {
        const exploreSnoozeStatus = q("#exploreSnoozeStatus");
        if (!exploreSnoozeStatus) return; // Element doesn't exist yet

        getFrictionData("explore", (frictionData) => {
            if (frictionData.snoozeEndTime && frictionData.snoozeEndTime > Date.now()) {
                // Snooze is active - show the indicator
                const remainingTime = frictionData.snoozeEndTime - Date.now();
                const timeText = formatRemainingTime(remainingTime);

                const exploreSnoozeTimeEl = q("#exploreSnoozeTime");
                if (exploreSnoozeTimeEl) {
                    exploreSnoozeTimeEl.textContent = timeText;
                    exploreSnoozeStatus.style.display = "block";
                }
            } else {
                // No active snooze - hide the indicator
                exploreSnoozeStatus.style.display = "none";

                // If there was a snooze time but it's expired, clear it
                if (frictionData.snoozeEndTime && frictionData.snoozeEndTime <= Date.now()) {
                    finalizeBreakSession("explore", frictionData.snoozeEndTime, () => {
                        updateFrictionData("explore", { snoozeEndTime: null }, () => {
                            if ($exploreRedirect) {
                                $exploreRedirect.checked = true;
                                save();
                            }
                        });
                    });
                }
            }
        });
    }

    // Set up periodic updates for the snooze indicator
    function startSnoozeIndicatorUpdates() {
        // Update immediately
        updateSnoozeStatusIndicator();
        updateExploreSnoozeStatusIndicator();

        // Update every 30 seconds to keep the time current
        setInterval(() => {
            updateSnoozeStatusIndicator();
            updateExploreSnoozeStatusIndicator();
            updateBreakReport();
        }, 30000);
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
            const isFocusFeature =
                toggleElement.id === "homeRedirect" || toggleElement.id === "exploreRedirect";

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

    // Add explore redirect event listener if element exists
    if ($exploreRedirect) {
        $exploreRedirect.addEventListener("change", handleExploreRedirectToggle);
    }

    // Listen for storage changes from the background script (e.g., snooze expiration)
    // Without this, the popup shows stale state when the background re-enables a feature
    try {
        chrome.storage.onChanged?.addListener((changes, area) => {
            if (area === "sync") {
                if (changes.homeRedirect) {
                    $homeRedirect.checked = !!changes.homeRedirect.newValue;
                }
                if (changes.exploreRedirect && $exploreRedirect) {
                    $exploreRedirect.checked = !!changes.exploreRedirect.newValue;
                }
                if (changes.snoozeEndTime) {
                    updateSnoozeStatusIndicator();
                }
                if (changes.exploreSnoozeEndTime) {
                    updateExploreSnoozeStatusIndicator();
                }
            } else if (area === "local") {
                if (changes[BREAK_HISTORY_KEY] || changes[ACTIVE_BREAKS_KEY]) {
                    updateBreakReport();
                }
            }
        });
    } catch (e) {
        // Ignore storage listener errors
    }

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
