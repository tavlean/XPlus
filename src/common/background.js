const DEFAULT_SYNC = {
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
    screenTimeTracking: true,
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

const DEFAULT_LOCAL = {
    screenTimeByDay: {},
    screenTimeWarnings: {},
};

const FEATURE_CONFIG = {
    home: {
        toggleKey: "homeRedirect",
        snoozeKey: "snoozeEndTime",
        alarmName: "homeSnoozeExpired",
        label: "Home Redirect",
    },
    explore: {
        toggleKey: "exploreRedirect",
        snoozeKey: "exploreSnoozeEndTime",
        alarmName: "exploreSnoozeExpired",
        label: "Explore Redirect",
    },
    messages: {
        toggleKey: "messagesRedirect",
        snoozeKey: "messagesSnoozeEndTime",
        alarmName: "messagesSnoozeExpired",
        label: "DM Redirect",
    },
};

const DYNAMIC_RULE_IDS = {
    home: 2001,
    explore: 2002,
    messages: 2003,
};

const RULE_FILTERS = {
    home: "^https://x\\.com/home/?(?:[?#].*)?$",
    explore: "^https://x\\.com/explore(?:/.*)?(?:[?#].*)?$",
    messages: "^https://x\\.com/messages(?:/.*)?(?:[?#].*)?$",
};

const REDIRECT_TARGETS = {
    bookmarks: "https://x.com/i/bookmarks",
    lists: "https://x.com/i/lists",
    messages: "https://x.com/messages",
    home: "https://x.com/home",
};

const ALARM_NAMES = {
    screenTimeTick: "xplusScreenTimeTick",
    scheduleCheck: "xplusScheduleCheck",
    badgeTick: "xplusBadgeTick",
};

const TRACKED_SCHEDULE_FEATURES = [
    "homeRedirect",
    "exploreRedirect",
    "messagesRedirect",
    "hideTrendingSidebar",
    "hideSuggestions",
    "hideForYouTab",
    "autoFollowingTab",
];

let startupInitialized = false;

function cloneDefaults() {
    return {
        ...DEFAULT_SYNC,
        notificationFilters: { ...DEFAULT_SYNC.notificationFilters },
        redirectTargets: { ...DEFAULT_SYNC.redirectTargets },
        customRedirectTargets: { ...DEFAULT_SYNC.customRedirectTargets },
        mutedWords: [...DEFAULT_SYNC.mutedWords],
        scheduleDays: [...DEFAULT_SYNC.scheduleDays],
        scheduleFeatures: { ...DEFAULT_SYNC.scheduleFeatures },
        scheduleLastManualState: { ...DEFAULT_SYNC.scheduleLastManualState },
    };
}

function mergeSettings(raw) {
    const source = raw || {};
    const merged = cloneDefaults();

    Object.keys(merged).forEach((key) => {
        if (
            key !== "notificationFilters" &&
            key !== "redirectTargets" &&
            key !== "customRedirectTargets" &&
            key !== "mutedWords" &&
            key !== "scheduleDays" &&
            key !== "scheduleFeatures" &&
            key !== "scheduleLastManualState"
        ) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                merged[key] = source[key];
            }
        }
    });

    merged.notificationFilters = {
        ...DEFAULT_SYNC.notificationFilters,
        ...(source.notificationFilters || {}),
    };

    merged.redirectTargets = {
        ...DEFAULT_SYNC.redirectTargets,
        ...(source.redirectTargets || {}),
    };

    merged.customRedirectTargets = {
        ...DEFAULT_SYNC.customRedirectTargets,
        ...(source.customRedirectTargets || {}),
    };

    merged.scheduleFeatures = {
        ...DEFAULT_SYNC.scheduleFeatures,
        ...(source.scheduleFeatures || {}),
    };

    merged.scheduleDays = Array.isArray(source.scheduleDays)
        ? source.scheduleDays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        : [...DEFAULT_SYNC.scheduleDays];

    merged.mutedWords = Array.isArray(source.mutedWords)
        ? source.mutedWords.map((word) => String(word || "").trim()).filter(Boolean).slice(0, 150)
        : [];

    merged.scheduleLastManualState =
        source.scheduleLastManualState && typeof source.scheduleLastManualState === "object"
            ? source.scheduleLastManualState
            : {};

    return merged;
}

function syncGet(query) {
    return new Promise((resolve) => {
        try {
            chrome.storage.sync.get(query, (items) => resolve(items || {}));
        } catch (error) {
            resolve({});
        }
    });
}

function syncSet(items) {
    return new Promise((resolve) => {
        try {
            chrome.storage.sync.set(items, () => resolve());
        } catch (error) {
            resolve();
        }
    });
}

function localGet(query) {
    return new Promise((resolve) => {
        try {
            chrome.storage.local.get(query, (items) => resolve(items || {}));
        } catch (error) {
            resolve({});
        }
    });
}

function localSet(items) {
    return new Promise((resolve) => {
        try {
            chrome.storage.local.set(items, () => resolve());
        } catch (error) {
            resolve();
        }
    });
}

function alarmsCreate(name, alarmInfo) {
    return new Promise((resolve) => {
        try {
            chrome.alarms.create(name, alarmInfo);
            resolve(true);
        } catch (error) {
            resolve(false);
        }
    });
}

function alarmsClear(name) {
    return new Promise((resolve) => {
        try {
            chrome.alarms.clear(name, () => resolve(true));
        } catch (error) {
            resolve(false);
        }
    });
}

function tabsQuery(queryInfo) {
    return new Promise((resolve) => {
        try {
            chrome.tabs.query(queryInfo, (tabs) => resolve(Array.isArray(tabs) ? tabs : []));
        } catch (error) {
            resolve([]);
        }
    });
}

function actionSetBadgeText(text) {
    return new Promise((resolve) => {
        if (!chrome.action || !chrome.action.setBadgeText) {
            resolve();
            return;
        }
        try {
            chrome.action.setBadgeText({ text }, () => resolve());
        } catch (error) {
            resolve();
        }
    });
}

function actionSetBadgeBackgroundColor(color) {
    return new Promise((resolve) => {
        if (!chrome.action || !chrome.action.setBadgeBackgroundColor) {
            resolve();
            return;
        }
        try {
            chrome.action.setBadgeBackgroundColor({ color }, () => resolve());
        } catch (error) {
            resolve();
        }
    });
}

function actionSetTitle(title) {
    return new Promise((resolve) => {
        if (!chrome.action || !chrome.action.setTitle) {
            resolve();
            return;
        }
        try {
            chrome.action.setTitle({ title }, () => resolve());
        } catch (error) {
            resolve();
        }
    });
}

function notificationsCreate(id, options) {
    return new Promise((resolve) => {
        if (!chrome.notifications || !chrome.notifications.create) {
            resolve();
            return;
        }
        try {
            chrome.notifications.create(id, options, () => resolve());
        } catch (error) {
            resolve();
        }
    });
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

function getRedirectTargetUrl(feature, settings) {
    const targetType = settings.redirectTargets[feature] || "bookmarks";

    if (targetType === "custom") {
        const customValue = (settings.customRedirectTargets[feature] || "").trim();
        if (isValidHttpUrl(customValue)) {
            return customValue;
        }
        return REDIRECT_TARGETS.bookmarks;
    }

    return REDIRECT_TARGETS[targetType] || REDIRECT_TARGETS.bookmarks;
}

function buildDynamicRule(feature, targetUrl) {
    return {
        id: DYNAMIC_RULE_IDS[feature],
        priority: 1,
        action: {
            type: "redirect",
            redirect: {
                url: targetUrl,
            },
        },
        condition: {
            regexFilter: RULE_FILTERS[feature],
            resourceTypes: ["main_frame"],
        },
    };
}

async function applyDynamicRedirectRules(settingsInput) {
    if (!chrome.declarativeNetRequest || !chrome.declarativeNetRequest.updateDynamicRules) {
        return;
    }

    const settings = settingsInput || mergeSettings(await syncGet(DEFAULT_SYNC));
    const removeRuleIds = Object.values(DYNAMIC_RULE_IDS);
    const addRules = [];

    if (settings.homeRedirect) {
        addRules.push(buildDynamicRule("home", getRedirectTargetUrl("home", settings)));
    }

    if (settings.messagesRedirect) {
        addRules.push(buildDynamicRule("messages", getRedirectTargetUrl("messages", settings)));
    }

    if (settings.exploreRedirect && !settings.exploreRedirectAllowSearch) {
        addRules.push(buildDynamicRule("explore", getRedirectTargetUrl("explore", settings)));
    }

    try {
        if (chrome.declarativeNetRequest.updateEnabledRulesets) {
            chrome.declarativeNetRequest.updateEnabledRulesets({
                disableRulesetIds: ["ruleset_home_redirect", "ruleset_explore_redirect"],
            });
        }

        await new Promise((resolve) => {
            chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules }, () => {
                resolve();
            });
        });
    } catch (error) {
        console.warn("Failed to apply dynamic redirect rules", error);
    }
}

function getLocalDayKey(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatDuration(seconds) {
    const minutes = Math.floor((seconds || 0) / 60);
    const hours = Math.floor(minutes / 60);
    const restMinutes = minutes % 60;

    if (hours > 0 && restMinutes > 0) {
        return `${hours}h ${restMinutes}m`;
    }
    if (hours > 0) {
        return `${hours}h`;
    }
    return `${minutes}m`;
}

function formatBadgeRemaining(milliseconds) {
    const totalMinutes = Math.max(1, Math.ceil(milliseconds / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}d`;
    }
    if (hours > 0) {
        return `${hours}h`;
    }
    return `${totalMinutes}m`;
}

async function updateBadgeCountdown(settingsInput) {
    const settings = settingsInput || mergeSettings(await syncGet(DEFAULT_SYNC));
    const now = Date.now();

    const activeSnoozes = Object.values(FEATURE_CONFIG)
        .map((config) => ({
            label: config.label,
            end: Number(settings[config.snoozeKey] || 0),
        }))
        .filter((item) => Number.isFinite(item.end) && item.end > now)
        .sort((a, b) => a.end - b.end);

    if (activeSnoozes.length === 0) {
        await actionSetBadgeText("");
        await actionSetTitle("XPlus");
        return;
    }

    const nearest = activeSnoozes[0];
    const remainingMs = nearest.end - now;
    const badgeText = formatBadgeRemaining(remainingMs);

    await actionSetBadgeBackgroundColor("#d9a441");
    await actionSetBadgeText(badgeText);
    await actionSetTitle(`XPlus: ${nearest.label} snoozed (${badgeText} left)`);
}

async function showSnoozeExpirationNotification(feature) {
    const config = FEATURE_CONFIG[feature];
    if (!config) return;

    const id = `xplus-${feature}-snooze-expired`;
    await notificationsCreate(id, {
        type: "basic",
        iconUrl: "assets/icon48.png",
        title: "XPlus focus feature re-enabled",
        message: `${config.label} is active again after snooze.`,
        silent: false,
    });

    setTimeout(() => {
        try {
            chrome.notifications.clear(id);
        } catch (error) {
            // noop
        }
    }, 5000);
}

async function handleFeatureSnoozeExpiration(feature) {
    const config = FEATURE_CONFIG[feature];
    if (!config) return;

    const settings = mergeSettings(await syncGet(DEFAULT_SYNC));
    const expiry = Number(settings[config.snoozeKey] || 0);
    if (!Number.isFinite(expiry)) return;

    const updates = {
        [config.snoozeKey]: null,
        [config.toggleKey]: true,
    };

    await syncSet(updates);
    const nextSettings = mergeSettings({ ...settings, ...updates });

    await applyDynamicRedirectRules(nextSettings);
    await updateBadgeCountdown(nextSettings);
    await showSnoozeExpirationNotification(feature);
}

async function restoreSnoozeAlarms(settingsInput) {
    const settings = settingsInput || mergeSettings(await syncGet(DEFAULT_SYNC));
    const now = Date.now();

    for (const [feature, config] of Object.entries(FEATURE_CONFIG)) {
        const expiry = Number(settings[config.snoozeKey] || 0);
        await alarmsClear(config.alarmName);

        if (!Number.isFinite(expiry)) {
            continue;
        }

        if (expiry <= now) {
            await handleFeatureSnoozeExpiration(feature);
            continue;
        }

        await alarmsCreate(config.alarmName, { when: expiry });
    }
}

async function setupRecurringAlarms() {
    await alarmsCreate(ALARM_NAMES.screenTimeTick, { periodInMinutes: 1 });
    await alarmsCreate(ALARM_NAMES.scheduleCheck, { periodInMinutes: 5 });
    await alarmsCreate(ALARM_NAMES.badgeTick, { periodInMinutes: 1 });
}

async function queryIdleState(secondsThreshold) {
    if (!chrome.idle || !chrome.idle.queryState) {
        return "active";
    }

    return new Promise((resolve) => {
        try {
            chrome.idle.queryState(secondsThreshold, (state) => {
                resolve(state || "active");
            });
        } catch (error) {
            resolve("active");
        }
    });
}

async function hasActiveXTab() {
    const tabs = await tabsQuery({
        active: true,
        lastFocusedWindow: true,
        url: ["https://x.com/*", "https://*.x.com/*"],
    });
    return tabs.length > 0;
}

async function broadcastToXTabs(message) {
    const tabs = await tabsQuery({ url: ["https://x.com/*", "https://*.x.com/*"] });
    await Promise.all(
        tabs.map(
            (tab) =>
                new Promise((resolve) => {
                    try {
                        chrome.tabs.sendMessage(tab.id, message, () => resolve());
                    } catch (error) {
                        resolve();
                    }
                })
        )
    );
}

function cleanupOldUsageDays(obj, keepDays) {
    const keys = Object.keys(obj).sort();
    if (keys.length <= keepDays) return obj;

    const toRemove = keys.slice(0, keys.length - keepDays);
    const next = { ...obj };
    toRemove.forEach((key) => {
        delete next[key];
    });
    return next;
}

async function trackScreenTimeTick() {
    const settings = mergeSettings(await syncGet(DEFAULT_SYNC));
    if (!settings.screenTimeTracking) return;

    const idleState = await queryIdleState(60);
    if (idleState !== "active") return;

    const onX = await hasActiveXTab();
    if (!onX) return;

    const localState = await localGet(DEFAULT_LOCAL);
    const screenTimeByDay = { ...(localState.screenTimeByDay || {}) };
    const screenTimeWarnings = { ...(localState.screenTimeWarnings || {}) };

    const dayKey = getLocalDayKey(new Date());
    const currentSeconds = Number(screenTimeByDay[dayKey] || 0) + 60;
    screenTimeByDay[dayKey] = currentSeconds;

    const cleanedScreenTime = cleanupOldUsageDays(screenTimeByDay, 45);
    const cleanedWarnings = cleanupOldUsageDays(screenTimeWarnings, 45);

    const limit = Number.parseInt(settings.dailyLimitMinutes || 0, 10) || 0;

    if (limit > 0) {
        const usedMinutes = currentSeconds / 60;
        const warningState = {
            soft: !!(cleanedWarnings[dayKey] && cleanedWarnings[dayKey].soft),
            hard: !!(cleanedWarnings[dayKey] && cleanedWarnings[dayKey].hard),
        };

        if (!warningState.soft && usedMinutes >= limit * 0.8) {
            warningState.soft = true;
            await notificationsCreate(`xplus-limit-soft-${dayKey}`, {
                type: "basic",
                iconUrl: "assets/icon48.png",
                title: "XPlus time warning",
                message: `You have reached 80% of your daily X limit (${limit} min).`,
                silent: false,
            });
        }

        if (!warningState.hard && usedMinutes >= limit) {
            warningState.hard = true;
            await notificationsCreate(`xplus-limit-hard-${dayKey}`, {
                type: "basic",
                iconUrl: "assets/icon48.png",
                title: "XPlus limit reached",
                message: `Daily limit reached: ${formatDuration(currentSeconds)} of ${limit}m.`,
                silent: false,
            });
        }

        cleanedWarnings[dayKey] = warningState;
    }

    await localSet({
        screenTimeByDay: cleanedScreenTime,
        screenTimeWarnings: cleanedWarnings,
    });

    await broadcastToXTabs({ action: "xplusUsageUpdated" });
}

function parseTimeToMinutes(value, fallback) {
    const safeValue = typeof value === "string" ? value : fallback;
    const parts = safeValue.split(":");
    if (parts.length !== 2) return fallback;

    const hours = Number.parseInt(parts[0], 10);
    const minutes = Number.parseInt(parts[1], 10);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return fallback;
    }

    return Math.min(23, Math.max(0, hours)) * 60 + Math.min(59, Math.max(0, minutes));
}

function buildDateFromMinutes(baseDate, totalMinutes, dayDelta = 0) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + dayDelta);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    date.setHours(hours, minutes, 0, 0);
    return date;
}

function resolveScheduleWindow(settings, nowDate) {
    if (!settings.scheduleEnabled || settings.schedulePaused) {
        return { active: false, endDate: null };
    }

    const activeDays = Array.isArray(settings.scheduleDays) ? settings.scheduleDays : [];
    if (activeDays.length === 0) {
        return { active: false, endDate: null };
    }

    const startMinutes = parseTimeToMinutes(settings.scheduleStart || "09:00", 540);
    const endMinutes = parseTimeToMinutes(settings.scheduleEnd || "17:00", 1020);
    const currentDay = nowDate.getDay();
    const currentMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();

    if (startMinutes <= endMinutes) {
        const active =
            activeDays.includes(currentDay) &&
            currentMinutes >= startMinutes &&
            currentMinutes < endMinutes;

        const endDate = active ? buildDateFromMinutes(nowDate, endMinutes, 0) : null;
        return { active, endDate };
    }

    const previousDay = (currentDay + 6) % 7;
    const activeLate = activeDays.includes(currentDay) && currentMinutes >= startMinutes;
    const activeEarly = activeDays.includes(previousDay) && currentMinutes < endMinutes;

    if (!activeLate && !activeEarly) {
        return { active: false, endDate: null };
    }

    const endDate = activeLate
        ? buildDateFromMinutes(nowDate, endMinutes, 1)
        : buildDateFromMinutes(nowDate, endMinutes, 0);

    return { active: true, endDate };
}

async function evaluateSchedule(settingsInput) {
    const settings = settingsInput || mergeSettings(await syncGet(DEFAULT_SYNC));
    const now = new Date();
    const windowState = resolveScheduleWindow(settings, now);

    const updates = {};

    if (!settings.scheduleEnabled || settings.schedulePaused) {
        if (settings.scheduleApplied) {
            const previous = settings.scheduleLastManualState || {};
            TRACKED_SCHEDULE_FEATURES.forEach((featureKey) => {
                if (Object.prototype.hasOwnProperty.call(previous, featureKey)) {
                    updates[featureKey] = !!previous[featureKey];
                }
            });
            updates.scheduleApplied = false;
            updates.scheduleLastManualState = {};
        }

        if (settings.scheduleActiveUntil) {
            updates.scheduleActiveUntil = null;
        }
    } else if (windowState.active) {
        if (!settings.scheduleApplied) {
            const snapshot = {};
            TRACKED_SCHEDULE_FEATURES.forEach((featureKey) => {
                snapshot[featureKey] = !!settings[featureKey];
            });
            updates.scheduleLastManualState = snapshot;
            updates.scheduleApplied = true;
        }

        TRACKED_SCHEDULE_FEATURES.forEach((featureKey) => {
            const targetValue = !!(settings.scheduleFeatures && settings.scheduleFeatures[featureKey]);
            updates[featureKey] = targetValue;
        });

        if (updates.homeRedirect && updates.autoFollowingTab) {
            updates.autoFollowingTab = false;
        }

        updates.scheduleActiveUntil = windowState.endDate ? windowState.endDate.getTime() : null;
    } else {
        if (settings.scheduleApplied) {
            const previous = settings.scheduleLastManualState || {};
            TRACKED_SCHEDULE_FEATURES.forEach((featureKey) => {
                if (Object.prototype.hasOwnProperty.call(previous, featureKey)) {
                    updates[featureKey] = !!previous[featureKey];
                }
            });
            updates.scheduleApplied = false;
            updates.scheduleLastManualState = {};
        }

        if (settings.scheduleActiveUntil) {
            updates.scheduleActiveUntil = null;
        }
    }

    if (Object.keys(updates).length === 0) {
        return settings;
    }

    await syncSet(updates);
    const nextSettings = mergeSettings({ ...settings, ...updates });

    await applyDynamicRedirectRules(nextSettings);
    await restoreSnoozeAlarms(nextSettings);
    await updateBadgeCountdown(nextSettings);

    return nextSettings;
}

async function initializeBackgroundState() {
    const loaded = await syncGet(DEFAULT_SYNC);
    const merged = mergeSettings(loaded);

    await syncSet(merged);
    await setupRecurringAlarms();
    const scheduled = await evaluateSchedule(merged);
    await applyDynamicRedirectRules(scheduled);
    await restoreSnoozeAlarms(scheduled);
    await updateBadgeCountdown(scheduled);
}

function isScheduleConfigKey(key) {
    return [
        "scheduleEnabled",
        "schedulePaused",
        "scheduleStart",
        "scheduleEnd",
        "scheduleDays",
        "scheduleFeatures",
    ].includes(key);
}

async function handleSyncStorageChange(changes) {
    const settings = mergeSettings(await syncGet(DEFAULT_SYNC));

    const keys = Object.keys(changes || {});
    const hasScheduleConfigChange = keys.some((key) => isScheduleConfigKey(key));

    if (hasScheduleConfigChange) {
        const afterSchedule = await evaluateSchedule(settings);
        await applyDynamicRedirectRules(afterSchedule);
        await restoreSnoozeAlarms(afterSchedule);
        await updateBadgeCountdown(afterSchedule);
        return;
    }

    await applyDynamicRedirectRules(settings);
    await restoreSnoozeAlarms(settings);
    await updateBadgeCountdown(settings);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || typeof message !== "object") {
        return;
    }

    if (message.action === "openInNewTab") {
        chrome.tabs.create({ url: message.url, active: false }, () => {
            sendResponse({ ok: true });
        });
        return true;
    }

    if (message.action === "evaluateSchedule") {
        evaluateSchedule().then(() => sendResponse({ ok: true }));
        return true;
    }

    if (message.action === "ensureBackgroundState") {
        initializeBackgroundState().then(() => sendResponse({ ok: true }));
        return true;
    }

    return false;
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (!alarm || !alarm.name) return;

    if (alarm.name === FEATURE_CONFIG.home.alarmName) {
        handleFeatureSnoozeExpiration("home");
        return;
    }

    if (alarm.name === FEATURE_CONFIG.explore.alarmName) {
        handleFeatureSnoozeExpiration("explore");
        return;
    }

    if (alarm.name === FEATURE_CONFIG.messages.alarmName) {
        handleFeatureSnoozeExpiration("messages");
        return;
    }

    if (alarm.name === ALARM_NAMES.screenTimeTick) {
        trackScreenTimeTick();
        return;
    }

    if (alarm.name === ALARM_NAMES.scheduleCheck) {
        evaluateSchedule();
        return;
    }

    if (alarm.name === ALARM_NAMES.badgeTick) {
        updateBadgeCountdown();
    }
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync") {
        handleSyncStorageChange(changes);
    }
});

chrome.runtime.onInstalled.addListener(() => {
    initializeBackgroundState();
});

chrome.runtime.onStartup.addListener(() => {
    initializeBackgroundState();
});

if (!startupInitialized) {
    startupInitialized = true;
    initializeBackgroundState();
}
