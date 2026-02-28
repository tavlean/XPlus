(function () {
    const DEFAULTS = {
        posts: true,
        notifications: true,
        notificationFilters: {
            mentions: true,
            replies: true,
            likes: true,
            retweets: true,
        },
        homeRedirect: false,
        exploreRedirect: false,
        messagesRedirect: false,
        autoFollowingTab: false,
        hideForYouTab: false,
        hideTrendingSidebar: false,
        hideSuggestions: false,
        threadReader: true,
        quickBookmark: false,
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
        mutedWords: [],
        dailyLimitMinutes: 0,
        snoozeEndTime: null,
        disableAttempts: 0,
        exploreSnoozeEndTime: null,
        exploreDisableAttempts: 0,
        messagesSnoozeEndTime: null,
        messagesDisableAttempts: 0,
        lastAttemptDate: null,
        scheduleEnabled: false,
        schedulePaused: false,
        scheduleStart: "09:00",
        scheduleEnd: "17:00",
        scheduleDays: [1, 2, 3, 4, 5],
        scheduleFeatures: {
            homeRedirect: true,
            exploreRedirect: true,
            messagesRedirect: true,
            hideTrendingSidebar: true,
            hideSuggestions: true,
            hideForYouTab: true,
            autoFollowingTab: false,
        },
        scheduleApplied: false,
        scheduleLastManualState: {},
        scheduleActiveUntil: null,
    };

    const REDIRECT_FEATURE_CONFIG = {
        home: {
            toggleKey: "homeRedirect",
            snoozeKey: "snoozeEndTime",
            title: "Home Redirect",
            noun: "home redirect",
            snoozeStatusEl: "snoozeStatus",
            snoozeTimeEl: "snoozeTime",
        },
        explore: {
            toggleKey: "exploreRedirect",
            snoozeKey: "exploreSnoozeEndTime",
            title: "Explore Redirect",
            noun: "explore redirect",
            snoozeStatusEl: "exploreSnoozeStatus",
            snoozeTimeEl: "exploreSnoozeTime",
        },
        messages: {
            toggleKey: "messagesRedirect",
            snoozeKey: "messagesSnoozeEndTime",
            title: "DM Redirect",
            noun: "dm redirect",
            snoozeStatusEl: "messagesSnoozeStatus",
            snoozeTimeEl: "messagesSnoozeTime",
        },
    };

    const state = {
        settings: cloneDefaults(),
        suppressEvents: false,
        saveDebounceId: null,
        usageTimerId: null,
        snoozeTimerId: null,
        toastTimerId: null,
        refs: null,
        dialogRefs: null,
    };

    function cloneDefaults() {
        return {
            ...DEFAULTS,
            notificationFilters: { ...DEFAULTS.notificationFilters },
            redirectTargets: { ...DEFAULTS.redirectTargets },
            customRedirectTargets: { ...DEFAULTS.customRedirectTargets },
            mutedWords: [...DEFAULTS.mutedWords],
            scheduleDays: [...DEFAULTS.scheduleDays],
            scheduleFeatures: { ...DEFAULTS.scheduleFeatures },
            scheduleLastManualState: { ...DEFAULTS.scheduleLastManualState },
        };
    }

    function mergeSettings(items) {
        const merged = cloneDefaults();
        const source = items || {};

        Object.keys(merged).forEach((key) => {
            if (
                key !== "notificationFilters" &&
                key !== "redirectTargets" &&
                key !== "customRedirectTargets" &&
                key !== "scheduleDays" &&
                key !== "scheduleFeatures" &&
                key !== "mutedWords" &&
                key !== "scheduleLastManualState"
            ) {
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    merged[key] = source[key];
                }
            }
        });

        merged.notificationFilters = {
            ...DEFAULTS.notificationFilters,
            ...(source.notificationFilters || {}),
        };

        merged.redirectTargets = {
            ...DEFAULTS.redirectTargets,
            ...(source.redirectTargets || {}),
        };

        merged.customRedirectTargets = {
            ...DEFAULTS.customRedirectTargets,
            ...(source.customRedirectTargets || {}),
        };

        merged.scheduleFeatures = {
            ...DEFAULTS.scheduleFeatures,
            ...(source.scheduleFeatures || {}),
        };

        merged.scheduleDays = Array.isArray(source.scheduleDays)
            ? source.scheduleDays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
            : [...DEFAULTS.scheduleDays];

        merged.mutedWords = normalizeMutedWords(source.mutedWords || DEFAULTS.mutedWords);

        merged.scheduleLastManualState =
            source.scheduleLastManualState && typeof source.scheduleLastManualState === "object"
                ? source.scheduleLastManualState
                : {};

        return merged;
    }

    function normalizeMutedWords(words) {
        if (Array.isArray(words)) {
            return words
                .map((item) => String(item || "").trim())
                .filter(Boolean)
                .slice(0, 150);
        }

        if (typeof words === "string") {
            return words
                .split(/[\n,]/)
                .map((item) => item.trim())
                .filter(Boolean)
                .slice(0, 150);
        }

        return [];
    }

    function parseMutedWordsInput(rawValue) {
        return normalizeMutedWords(rawValue || "");
    }

    function syncGet(query) {
        return new Promise((resolve) => {
            try {
                chrome.storage.sync.get(query, (result) => {
                    resolve(result || {});
                });
            } catch (error) {
                resolve({});
            }
        });
    }

    function syncSet(items) {
        return new Promise((resolve) => {
            try {
                chrome.storage.sync.set(items, () => {
                    resolve();
                });
            } catch (error) {
                resolve();
            }
        });
    }

    function localGet(query) {
        return new Promise((resolve) => {
            try {
                chrome.storage.local.get(query, (result) => {
                    resolve(result || {});
                });
            } catch (error) {
                resolve({});
            }
        });
    }

    function sendRuntimeMessage(message) {
        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage(message, (response) => {
                    if (chrome.runtime.lastError) {
                        resolve(null);
                        return;
                    }
                    resolve(response || null);
                });
            } catch (error) {
                resolve(null);
            }
        });
    }

    function q(selector) {
        return document.querySelector(selector);
    }

    function getRefs() {
        return {
            posts: q("#posts"),
            notifications: q("#notifications"),
            homeRedirect: q("#homeRedirect"),
            exploreRedirect: q("#exploreRedirect"),
            messagesRedirect: q("#messagesRedirect"),
            autoFollowingTab: q("#autoFollowingTab"),
            hideForYouTab: q("#hideForYouTab"),
            hideTrendingSidebar: q("#hideTrendingSidebar"),
            hideSuggestions: q("#hideSuggestions"),
            threadReader: q("#threadReader"),
            quickBookmark: q("#quickBookmark"),
            exploreRedirectAllowSearch: q("#exploreRedirectAllowSearch"),
            notificationMentions: q("#notificationMentions"),
            notificationReplies: q("#notificationReplies"),
            notificationLikes: q("#notificationLikes"),
            notificationRetweets: q("#notificationRetweets"),
            homeRedirectTarget: q("#homeRedirectTarget"),
            exploreRedirectTarget: q("#exploreRedirectTarget"),
            messagesRedirectTarget: q("#messagesRedirectTarget"),
            homeRedirectCustom: q("#homeRedirectCustom"),
            exploreRedirectCustom: q("#exploreRedirectCustom"),
            messagesRedirectCustom: q("#messagesRedirectCustom"),
            mutedWords: q("#mutedWords"),
            dailyLimitMinutes: q("#dailyLimitMinutes"),
            notificationFilters: q("#notificationFilters"),
            todayUsage: q("#todayUsage"),
            weeklyChart: q("#weeklyChart"),
            usageFootnote: q("#usageFootnote"),
            schedulePill: q("#schedulePill"),
            scheduleEnabled: q("#scheduleEnabled"),
            schedulePauseToggle: q("#schedulePauseToggle"),
            scheduleStatusText: q("#scheduleStatusText"),
            scheduleControls: q("#scheduleControls"),
            scheduleStart: q("#scheduleStart"),
            scheduleEnd: q("#scheduleEnd"),
            scheduleDay0: q("#scheduleDay0"),
            scheduleDay1: q("#scheduleDay1"),
            scheduleDay2: q("#scheduleDay2"),
            scheduleDay3: q("#scheduleDay3"),
            scheduleDay4: q("#scheduleDay4"),
            scheduleDay5: q("#scheduleDay5"),
            scheduleDay6: q("#scheduleDay6"),
            scheduleFeatureHomeRedirect: q("#scheduleFeatureHomeRedirect"),
            scheduleFeatureExploreRedirect: q("#scheduleFeatureExploreRedirect"),
            scheduleFeatureMessagesRedirect: q("#scheduleFeatureMessagesRedirect"),
            scheduleFeatureHideTrendingSidebar: q("#scheduleFeatureHideTrendingSidebar"),
            scheduleFeatureHideSuggestions: q("#scheduleFeatureHideSuggestions"),
            scheduleFeatureHideForYouTab: q("#scheduleFeatureHideForYouTab"),
            scheduleFeatureAutoFollowingTab: q("#scheduleFeatureAutoFollowingTab"),
            toast: q("#toast"),
        };
    }

    function getDialogRefs() {
        if (!state.dialogRefs) {
            state.dialogRefs = {
                confirmDialog: q("#confirmDialog"),
                dialogTitle: q("#dialogTitle"),
                dialogMessage: q("#dialogMessage"),
                confirmProceed: q("#confirmProceed"),
                confirmCancel: q("#confirmCancel"),
                snoozeDialog: q("#snoozeDialog"),
                snoozeTitle: q("#snoozeTitle"),
                snoozeCancel: q("#snoozeCancel"),
                permanentDisable: q("#permanentDisable"),
                snoozeOptions: Array.from(document.querySelectorAll(".snooze-option")),
                countdownDialog: q("#countdownDialog"),
                countdownTitle: q("#countdownTitle"),
                countdownNumber: q("#countdownNumber"),
                countdownMessage: q("#countdownMessage"),
                countdownCancel: q("#countdownCancel"),
            };
        }
        return state.dialogRefs;
    }

    function showToast(message) {
        const { toast } = state.refs;
        if (!toast) return;

        toast.textContent = message;
        toast.style.display = "block";

        if (state.toastTimerId) {
            clearTimeout(state.toastTimerId);
        }

        state.toastTimerId = setTimeout(() => {
            toast.style.display = "none";
        }, 2400);
    }

    function formatDuration(seconds) {
        const clamped = Math.max(0, Math.floor(seconds || 0));
        const hours = Math.floor(clamped / 3600);
        const minutes = Math.floor((clamped % 3600) / 60);

        if (hours > 0 && minutes > 0) {
            return `${hours}h ${minutes}m`;
        }

        if (hours > 0) {
            return `${hours}h`;
        }

        return `${minutes}m`;
    }

    function formatRemainingTime(milliseconds) {
        const totalMinutes = Math.max(0, Math.floor(milliseconds / 60000));
        const days = Math.floor(totalMinutes / (60 * 24));
        const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
        const minutes = totalMinutes % 60;

        if (days > 0) {
            if (hours > 0) {
                return `${days}d ${hours}h`;
            }
            return `${days}d`;
        }

        if (hours > 0) {
            if (minutes > 0) {
                return `${hours}h ${minutes}m`;
            }
            return `${hours}h`;
        }

        return `${Math.max(1, minutes)}m`;
    }

    function getLocalDayKey(dateObj) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function formatClockFromTimestamp(value) {
        if (!value) return "";
        const timestamp = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(timestamp)) return "";
        return new Date(timestamp).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
        });
    }

    function calculateSnoozeEndTime(duration) {
        const now = new Date();

        if (duration === "tomorrow") {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);
            return tomorrow.getTime();
        }

        const minutes = Number.parseInt(duration, 10);
        if (!Number.isFinite(minutes)) {
            return now.getTime() + 15 * 60 * 1000;
        }

        return now.getTime() + minutes * 60 * 1000;
    }

    function getCountdownDuration(duration) {
        const map = {
            "15": 15,
            "60": 20,
            "240": 30,
            tomorrow: 30,
        };
        const value = map[duration] || 15;
        return Math.min(30, Math.max(5, value));
    }

    function getSnoozeDurationText(duration) {
        const labels = {
            "15": "15 minutes",
            "60": "1 hour",
            "240": "4 hours",
            tomorrow: "until tomorrow",
        };
        return labels[duration] || "a short break";
    }

    function isValidHttpUrl(value) {
        if (!value) return true;
        try {
            const parsed = new URL(value);
            return parsed.protocol === "https:" || parsed.protocol === "http:";
        } catch (error) {
            return false;
        }
    }

    function updateCustomInputVisibility() {
        const { homeRedirectTarget, exploreRedirectTarget, messagesRedirectTarget } = state.refs;
        const featureKeys = ["home", "explore", "messages"];
        featureKeys.forEach((feature) => {
            const targetSelect =
                feature === "home"
                    ? homeRedirectTarget
                    : feature === "explore"
                      ? exploreRedirectTarget
                      : messagesRedirectTarget;

            const customInput =
                feature === "home"
                    ? state.refs.homeRedirectCustom
                    : feature === "explore"
                      ? state.refs.exploreRedirectCustom
                      : state.refs.messagesRedirectCustom;

            if (!targetSelect || !customInput) return;
            customInput.style.display = targetSelect.value === "custom" ? "block" : "none";
        });
    }

    function updateCustomInputValidity() {
        [
            state.refs.homeRedirectCustom,
            state.refs.exploreRedirectCustom,
            state.refs.messagesRedirectCustom,
        ].forEach((inputEl) => {
            if (!inputEl) return;
            const isValid = isValidHttpUrl(inputEl.value.trim());
            inputEl.classList.toggle("invalid", !isValid);
        });
    }

    function updateNotificationFilterState() {
        const { notifications, notificationFilters } = state.refs;
        if (!notifications || !notificationFilters) return;

        const enabled = !!notifications.checked;
        notificationFilters.classList.toggle("disabled", !enabled);
    }

    function updateScheduleStateText() {
        const { scheduleStatusText, schedulePauseToggle } = state.refs;
        if (!scheduleStatusText || !schedulePauseToggle) return;

        if (!state.settings.scheduleEnabled) {
            scheduleStatusText.textContent = "Off";
        } else if (state.settings.schedulePaused) {
            scheduleStatusText.textContent = "Paused";
        } else if (state.settings.scheduleActiveUntil) {
            const label = formatClockFromTimestamp(state.settings.scheduleActiveUntil);
            scheduleStatusText.textContent = label ? `Work mode until ${label}` : "Work mode active";
        } else {
            scheduleStatusText.textContent = "Waiting for next block";
        }

        schedulePauseToggle.textContent = state.settings.schedulePaused
            ? "Resume schedule"
            : "Pause schedule";
    }

    function updateScheduleControlsEnabledState() {
        const { scheduleEnabled, scheduleControls } = state.refs;
        if (!scheduleEnabled || !scheduleControls) return;

        const enabled = !!scheduleEnabled.checked;
        const controls = scheduleControls.querySelectorAll("input, button");
        controls.forEach((control) => {
            control.disabled = !enabled;
        });
    }

    function updateSchedulePill() {
        const { schedulePill } = state.refs;
        if (!schedulePill) return;

        if (state.settings.scheduleEnabled && !state.settings.schedulePaused && state.settings.scheduleActiveUntil) {
            const label = formatClockFromTimestamp(state.settings.scheduleActiveUntil);
            schedulePill.textContent = label ? `Work mode (until ${label})` : "Work mode active";
            schedulePill.style.display = "inline-flex";
        } else {
            schedulePill.style.display = "none";
        }
    }

    function getFeatureSnoozeExpiry(featureKey) {
        const config = REDIRECT_FEATURE_CONFIG[featureKey];
        if (!config) return null;
        return state.settings[config.snoozeKey] || null;
    }

    function setFeatureSnoozeExpiry(featureKey, timestamp) {
        const config = REDIRECT_FEATURE_CONFIG[featureKey];
        if (!config) return;
        state.settings[config.snoozeKey] = timestamp;
    }

    function updateSnoozeIndicators() {
        let shouldPersistAfterExpiryCleanup = false;
        const now = Date.now();

        Object.keys(REDIRECT_FEATURE_CONFIG).forEach((featureKey) => {
            const config = REDIRECT_FEATURE_CONFIG[featureKey];
            const statusEl = q(`#${config.snoozeStatusEl}`);
            const timeEl = q(`#${config.snoozeTimeEl}`);
            if (!statusEl || !timeEl) return;

            const expiry = state.settings[config.snoozeKey];
            const active = Number.isFinite(expiry) && expiry > now;

            if (active) {
                statusEl.style.display = "block";
                timeEl.textContent = formatRemainingTime(expiry - now);
            } else {
                statusEl.style.display = "none";
                if (Number.isFinite(expiry) && expiry <= now) {
                    state.settings[config.snoozeKey] = null;
                    if (!state.settings[config.toggleKey]) {
                        state.settings[config.toggleKey] = true;
                        if (state.refs[config.toggleKey]) {
                            state.refs[config.toggleKey].checked = true;
                        }
                    }
                    shouldPersistAfterExpiryCleanup = true;
                }
            }
        });

        if (shouldPersistAfterExpiryCleanup) {
            queueSave({ scheduleEval: false });
        }
    }

    function applySettingsToUi() {
        const refs = state.refs;
        const settings = state.settings;

        refs.posts.checked = !!settings.posts;
        refs.notifications.checked = !!settings.notifications;
        refs.homeRedirect.checked = !!settings.homeRedirect;
        refs.exploreRedirect.checked = !!settings.exploreRedirect;
        refs.messagesRedirect.checked = !!settings.messagesRedirect;
        refs.autoFollowingTab.checked = !!settings.autoFollowingTab;
        refs.hideForYouTab.checked = !!settings.hideForYouTab;
        refs.hideTrendingSidebar.checked = !!settings.hideTrendingSidebar;
        refs.hideSuggestions.checked = !!settings.hideSuggestions;
        refs.threadReader.checked = !!settings.threadReader;
        refs.quickBookmark.checked = !!settings.quickBookmark;
        refs.exploreRedirectAllowSearch.checked = !!settings.exploreRedirectAllowSearch;

        refs.notificationMentions.checked = !!settings.notificationFilters.mentions;
        refs.notificationReplies.checked = !!settings.notificationFilters.replies;
        refs.notificationLikes.checked = !!settings.notificationFilters.likes;
        refs.notificationRetweets.checked = !!settings.notificationFilters.retweets;

        refs.homeRedirectTarget.value = settings.redirectTargets.home;
        refs.exploreRedirectTarget.value = settings.redirectTargets.explore;
        refs.messagesRedirectTarget.value = settings.redirectTargets.messages;

        refs.homeRedirectCustom.value = settings.customRedirectTargets.home || "";
        refs.exploreRedirectCustom.value = settings.customRedirectTargets.explore || "";
        refs.messagesRedirectCustom.value = settings.customRedirectTargets.messages || "";

        refs.mutedWords.value = settings.mutedWords.join(", ");
        refs.dailyLimitMinutes.value = settings.dailyLimitMinutes || 0;

        refs.scheduleEnabled.checked = !!settings.scheduleEnabled;
        refs.scheduleStart.value = settings.scheduleStart || "09:00";
        refs.scheduleEnd.value = settings.scheduleEnd || "17:00";

        for (let day = 0; day <= 6; day += 1) {
            const el = refs[`scheduleDay${day}`];
            if (el) {
                el.checked = settings.scheduleDays.includes(day);
            }
        }

        refs.scheduleFeatureHomeRedirect.checked = !!settings.scheduleFeatures.homeRedirect;
        refs.scheduleFeatureExploreRedirect.checked = !!settings.scheduleFeatures.exploreRedirect;
        refs.scheduleFeatureMessagesRedirect.checked = !!settings.scheduleFeatures.messagesRedirect;
        refs.scheduleFeatureHideTrendingSidebar.checked = !!settings.scheduleFeatures.hideTrendingSidebar;
        refs.scheduleFeatureHideSuggestions.checked = !!settings.scheduleFeatures.hideSuggestions;
        refs.scheduleFeatureHideForYouTab.checked = !!settings.scheduleFeatures.hideForYouTab;
        refs.scheduleFeatureAutoFollowingTab.checked = !!settings.scheduleFeatures.autoFollowingTab;

        updateCustomInputVisibility();
        updateCustomInputValidity();
        updateNotificationFilterState();
        updateScheduleControlsEnabledState();
        updateScheduleStateText();
        updateSchedulePill();
        updateSnoozeIndicators();
    }

    function collectScheduleDaysFromUi() {
        const days = [];
        for (let day = 0; day <= 6; day += 1) {
            const input = state.refs[`scheduleDay${day}`];
            if (input && input.checked) {
                days.push(day);
            }
        }

        if (days.length === 0) {
            return [...DEFAULTS.scheduleDays];
        }

        return days;
    }

    function collectSettingsFromUi() {
        const refs = state.refs;

        return {
            ...state.settings,
            posts: !!refs.posts.checked,
            notifications: !!refs.notifications.checked,
            notificationFilters: {
                mentions: !!refs.notificationMentions.checked,
                replies: !!refs.notificationReplies.checked,
                likes: !!refs.notificationLikes.checked,
                retweets: !!refs.notificationRetweets.checked,
            },
            homeRedirect: !!refs.homeRedirect.checked,
            exploreRedirect: !!refs.exploreRedirect.checked,
            messagesRedirect: !!refs.messagesRedirect.checked,
            autoFollowingTab: !!refs.autoFollowingTab.checked,
            hideForYouTab: !!refs.hideForYouTab.checked,
            hideTrendingSidebar: !!refs.hideTrendingSidebar.checked,
            hideSuggestions: !!refs.hideSuggestions.checked,
            threadReader: !!refs.threadReader.checked,
            quickBookmark: !!refs.quickBookmark.checked,
            exploreRedirectAllowSearch: !!refs.exploreRedirectAllowSearch.checked,
            redirectTargets: {
                home: refs.homeRedirectTarget.value || "bookmarks",
                explore: refs.exploreRedirectTarget.value || "bookmarks",
                messages: refs.messagesRedirectTarget.value || "bookmarks",
            },
            customRedirectTargets: {
                home: refs.homeRedirectCustom.value.trim(),
                explore: refs.exploreRedirectCustom.value.trim(),
                messages: refs.messagesRedirectCustom.value.trim(),
            },
            mutedWords: parseMutedWordsInput(refs.mutedWords.value),
            dailyLimitMinutes: Math.max(0, Number.parseInt(refs.dailyLimitMinutes.value || "0", 10) || 0),
            scheduleEnabled: !!refs.scheduleEnabled.checked,
            scheduleStart: refs.scheduleStart.value || "09:00",
            scheduleEnd: refs.scheduleEnd.value || "17:00",
            scheduleDays: collectScheduleDaysFromUi(),
            scheduleFeatures: {
                homeRedirect: !!refs.scheduleFeatureHomeRedirect.checked,
                exploreRedirect: !!refs.scheduleFeatureExploreRedirect.checked,
                messagesRedirect: !!refs.scheduleFeatureMessagesRedirect.checked,
                hideTrendingSidebar: !!refs.scheduleFeatureHideTrendingSidebar.checked,
                hideSuggestions: !!refs.scheduleFeatureHideSuggestions.checked,
                hideForYouTab: !!refs.scheduleFeatureHideForYouTab.checked,
                autoFollowingTab: !!refs.scheduleFeatureAutoFollowingTab.checked,
            },
        };
    }

    function enforceMutualExclusion(changedKey) {
        const refs = state.refs;
        let changed = false;

        if (changedKey === "homeRedirect" && refs.homeRedirect.checked && refs.autoFollowingTab.checked) {
            refs.autoFollowingTab.checked = false;
            state.settings.autoFollowingTab = false;
            changed = true;
            showToast("Auto-Following disabled because Home Redirect is enabled.");
        }

        if (changedKey === "autoFollowingTab" && refs.autoFollowingTab.checked && refs.homeRedirect.checked) {
            refs.homeRedirect.checked = false;
            state.settings.homeRedirect = false;
            state.settings.snoozeEndTime = null;
            changed = true;
            showToast("Home Redirect disabled because Auto-Following is enabled.");
        }

        return changed;
    }

    async function persistCurrentUi({ scheduleEval = false } = {}) {
        if (state.suppressEvents) return;

        updateCustomInputVisibility();
        updateCustomInputValidity();
        updateNotificationFilterState();

        const nextSettings = collectSettingsFromUi();
        state.settings = mergeSettings(nextSettings);

        await syncSet(state.settings);

        updateScheduleControlsEnabledState();
        updateScheduleStateText();
        updateSchedulePill();
        updateSnoozeIndicators();

        if (scheduleEval) {
            await sendRuntimeMessage({ action: "evaluateSchedule" });
        }
    }

    function queueSave(options = {}) {
        if (state.saveDebounceId) {
            clearTimeout(state.saveDebounceId);
        }
        state.saveDebounceId = setTimeout(() => {
            persistCurrentUi(options);
        }, 120);
    }

    function setupOptionRowClickBehavior() {
        const optionRows = Array.from(document.querySelectorAll(".option[data-clickable='true']"));
        optionRows.forEach((row) => {
            row.addEventListener("click", (event) => {
                if (event.target.closest(".switch, button, input, select, textarea, a, .day-chip")) {
                    return;
                }

                const checkbox = row.querySelector("input[type='checkbox']");
                if (!checkbox) return;

                const isFocusRedirect = !!row.dataset.focusRedirect;
                if (isFocusRedirect && checkbox.checked) {
                    showToast("Click the switch to disable this focus redirect.");
                    return;
                }

                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event("change", { bubbles: true }));
            });
        });
    }

    function waitForDialogAction(overlay, bindings) {
        return new Promise((resolve) => {
            const cleanupFns = [];

            function done(value) {
                overlay.style.display = "none";
                cleanupFns.forEach((fn) => fn());
                resolve(value);
            }

            bindings.forEach((binding) => {
                const { element, eventName, handler } = binding;
                if (!element) return;
                const wrapped = (event) => handler(event, done);
                element.addEventListener(eventName, wrapped);
                cleanupFns.push(() => element.removeEventListener(eventName, wrapped));
            });

            const onOverlayClick = (event) => {
                if (event.target === overlay) {
                    done(null);
                }
            };
            overlay.addEventListener("click", onOverlayClick);
            cleanupFns.push(() => overlay.removeEventListener("click", onOverlayClick));

            overlay.style.display = "flex";
        });
    }

    async function showDisableConfirmDialog(feature) {
        const dialogs = getDialogRefs();
        const config = REDIRECT_FEATURE_CONFIG[feature];
        if (!config) return false;

        dialogs.dialogTitle.textContent = `Disable ${config.title}?`;
        dialogs.dialogMessage.textContent = `${config.title} helps reduce distractions. Disable temporarily (snooze) or keep it on?`;

        const result = await waitForDialogAction(dialogs.confirmDialog, [
            {
                element: dialogs.confirmProceed,
                eventName: "click",
                handler: (_, done) => done(true),
            },
            {
                element: dialogs.confirmCancel,
                eventName: "click",
                handler: (_, done) => done(false),
            },
        ]);

        return !!result;
    }

    async function showSnoozeDialog(feature) {
        const dialogs = getDialogRefs();
        const config = REDIRECT_FEATURE_CONFIG[feature];
        if (!config) return { type: "cancel" };

        dialogs.snoozeTitle.textContent = `Disable ${config.title}`;

        const result = await waitForDialogAction(dialogs.snoozeDialog, [
            ...dialogs.snoozeOptions.map((option) => ({
                element: option,
                eventName: "click",
                handler: (event, done) => {
                    event.preventDefault();
                    done({ type: "snooze", duration: option.getAttribute("data-duration") });
                },
            })),
            {
                element: dialogs.permanentDisable,
                eventName: "click",
                handler: (_, done) => done({ type: "permanent" }),
            },
            {
                element: dialogs.snoozeCancel,
                eventName: "click",
                handler: (_, done) => done({ type: "cancel" }),
            },
        ]);

        return result || { type: "cancel" };
    }

    async function showCountdownDialog(seconds, titleText, messageText) {
        const dialogs = getDialogRefs();
        dialogs.countdownTitle.textContent = titleText;
        dialogs.countdownMessage.textContent = messageText;

        let currentSeconds = Math.max(1, Math.floor(seconds));
        dialogs.countdownNumber.textContent = String(currentSeconds);

        return new Promise((resolve) => {
            let intervalId = null;

            function cleanupAndResolve(value) {
                if (intervalId) {
                    clearInterval(intervalId);
                }
                dialogs.countdownDialog.style.display = "none";
                dialogs.countdownCancel.removeEventListener("click", onCancelClick);
                dialogs.countdownDialog.removeEventListener("click", onOverlayClick);
                resolve(value);
            }

            function onCancelClick() {
                cleanupAndResolve(false);
            }

            function onOverlayClick(event) {
                if (event.target === dialogs.countdownDialog) {
                    cleanupAndResolve(false);
                }
            }

            dialogs.countdownCancel.addEventListener("click", onCancelClick);
            dialogs.countdownDialog.addEventListener("click", onOverlayClick);
            dialogs.countdownDialog.style.display = "flex";

            intervalId = setInterval(() => {
                currentSeconds -= 1;
                dialogs.countdownNumber.textContent = String(Math.max(0, currentSeconds));
                if (currentSeconds <= 0) {
                    cleanupAndResolve(true);
                }
            }, 1000);
        });
    }

    async function handleDisableFlow(feature) {
        const confirmed = await showDisableConfirmDialog(feature);
        if (!confirmed) return { applied: false };

        const choice = await showSnoozeDialog(feature);
        if (!choice || choice.type === "cancel") {
            return { applied: false };
        }

        if (choice.type === "snooze") {
            const durationText = getSnoozeDurationText(choice.duration);
            const countdownOk = await showCountdownDialog(
                getCountdownDuration(choice.duration),
                `Snoozing for ${durationText}...`,
                `This will disable ${REDIRECT_FEATURE_CONFIG[feature].noun} for ${durationText}.`
            );

            if (!countdownOk) {
                return { applied: false };
            }

            return {
                applied: true,
                mode: "snooze",
                snoozeEndTime: calculateSnoozeEndTime(choice.duration),
            };
        }

        const countdownOk = await showCountdownDialog(
            5,
            "Disabling in...",
            `This will disable ${REDIRECT_FEATURE_CONFIG[feature].noun} until you re-enable it.`
        );

        if (!countdownOk) {
            return { applied: false };
        }

        return {
            applied: true,
            mode: "permanent",
            snoozeEndTime: null,
        };
    }

    async function handleRedirectToggleChange(featureKey, event) {
        if (state.suppressEvents) return;

        const config = REDIRECT_FEATURE_CONFIG[featureKey];
        if (!config) return;

        if (event.target.checked) {
            setFeatureSnoozeExpiry(featureKey, null);
            if (featureKey === "home") {
                enforceMutualExclusion("homeRedirect");
            }
            await persistCurrentUi();
            return;
        }

        event.target.checked = true;

        const result = await handleDisableFlow(featureKey);
        if (!result.applied) {
            event.target.checked = true;
            return;
        }

        event.target.checked = false;
        setFeatureSnoozeExpiry(featureKey, result.snoozeEndTime);
        updateSnoozeIndicators();

        await persistCurrentUi({ scheduleEval: false });
    }

    function getWeeklyDays() {
        const days = [];
        for (let offset = 6; offset >= 0; offset -= 1) {
            const dateObj = new Date();
            dateObj.setDate(dateObj.getDate() - offset);
            days.push(dateObj);
        }
        return days;
    }

    async function refreshUsageUi() {
        const refs = state.refs;
        const localState = await localGet({ screenTimeByDay: {} });
        const screenTimeByDay = localState.screenTimeByDay || {};

        const todayKey = getLocalDayKey(new Date());
        const todaySeconds = Number(screenTimeByDay[todayKey] || 0);
        refs.todayUsage.textContent = `Today: ${formatDuration(todaySeconds)}`;

        const weeklyDays = getWeeklyDays();
        const weeklyData = weeklyDays.map((day) => {
            const key = getLocalDayKey(day);
            return {
                label: day.toLocaleDateString([], { weekday: "short" }).slice(0, 2),
                seconds: Number(screenTimeByDay[key] || 0),
            };
        });

        const maxSeconds = Math.max(...weeklyData.map((item) => item.seconds), 60);

        refs.weeklyChart.innerHTML = "";
        weeklyData.forEach((item) => {
            const bar = document.createElement("div");
            bar.className = "usage-bar";

            const fill = document.createElement("div");
            fill.className = "usage-bar-fill";
            fill.style.height = `${Math.max(4, Math.round((item.seconds / maxSeconds) * 42))}px`;
            fill.title = formatDuration(item.seconds);

            const label = document.createElement("div");
            label.className = "usage-bar-label";
            label.textContent = item.label;

            bar.appendChild(fill);
            bar.appendChild(label);
            refs.weeklyChart.appendChild(bar);
        });

        const limit = Number.parseInt(state.settings.dailyLimitMinutes || 0, 10) || 0;
        if (limit > 0) {
            const usedMinutes = Math.floor(todaySeconds / 60);
            refs.usageFootnote.textContent = `Limit: ${usedMinutes}/${limit} min`;
        } else {
            refs.usageFootnote.textContent = "Set a daily limit to enable warnings and hard blocking.";
        }
    }

    function setupStorageListeners() {
        try {
            chrome.storage.onChanged.addListener((changes, area) => {
                if (area === "sync") {
                    let hasRelevantChanges = false;
                    const updated = { ...state.settings };

                    Object.keys(changes).forEach((key) => {
                        updated[key] = changes[key].newValue;
                        hasRelevantChanges = true;
                    });

                    if (hasRelevantChanges) {
                        state.settings = mergeSettings(updated);
                        state.suppressEvents = true;
                        applySettingsToUi();
                        state.suppressEvents = false;
                        refreshUsageUi();
                    }
                }

                if (area === "local") {
                    if (Object.prototype.hasOwnProperty.call(changes, "screenTimeByDay")) {
                        refreshUsageUi();
                    }
                }
            });
        } catch (error) {
            // noop
        }
    }

    function bindEvents() {
        const refs = state.refs;

        refs.posts.addEventListener("change", () => persistCurrentUi());
        refs.notifications.addEventListener("change", () => {
            updateNotificationFilterState();
            persistCurrentUi();
        });

        refs.notificationMentions.addEventListener("change", () => persistCurrentUi());
        refs.notificationReplies.addEventListener("change", () => persistCurrentUi());
        refs.notificationLikes.addEventListener("change", () => persistCurrentUi());
        refs.notificationRetweets.addEventListener("change", () => persistCurrentUi());

        refs.homeRedirect.addEventListener("change", (event) => {
            handleRedirectToggleChange("home", event);
        });

        refs.exploreRedirect.addEventListener("change", (event) => {
            handleRedirectToggleChange("explore", event);
        });

        refs.messagesRedirect.addEventListener("change", (event) => {
            handleRedirectToggleChange("messages", event);
        });

        refs.autoFollowingTab.addEventListener("change", () => {
            enforceMutualExclusion("autoFollowingTab");
            persistCurrentUi();
        });

        refs.hideForYouTab.addEventListener("change", () => persistCurrentUi());
        refs.hideTrendingSidebar.addEventListener("change", () => persistCurrentUi());
        refs.hideSuggestions.addEventListener("change", () => persistCurrentUi());
        refs.threadReader.addEventListener("change", () => persistCurrentUi());
        refs.quickBookmark.addEventListener("change", () => persistCurrentUi());
        refs.exploreRedirectAllowSearch.addEventListener("change", () => persistCurrentUi());

        refs.homeRedirectTarget.addEventListener("change", () => persistCurrentUi());
        refs.exploreRedirectTarget.addEventListener("change", () => persistCurrentUi());
        refs.messagesRedirectTarget.addEventListener("change", () => persistCurrentUi());

        refs.homeRedirectCustom.addEventListener("input", () => queueSave());
        refs.exploreRedirectCustom.addEventListener("input", () => queueSave());
        refs.messagesRedirectCustom.addEventListener("input", () => queueSave());

        refs.mutedWords.addEventListener("input", () => queueSave());
        refs.dailyLimitMinutes.addEventListener("input", () => queueSave());

        refs.scheduleEnabled.addEventListener("change", () => {
            updateScheduleControlsEnabledState();
            persistCurrentUi({ scheduleEval: true });
        });

        refs.scheduleStart.addEventListener("change", () => persistCurrentUi({ scheduleEval: true }));
        refs.scheduleEnd.addEventListener("change", () => persistCurrentUi({ scheduleEval: true }));

        for (let day = 0; day <= 6; day += 1) {
            const el = refs[`scheduleDay${day}`];
            if (el) {
                el.addEventListener("change", () => persistCurrentUi({ scheduleEval: true }));
            }
        }

        refs.scheduleFeatureHomeRedirect.addEventListener("change", () => persistCurrentUi({ scheduleEval: true }));
        refs.scheduleFeatureExploreRedirect.addEventListener("change", () => persistCurrentUi({ scheduleEval: true }));
        refs.scheduleFeatureMessagesRedirect.addEventListener("change", () => persistCurrentUi({ scheduleEval: true }));
        refs.scheduleFeatureHideTrendingSidebar.addEventListener("change", () => persistCurrentUi({ scheduleEval: true }));
        refs.scheduleFeatureHideSuggestions.addEventListener("change", () => persistCurrentUi({ scheduleEval: true }));
        refs.scheduleFeatureHideForYouTab.addEventListener("change", () => persistCurrentUi({ scheduleEval: true }));
        refs.scheduleFeatureAutoFollowingTab.addEventListener("change", () => persistCurrentUi({ scheduleEval: true }));

        refs.schedulePauseToggle.addEventListener("click", async () => {
            if (!refs.scheduleEnabled.checked) return;
            state.settings.schedulePaused = !state.settings.schedulePaused;
            refs.schedulePauseToggle.textContent = state.settings.schedulePaused
                ? "Resume schedule"
                : "Pause schedule";
            await syncSet({ schedulePaused: state.settings.schedulePaused });
            await sendRuntimeMessage({ action: "evaluateSchedule" });
            const latest = await syncGet(DEFAULTS);
            state.settings = mergeSettings(latest);
            state.suppressEvents = true;
            applySettingsToUi();
            state.suppressEvents = false;
        });

        setupOptionRowClickBehavior();
    }

    async function init() {
        state.refs = getRefs();
        bindEvents();
        setupStorageListeners();

        const loaded = await syncGet(DEFAULTS);
        state.settings = mergeSettings(loaded);

        state.suppressEvents = true;
        applySettingsToUi();
        state.suppressEvents = false;

        await refreshUsageUi();

        state.usageTimerId = setInterval(() => {
            refreshUsageUi();
        }, 30000);

        state.snoozeTimerId = setInterval(() => {
            updateSnoozeIndicators();
        }, 30000);

        await sendRuntimeMessage({ action: "ensureBackgroundState" });
    }

    document.addEventListener("DOMContentLoaded", init);
})();
