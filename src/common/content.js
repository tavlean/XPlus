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
        hideForYouTab: false,
        hideTrendingSidebar: false,
        hideSuggestions: false,
        autoFollowingTab: false,
        threadReader: true,
        quickBookmark: false,
        mutedWords: [],
        dailyLimitMinutes: 0,
    };

    const state = {
        settings: cloneDefaults(),
        observer: null,
        pendingNodes: [],
        processScheduled: false,
        readerButton: null,
        readerOverlay: null,
        lastFollowingSwitchAt: 0,
        initialized: false,
    };

    function cloneDefaults() {
        return {
            ...DEFAULTS,
            notificationFilters: { ...DEFAULTS.notificationFilters },
            mutedWords: [...DEFAULTS.mutedWords],
        };
    }

    function mergeSettings(raw) {
        const source = raw || {};
        const merged = cloneDefaults();

        Object.keys(merged).forEach((key) => {
            if (key !== "notificationFilters" && key !== "mutedWords") {
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    merged[key] = source[key];
                }
            }
        });

        merged.notificationFilters = {
            ...DEFAULTS.notificationFilters,
            ...(source.notificationFilters || {}),
        };

        merged.mutedWords = normalizeMutedWords(source.mutedWords || []);

        return merged;
    }

    function normalizeMutedWords(words) {
        if (Array.isArray(words)) {
            return words
                .map((word) => String(word || "").trim())
                .filter(Boolean)
                .slice(0, 150);
        }

        if (typeof words === "string") {
            return words
                .split(/[\n,]/)
                .map((word) => word.trim())
                .filter(Boolean)
                .slice(0, 150);
        }

        return [];
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

    function localGet(query) {
        return new Promise((resolve) => {
            try {
                chrome.storage.local.get(query, (items) => resolve(items || {}));
            } catch (error) {
                resolve({});
            }
        });
    }

    function sendMessage(message) {
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

    function safeOpenInNewTab(url) {
        sendMessage({ action: "openInNewTab", url }).then((response) => {
            if (!response || !response.ok) {
                window.open(url, "_blank", "noopener,noreferrer");
            }
        });
    }

    function ensureStyles() {
        if (document.getElementById("xplus-style")) return;

        const style = document.createElement("style");
        style.id = "xplus-style";
        style.textContent = `
            .xplus-quick-bookmark-btn {
                border: 1px solid rgba(29, 155, 240, 0.28);
                background: rgba(29, 155, 240, 0.1);
                color: #cbe6ff;
                border-radius: 999px;
                padding: 4px 10px;
                font-size: 12px;
                cursor: pointer;
                margin-left: 6px;
            }

            .xplus-quick-bookmark-btn[data-active="1"] {
                background: rgba(29, 155, 240, 0.28);
                border-color: rgba(29, 155, 240, 0.55);
            }

            .xplus-muted-placeholder {
                margin: 8px 0;
                padding: 10px 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                background: rgba(15, 20, 25, 0.8);
                color: rgb(231, 233, 234);
                font-size: 13px;
            }

            .xplus-muted-placeholder button {
                border: 1px solid rgba(29, 155, 240, 0.3);
                background: rgba(29, 155, 240, 0.18);
                color: #d8ecff;
                border-radius: 999px;
                padding: 3px 10px;
                margin-left: 8px;
                font-size: 12px;
                cursor: pointer;
            }

            #xplus-reader-toggle {
                position: fixed;
                right: 18px;
                bottom: 18px;
                z-index: 2147483643;
                border: 1px solid rgba(29, 155, 240, 0.45);
                background: rgba(15, 20, 25, 0.86);
                color: #d8ecff;
                border-radius: 999px;
                padding: 8px 14px;
                font-size: 13px;
                cursor: pointer;
                backdrop-filter: blur(5px);
            }

            #xplus-reader-overlay {
                position: fixed;
                inset: 0;
                z-index: 2147483644;
                background: rgba(6, 10, 16, 0.86);
                display: none;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }

            #xplus-reader-overlay .xplus-reader-panel {
                width: min(860px, 100%);
                max-height: 100%;
                overflow: auto;
                background: #0f141d;
                border: 1px solid rgba(255, 255, 255, 0.16);
                border-radius: 16px;
                padding: 18px;
                color: rgb(231, 233, 234);
            }

            #xplus-reader-overlay .xplus-reader-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 10px;
                margin-bottom: 12px;
            }

            #xplus-reader-overlay .xplus-reader-close {
                border: 1px solid rgba(255, 255, 255, 0.2);
                background: rgba(255, 255, 255, 0.07);
                color: #d8ecff;
                border-radius: 999px;
                padding: 6px 10px;
                cursor: pointer;
            }

            #xplus-reader-overlay .xplus-reader-item {
                border-bottom: 1px solid rgba(255, 255, 255, 0.12);
                padding: 10px 0;
            }

            #xplus-reader-overlay .xplus-reader-meta {
                color: rgba(231, 233, 234, 0.7);
                font-size: 12px;
                margin-bottom: 6px;
            }

            #xplus-time-limit-overlay {
                position: fixed;
                inset: 0;
                z-index: 2147483645;
                background: rgba(0, 0, 0, 0.9);
                color: #f5f9ff;
                display: none;
                align-items: center;
                justify-content: center;
                text-align: center;
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            #xplus-time-limit-overlay .xplus-time-limit-card {
                background: #0f141d;
                border: 1px solid rgba(29, 155, 240, 0.4);
                border-radius: 16px;
                padding: 24px;
                max-width: 420px;
            }

            #xplus-time-limit-overlay .xplus-time-limit-title {
                font-size: 22px;
                margin-bottom: 8px;
            }

            #xplus-time-limit-overlay .xplus-time-limit-text {
                color: rgba(255, 255, 255, 0.78);
                font-size: 15px;
                line-height: 1.45;
            }
        `;
        document.documentElement.appendChild(style);
    }

    function scheduleNodeProcess(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
        state.pendingNodes.push(node);
        if (state.processScheduled) return;

        state.processScheduled = true;
        const scheduleFn = window.requestAnimationFrame || ((cb) => setTimeout(cb, 16));
        scheduleFn(processPendingNodes);
    }

    function processPendingNodes() {
        state.processScheduled = false;
        const queue = state.pendingNodes.splice(0, state.pendingNodes.length);

        queue.forEach((node) => {
            processNode(node);
        });

        processGlobalFeatures();
    }

    function processNode(root) {
        if (!root || root.nodeType !== Node.ELEMENT_NODE) return;

        markNewLinks(root);

        if (state.settings.quickBookmark) {
            injectQuickBookmarkButtons(root);
        }

        if (state.settings.mutedWords.length > 0) {
            applyMutedWords(root);
        }
    }

    function processGlobalFeatures() {
        applySidebarAndTabHiding(document);

        if (state.settings.threadReader) {
            ensureReaderButton();
        } else {
            removeReaderUi();
        }

        if (state.settings.quickBookmark) {
            syncAllQuickBookmarkButtons();
        } else {
            removeAllQuickBookmarkButtons();
        }

        checkTimeLimitOverlay();
    }

    function markNewLinks(root) {
        const links = [];

        if (root.matches && root.matches("a[href]")) {
            links.push(root);
        }

        if (root.querySelectorAll) {
            root.querySelectorAll("a[href]:not([data-xplus-processed])").forEach((link) => {
                links.push(link);
            });
        }

        links.forEach((link) => {
            link.setAttribute("data-xplus-processed", "1");
        });
    }

    function parseUrl(href) {
        try {
            return new URL(href, window.location.origin);
        } catch (error) {
            return null;
        }
    }

    function isPostTimestampLink(link) {
        if (!link || !link.href) return false;
        const parsed = parseUrl(link.href);
        if (!parsed) return false;

        return parsed.pathname.includes("/status/") && !!link.querySelector("time");
    }

    function getNotificationLinkType(link) {
        const parsed = parseUrl(link.href);
        if (!parsed || parsed.origin !== "https://x.com") return null;

        if (!parsed.pathname.startsWith("/notifications")) {
            return null;
        }

        if (parsed.pathname.startsWith("/notifications/mentions")) return "mentions";
        if (parsed.pathname.startsWith("/notifications/replies")) return "replies";
        if (parsed.pathname.startsWith("/notifications/likes")) return "likes";
        if (parsed.pathname.startsWith("/notifications/retweets")) return "retweets";

        return "base";
    }

    function shouldOpenNotificationType(type) {
        if (!state.settings.notifications) return false;
        if (type === "base") return true;
        return !!state.settings.notificationFilters[type];
    }

    function findNativeBookmarkButton(article) {
        if (!article) return null;

        return (
            article.querySelector("button[data-testid='bookmark']") ||
            article.querySelector("button[data-testid='removeBookmark']") ||
            article.querySelector("button[data-testid$='bookmark']")
        );
    }

    function syncQuickBookmarkButton(article) {
        const quickButton = article.querySelector(".xplus-quick-bookmark-btn");
        if (!quickButton) return;

        const nativeButton = findNativeBookmarkButton(article);
        if (!nativeButton) {
            quickButton.style.display = "none";
            return;
        }

        quickButton.style.display = "inline-flex";

        const label = (nativeButton.getAttribute("aria-label") || "").toLowerCase();
        const testid = (nativeButton.getAttribute("data-testid") || "").toLowerCase();

        const active = label.includes("remove") || testid.includes("removebookmark");
        quickButton.setAttribute("data-active", active ? "1" : "0");
        quickButton.textContent = active ? "Bookmarked" : "Bookmark";
    }

    function syncAllQuickBookmarkButtons() {
        document.querySelectorAll("article[data-xplus-bookmark-processed='1']").forEach((article) => {
            syncQuickBookmarkButton(article);
        });
    }

    function injectQuickBookmarkButtons(root) {
        const articles = [];

        if (root.matches && root.matches("article[data-testid='tweet']")) {
            articles.push(root);
        }

        if (root.querySelectorAll) {
            root.querySelectorAll("article[data-testid='tweet']").forEach((article) => {
                articles.push(article);
            });
        }

        articles.forEach((article) => {
            if (article.getAttribute("data-xplus-bookmark-processed") === "1") {
                syncQuickBookmarkButton(article);
                return;
            }

            const actionGroup = article.querySelector("div[role='group']");
            if (!actionGroup) return;

            const quickButton = document.createElement("button");
            quickButton.type = "button";
            quickButton.className = "xplus-quick-bookmark-btn";
            quickButton.textContent = "Bookmark";
            quickButton.setAttribute("data-xplus", "quick-bookmark");

            quickButton.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();

                const nativeButton = findNativeBookmarkButton(article);
                if (nativeButton) {
                    nativeButton.click();
                    setTimeout(() => syncQuickBookmarkButton(article), 150);
                }
            });

            actionGroup.appendChild(quickButton);
            article.setAttribute("data-xplus-bookmark-processed", "1");
            syncQuickBookmarkButton(article);
        });
    }

    function removeAllQuickBookmarkButtons() {
        document.querySelectorAll(".xplus-quick-bookmark-btn").forEach((button) => {
            button.remove();
        });

        document.querySelectorAll("article[data-xplus-bookmark-processed='1']").forEach((article) => {
            article.removeAttribute("data-xplus-bookmark-processed");
        });
    }

    function normalizeText(value) {
        return String(value || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function hideElementWithMarker(element, marker) {
        if (!element || !element.style) return;
        element.style.display = "none";
        element.setAttribute(marker, "1");
    }

    function unhideMarkedElements(marker) {
        document.querySelectorAll(`[${marker}='1']`).forEach((element) => {
            element.style.display = "";
            element.removeAttribute(marker);
        });
    }

    function findTabElements() {
        return Array.from(document.querySelectorAll("a[role='tab'],button[role='tab'],div[role='tab']"));
    }

    function applyHomeTabControls() {
        const onHome = /^\/home\/?$/.test(window.location.pathname);
        if (!onHome) {
            unhideMarkedElements("data-xplus-hidden-for-you");
            return;
        }

        const tabs = findTabElements();
        let forYouTab = null;
        let followingTab = null;

        tabs.forEach((tab) => {
            const text = normalizeText(tab.textContent);
            if (!forYouTab && text === "for you") {
                forYouTab = tab;
            }
            if (!followingTab && text === "following") {
                followingTab = tab;
            }
        });

        if (state.settings.hideForYouTab) {
            if (forYouTab) {
                hideElementWithMarker(forYouTab, "data-xplus-hidden-for-you");
            }
        } else {
            unhideMarkedElements("data-xplus-hidden-for-you");
        }

        if ((state.settings.autoFollowingTab || state.settings.hideForYouTab) && followingTab) {
            const selected = followingTab.getAttribute("aria-selected") === "true";
            const now = Date.now();
            if (!selected && now - state.lastFollowingSwitchAt > 1800) {
                state.lastFollowingSwitchAt = now;
                followingTab.click();
            }
        }
    }

    function maybeHideByHeadingText(root, phrases, marker) {
        const elements = [];

        if (root.querySelectorAll) {
            root.querySelectorAll("h2,span,div").forEach((el) => elements.push(el));
        }

        elements.forEach((el) => {
            const text = normalizeText(el.textContent);
            if (!text) return;

            const matches = phrases.some((phrase) => text === phrase || text.startsWith(phrase));
            if (!matches) return;

            const container =
                el.closest("section") ||
                el.closest("div[data-testid='cellInnerDiv']") ||
                el.closest("div[role='region']") ||
                el.closest("article") ||
                el.parentElement;

            if (container) {
                hideElementWithMarker(container, marker);
            }
        });
    }

    function applySidebarAndTabHiding(root) {
        applyHomeTabControls();

        if (state.settings.hideTrendingSidebar) {
            maybeHideByHeadingText(
                root,
                ["what's happening", "trending", "trends for you"],
                "data-xplus-hidden-trending"
            );
        } else {
            unhideMarkedElements("data-xplus-hidden-trending");
        }

        if (state.settings.hideSuggestions) {
            maybeHideByHeadingText(root, ["who to follow"], "data-xplus-hidden-suggestion");
        } else {
            unhideMarkedElements("data-xplus-hidden-suggestion");
        }
    }

    function collectArticles(root) {
        const articles = [];

        if (root.matches && root.matches("article[data-testid='tweet']")) {
            articles.push(root);
        }

        if (root.querySelectorAll) {
            root.querySelectorAll("article[data-testid='tweet']").forEach((article) => {
                articles.push(article);
            });
        }

        return articles;
    }

    function getMutedWordMatch(text) {
        if (!text) return null;

        const content = text.toLowerCase();
        for (const mutedWord of state.settings.mutedWords) {
            const normalized = mutedWord.toLowerCase();
            if (normalized && content.includes(normalized)) {
                return mutedWord;
            }
        }
        return null;
    }

    function hideArticleAsMuted(article, matchedWord) {
        if (!article || article.getAttribute("data-xplus-muted") === "1") return;

        const placeholder = document.createElement("div");
        placeholder.className = "xplus-muted-placeholder";
        placeholder.setAttribute("data-xplus-muted-placeholder", "1");

        const text = document.createElement("span");
        text.textContent = `Post hidden by muted word: "${matchedWord}"`;

        const revealButton = document.createElement("button");
        revealButton.type = "button";
        revealButton.textContent = "Reveal";
        revealButton.addEventListener("click", () => {
            article.style.display = "";
            article.removeAttribute("data-xplus-muted");
            article.removeAttribute("data-xplus-muted-word");
            placeholder.remove();
        });

        placeholder.appendChild(text);
        placeholder.appendChild(revealButton);

        article.style.display = "none";
        article.setAttribute("data-xplus-muted", "1");
        article.setAttribute("data-xplus-muted-word", matchedWord);

        article.parentElement?.insertBefore(placeholder, article);
    }

    function applyMutedWords(root) {
        const articles = collectArticles(root);

        articles.forEach((article) => {
            if (article.getAttribute("data-xplus-mute-processed") === "1") {
                return;
            }

            article.setAttribute("data-xplus-mute-processed", "1");

            if (article.closest("#xplus-reader-overlay")) {
                return;
            }

            const text = article.innerText || article.textContent || "";
            const matchedWord = getMutedWordMatch(text);
            if (!matchedWord) return;

            hideArticleAsMuted(article, matchedWord);
        });
    }

    function resetMutedWordProcessing() {
        document.querySelectorAll("article[data-xplus-muted='1']").forEach((article) => {
            article.style.display = "";
            article.removeAttribute("data-xplus-muted");
            article.removeAttribute("data-xplus-muted-word");
        });

        document.querySelectorAll("[data-xplus-muted-placeholder='1']").forEach((placeholder) => {
            placeholder.remove();
        });

        document.querySelectorAll("article[data-xplus-mute-processed='1']").forEach((article) => {
            article.removeAttribute("data-xplus-mute-processed");
        });

        if (state.settings.mutedWords.length > 0) {
            applyMutedWords(document.body || document.documentElement);
        }
    }

    function isThreadPage() {
        return /^\/[^/]+\/status\/\d+/.test(window.location.pathname);
    }

    function removeReaderUi() {
        if (state.readerButton) {
            state.readerButton.remove();
            state.readerButton = null;
        }

        if (state.readerOverlay) {
            state.readerOverlay.remove();
            state.readerOverlay = null;
        }
    }

    function collectReaderEntries() {
        const articles = Array.from(document.querySelectorAll("article[data-testid='tweet']"));
        const entries = [];
        const dedupe = new Set();

        articles.forEach((article) => {
            const textElement = article.querySelector("[data-testid='tweetText']");
            const text = (textElement ? textElement.innerText : article.innerText || "").trim();
            if (!text) return;

            const authorElement = article.querySelector("[data-testid='User-Name']");
            const authorLine = (authorElement ? authorElement.innerText : "").split("\n")[0].trim();
            const timeElement = article.querySelector("time");
            const timeValue =
                (timeElement && (timeElement.getAttribute("datetime") || timeElement.textContent)) || "";

            const key = `${authorLine}::${text.slice(0, 120)}`;
            if (dedupe.has(key)) return;
            dedupe.add(key);

            entries.push({
                author: authorLine || "Post",
                time: String(timeValue || "").trim(),
                text,
            });
        });

        return entries.slice(0, 80);
    }

    function renderReaderOverlay() {
        if (!state.readerOverlay) return;

        const container = state.readerOverlay.querySelector("#xplus-reader-content");
        if (!container) return;

        const entries = collectReaderEntries();
        container.innerHTML = "";

        if (entries.length === 0) {
            const empty = document.createElement("div");
            empty.className = "xplus-reader-item";
            empty.textContent = "No thread content found yet. Scroll a bit and try again.";
            container.appendChild(empty);
            return;
        }

        entries.forEach((entry) => {
            const item = document.createElement("article");
            item.className = "xplus-reader-item";

            const meta = document.createElement("div");
            meta.className = "xplus-reader-meta";
            meta.textContent = entry.time ? `${entry.author} • ${entry.time}` : entry.author;

            const body = document.createElement("div");
            body.textContent = entry.text;

            item.appendChild(meta);
            item.appendChild(body);
            container.appendChild(item);
        });
    }

    function toggleReaderOverlay() {
        if (!state.readerOverlay) return;

        const visible = state.readerOverlay.style.display === "flex";
        if (visible) {
            state.readerOverlay.style.display = "none";
        } else {
            renderReaderOverlay();
            state.readerOverlay.style.display = "flex";
        }
    }

    function ensureReaderButton() {
        if (!state.settings.threadReader || !isThreadPage()) {
            removeReaderUi();
            return;
        }

        if (!state.readerButton) {
            const button = document.createElement("button");
            button.id = "xplus-reader-toggle";
            button.type = "button";
            button.textContent = "Reader";
            button.addEventListener("click", () => {
                toggleReaderOverlay();
            });

            document.body.appendChild(button);
            state.readerButton = button;
        }

        if (!state.readerOverlay) {
            const overlay = document.createElement("div");
            overlay.id = "xplus-reader-overlay";
            overlay.innerHTML = `
                <div class="xplus-reader-panel">
                    <div class="xplus-reader-header">
                        <strong>Thread Reader</strong>
                        <button type="button" class="xplus-reader-close">Close</button>
                    </div>
                    <div id="xplus-reader-content"></div>
                </div>
            `;

            overlay.addEventListener("click", (event) => {
                if (event.target === overlay) {
                    overlay.style.display = "none";
                }
            });

            const closeBtn = overlay.querySelector(".xplus-reader-close");
            if (closeBtn) {
                closeBtn.addEventListener("click", () => {
                    overlay.style.display = "none";
                });
            }

            document.body.appendChild(overlay);
            state.readerOverlay = overlay;
        }
    }

    function isEditableTarget(target) {
        if (!target) return false;
        if (target.isContentEditable) return true;

        const tagName = target.tagName;
        return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
    }

    function ensureTimeLimitOverlay() {
        let overlay = document.getElementById("xplus-time-limit-overlay");
        if (overlay) return overlay;

        overlay = document.createElement("div");
        overlay.id = "xplus-time-limit-overlay";
        overlay.innerHTML = `
            <div class="xplus-time-limit-card">
                <div class="xplus-time-limit-title">Daily limit reached</div>
                <div class="xplus-time-limit-text" id="xplus-time-limit-text"></div>
            </div>
        `;

        document.body.appendChild(overlay);
        return overlay;
    }

    function getTodayKey() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    async function checkTimeLimitOverlay() {
        const limit = Number.parseInt(state.settings.dailyLimitMinutes || 0, 10) || 0;
        const overlay = ensureTimeLimitOverlay();

        if (limit <= 0) {
            overlay.style.display = "none";
            return;
        }

        const localState = await localGet({ screenTimeByDay: {} });
        const dayKey = getTodayKey();
        const seconds = Number((localState.screenTimeByDay || {})[dayKey] || 0);
        const minutes = Math.floor(seconds / 60);

        if (minutes >= limit) {
            const label = overlay.querySelector("#xplus-time-limit-text");
            if (label) {
                label.textContent = `You have used ${minutes} of ${limit} minutes on X today. Come back tomorrow.`;
            }
            overlay.style.display = "flex";
        } else {
            overlay.style.display = "none";
        }
    }

    function applySettingsChangeEffects(previous, next) {
        if (previous.quickBookmark && !next.quickBookmark) {
            removeAllQuickBookmarkButtons();
        }

        const mutedChanged = JSON.stringify(previous.mutedWords) !== JSON.stringify(next.mutedWords);
        if (mutedChanged) {
            resetMutedWordProcessing();
        }

        if (!next.hideTrendingSidebar) {
            unhideMarkedElements("data-xplus-hidden-trending");
        }

        if (!next.hideSuggestions) {
            unhideMarkedElements("data-xplus-hidden-suggestion");
        }

        if (!next.hideForYouTab) {
            unhideMarkedElements("data-xplus-hidden-for-you");
        }

        if (!next.threadReader) {
            removeReaderUi();
        }

        scheduleNodeProcess(document.body || document.documentElement);
    }

    function handleDelegatedClick(event) {
        const link = event.target && event.target.closest ? event.target.closest("a[href]") : null;

        if (link && state.settings.posts && isPostTimestampLink(link)) {
            event.preventDefault();
            event.stopPropagation();
            safeOpenInNewTab(link.href);
            return;
        }

        if (link) {
            const notificationType = getNotificationLinkType(link);
            if (notificationType && shouldOpenNotificationType(notificationType)) {
                event.preventDefault();
                event.stopPropagation();

                const parsed = parseUrl(link.href);
                if (parsed) {
                    safeOpenInNewTab(parsed.toString());
                }
            }
        }
    }

    function handleKeyDown(event) {
        if (!state.settings.threadReader || !isThreadPage()) return;
        if (event.key.toLowerCase() !== "r") return;
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (isEditableTarget(event.target)) return;

        event.preventDefault();
        toggleReaderOverlay();
    }

    function setupMutationObserver() {
        if (state.observer) return;

        state.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (!mutation.addedNodes || mutation.addedNodes.length === 0) return;

                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        scheduleNodeProcess(node);
                    }
                });
            });
        });

        state.observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    }

    async function loadSettingsFromStorage() {
        const loaded = await syncGet(DEFAULTS);
        const nextSettings = mergeSettings(loaded);
        const previous = state.settings;
        state.settings = nextSettings;
        return { previous, next: nextSettings };
    }

    async function initialize() {
        if (state.initialized) return;
        state.initialized = true;

        ensureStyles();

        await loadSettingsFromStorage();

        document.addEventListener("click", handleDelegatedClick, true);
        document.addEventListener("keydown", handleKeyDown, true);

        setupMutationObserver();
        scheduleNodeProcess(document.body || document.documentElement);

        try {
            chrome.storage.onChanged.addListener(async (changes, area) => {
                if (area === "sync") {
                    const { previous, next } = await loadSettingsFromStorage();
                    applySettingsChangeEffects(previous, next);
                    return;
                }

                if (area === "local") {
                    if (Object.prototype.hasOwnProperty.call(changes, "screenTimeByDay")) {
                        checkTimeLimitOverlay();
                    }
                }
            });

            chrome.runtime.onMessage.addListener((message) => {
                if (!message || typeof message !== "object") return;
                if (message.action === "xplusUsageUpdated") {
                    checkTimeLimitOverlay();
                }
            });
        } catch (error) {
            // noop
        }
    }

    initialize();
})();
