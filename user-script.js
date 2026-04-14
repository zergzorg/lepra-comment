// ==UserScript==
// @name         Leprosorium Comment Filter v2
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Компактное скрытие и приглушение комментариев по авторам на страницах обсуждений Leprosorium
// @author       zergzorg
// @match        *://*.leprosorium.ru/comments/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const CONFIG = {
    storageKey: "lepra_comment_filter_v2",
    processedClass: "lepra-filter-ready",
    panelId: "lepra-filter-panel",
    placeholderClass: "lepra-comment-placeholder",
    controlClass: "lepra-user-filter-control",
    pageScope: "global",
    modes: {
      mute: "mute",
      hide: "hide",
    },
  };

  const SELECTORS = {
    commentsHolder: "#js-comments_holder",
    comment: ".comment[data-user_id]",
    commentBody: ".c_body",
    commentFooter: ".c_footer .ddi",
    userLink: ".c_user[data-user_id]",
  };

  if (!location.pathname.includes("/comments/")) {
    return;
  }

  function readState() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (!raw) {
        return { users: {}, ui: { paused: false } };
      }

      const parsed = JSON.parse(raw);
      return {
        users: parsed.users && typeof parsed.users === "object" ? parsed.users : {},
        ui:
          parsed.ui && typeof parsed.ui === "object"
            ? { paused: !!parsed.ui.paused }
            : { paused: false },
      };
    } catch (error) {
      console.error("[LEPRA FILTER] Не удалось прочитать localStorage", error);
      return { users: {}, ui: { paused: false } };
    }
  }

  function writeState(state) {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
    } catch (error) {
      console.error("[LEPRA FILTER] Не удалось сохранить состояние", error);
    }
  }

  let state = readState();

  function getUserState(userId) {
    return state.users[userId] || null;
  }

  function setUserState(userId, login, mode) {
    if (!userId) return;

    if (!mode) {
      delete state.users[userId];
    } else {
      state.users[userId] = {
        mode,
        login: login || state.users[userId]?.login || userId,
        updatedAt: Date.now(),
        scope: CONFIG.pageScope,
      };
    }

    writeState(state);
  }

  function setPaused(value) {
    state.ui.paused = !!value;
    writeState(state);
  }

  function getComments() {
    return Array.from(document.querySelectorAll(SELECTORS.comment));
  }

  function getUserStats() {
    const stats = new Map();

    getComments().forEach((comment) => {
      const { user_id: userId, user_login: userLogin } = comment.dataset;
      if (!userId) return;

      if (!stats.has(userId)) {
        stats.set(userId, {
          userId,
          login: userLogin || userId,
          total: 0,
          media: 0,
        });
      }

      const item = stats.get(userId);
      item.total += 1;

      if (commentHasMedia(comment)) {
        item.media += 1;
      }
    });

    return stats;
  }

  function commentHasMedia(comment) {
    const body = comment.querySelector(SELECTORS.commentBody);
    if (!body) return false;

    return Boolean(
      body.querySelector("img, object, embed, iframe, video") ||
        body.querySelector('a[rel="youtube"], a[data-preview], a[href*="youtube.com"], a[href*="youtu.be"]'),
    );
  }

  function createStyleTag() {
    const style = document.createElement("style");
    style.textContent = `
      #${CONFIG.panelId} {
        margin: 0 0 12px;
        padding: 9px 12px;
        border: 1px solid #d8d2bf;
        background: linear-gradient(180deg, #f7f2e4 0%, #f0eadb 100%);
        color: #5b5342;
        font: 12px/1.4 Arial, sans-serif;
      }

      #${CONFIG.panelId}.is-paused {
        background: linear-gradient(180deg, #f3f3f3 0%, #e6e6e6 100%);
      }

      .lepra-filter-panel-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px 12px;
      }

      .lepra-filter-panel-row + .lepra-filter-panel-row {
        margin-top: 7px;
      }

      .lepra-filter-panel-title {
        font-weight: bold;
        color: #433c30;
      }

      .lepra-filter-panel-link {
        cursor: pointer;
        color: #5d6d2a;
        text-decoration: underline;
        user-select: none;
      }

      .lepra-filter-panel-link.is-danger {
        color: #8a4b3d;
      }

      .lepra-filter-panel-muted {
        color: #7c7364;
      }

      .lepra-filter-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .lepra-filter-tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 2px 8px;
        border: 1px solid #d3ccb8;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.65);
      }

      .lepra-filter-tag button,
      .${CONFIG.controlClass},
      .${CONFIG.placeholderClass} button {
        margin: 0;
        padding: 0;
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
      }

      .lepra-filter-tag button {
        cursor: pointer;
        color: #8a4b3d;
      }

      .${CONFIG.controlClass} {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-left: 6px;
        color: #8f8777;
        white-space: nowrap;
        font-size: 12px;
        line-height: 1;
        vertical-align: baseline;
      }

      .${CONFIG.controlClass}[data-active-mode="mute"],
      .${CONFIG.controlClass}[data-active-mode="hide"] {
        color: #4d5d22;
      }

      .${CONFIG.controlClass} button {
        cursor: pointer;
        text-decoration: underline;
        color: inherit;
        line-height: 1;
      }

      .${CONFIG.controlClass} a {
        color: inherit;
        text-decoration: none;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        opacity: 0.62;
      }

      .${CONFIG.controlClass} .is-active {
        font-weight: bold;
        text-decoration: none;
        cursor: default;
        opacity: 1;
      }

      .${CONFIG.controlClass} .lepra-filter-divider {
        display: none;
      }

      .${CONFIG.controlClass} a:hover {
        opacity: 1;
      }

      .${CONFIG.controlClass} .lepra-filter-icon {
        width: 14px;
        height: 14px;
        display: block;
      }

      .${CONFIG.controlClass} .lepra-filter-icon * {
        stroke: currentColor;
        fill: none;
        stroke-width: 1.7;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .${CONFIG.controlClass} [data-action="mode-mute"] .lepra-filter-icon .lepra-filter-fill {
        fill: currentColor;
        stroke: none;
      }

      .${CONFIG.controlClass} [data-action="mode-hide"] .lepra-filter-icon .lepra-filter-fill {
        fill: currentColor;
        stroke: none;
      }

      .${CONFIG.controlClass}[data-active-mode="mute"] [data-action="mode-mute"],
      .${CONFIG.controlClass}[data-active-mode="hide"] [data-action="mode-hide"] {
        opacity: 1;
      }

      .${CONFIG.controlClass}[data-active-mode="mute"] [data-action="mode-mute"],
      .${CONFIG.controlClass}[data-active-mode="hide"] [data-action="mode-hide"] {
        color: #4d5d22;
      }

      .comment.lepra-mode-mute > .c_i,
      .comment.lepra-mode-hide > .c_i {
        background: rgba(245, 240, 229, 0.7);
        box-shadow: inset 3px 0 0 #d2c6aa;
      }

      #js-comments_holder .comment {
        margin: 0 0 8px !important;
        padding: 0 !important;
      }

      #js-comments_holder .comment > .c_i {
        padding-top: 0 !important;
        padding-bottom: 0 !important;
      }

      #js-comments_holder .comment .c_body {
        margin: 0 0 3px !important;
        padding-bottom: 0 !important;
      }

      #js-comments_holder .comment .c_footer {
        margin-top: 0 !important;
        padding-top: 0 !important;
      }

      .comment.lepra-mode-mute .c_body {
        max-height: 22px;
        overflow: hidden;
        position: relative;
        opacity: 0.72;
      }

      .comment.lepra-mode-mute .c_body::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 14px;
        background: linear-gradient(180deg, rgba(245, 240, 229, 0) 0%, rgba(245, 240, 229, 0.95) 100%);
      }

      .comment.lepra-mode-hide .c_body {
        display: none !important;
      }

      .${CONFIG.placeholderClass} {
        margin: 0 0 8px;
        padding: 7px 10px;
        border: 1px dashed #d6ccb3;
        background: #f9f6ed;
        color: #6b6253;
        font: 12px/1.35 Arial, sans-serif;
      }

      .${CONFIG.placeholderClass} button {
        cursor: pointer;
        color: #56682a;
        text-decoration: underline;
      }

      .lepra-comment-meta-badge {
        margin-left: 6px;
        padding: 0 5px;
        border: 1px solid #d4cab1;
        border-radius: 9px;
        background: #f6f1e3;
        color: #7d715b;
        font-size: 10px;
        line-height: 14px;
        vertical-align: middle;
      }
    `;

    document.head.appendChild(style);
  }

  function ensurePanel() {
    const holder = document.querySelector(SELECTORS.commentsHolder);
    if (!holder) return null;

    let panel = document.getElementById(CONFIG.panelId);
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = CONFIG.panelId;
    holder.parentNode.insertBefore(panel, holder);
    return panel;
  }

  function renderPanel() {
    const panel = ensurePanel();
    if (!panel) return;

    const hiddenUsers = Object.entries(state.users).sort((a, b) => {
      return (b[1]?.updatedAt || 0) - (a[1]?.updatedAt || 0);
    });
    const activeComments = getComments().filter((comment) => getUserState(comment.dataset.user_id));
    const stats = getUserStats();

    panel.classList.toggle("is-paused", state.ui.paused);

    const tagsMarkup = hiddenUsers.length
      ? hiddenUsers
          .map(([userId, userState]) => {
            const label = userState.login || userId;
            const modeLabel = userState.mode === CONFIG.modes.hide ? "hidden" : "mute";
            const userStats = stats.get(userId);
            const counters = userStats ? `${userStats.total} / media ${userStats.media}` : "";
            return `<span class="lepra-filter-tag" data-user-id="${escapeHtml(userId)}">
                <span>${escapeHtml(label)}</span>
                <span class="lepra-filter-panel-muted">${modeLabel}</span>
                <span class="lepra-filter-panel-muted">${escapeHtml(counters)}</span>
                <button type="button" data-action="clear-user" data-user-id="${escapeHtml(userId)}">x</button>
              </span>`;
          })
          .join("")
      : '<span class="lepra-filter-panel-muted">Пока никто не приглушён.</span>';

    panel.innerHTML = `
      <div class="lepra-filter-panel-row">
        <span class="lepra-filter-panel-title">Lepro Filter</span>
        <span class="lepra-filter-panel-muted">
          ${state.ui.paused ? "Фильтр на этой странице выключен." : `Активно авторов: ${hiddenUsers.length}, комментариев: ${activeComments.length}.`}
        </span>
        <a class="lepra-filter-panel-link" data-action="toggle-paused">${state.ui.paused ? "Включить фильтр" : "Поставить на паузу"}</a>
        <a class="lepra-filter-panel-link" data-action="show-all">Показать всех</a>
        <a class="lepra-filter-panel-link is-danger" data-action="clear-all">Сбросить список</a>
      </div>
      <div class="lepra-filter-panel-row">
        <div class="lepra-filter-tags">${tagsMarkup}</div>
      </div>
    `;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function ensureCommentControls(comment) {
    const footer = comment.querySelector(SELECTORS.commentFooter);
    const userLink = comment.querySelector(SELECTORS.userLink);

    if (!footer || !userLink) return;

    if (!comment.querySelector(`.${CONFIG.controlClass}`)) {
      const control = document.createElement("span");
      control.className = CONFIG.controlClass;
      control.innerHTML = `
        <a href="#" data-action="mode-mute" title="Приглушить комментарии автора">
          <svg class="lepra-filter-icon" viewBox="0 0 16 16" aria-hidden="true">
            <path class="lepra-filter-fill" d="M2 6h3l3-3v10l-3-3H2z"></path>
            <path d="M10.5 6.2c.8.5 1.3 1.2 1.3 1.8s-.5 1.3-1.3 1.8"></path>
          </svg>
        </a>
        <span class="lepra-filter-divider">/</span>
        <a href="#" data-action="mode-hide" title="Скрыть комментарии автора">
          <svg class="lepra-filter-icon" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M1.5 8s2.2-3.5 6.5-3.5S14.5 8 14.5 8 12.3 11.5 8 11.5 1.5 8 1.5 8z"></path>
            <circle class="lepra-filter-fill" cx="8" cy="8" r="1.6"></circle>
            <path d="M3 13 13 3"></path>
          </svg>
        </a>
      `;
      userLink.insertAdjacentElement("afterend", control);
    }

    const body = comment.querySelector(SELECTORS.commentBody);
    if (body && commentHasMedia(comment) && !comment.querySelector(".lepra-comment-meta-badge")) {
      const badge = document.createElement("span");
      badge.className = "lepra-comment-meta-badge";
      badge.textContent = "media";
      body.insertAdjacentElement("afterbegin", badge);
    }

    comment.classList.add(CONFIG.processedClass);
  }

  function ensurePlaceholder(comment) {
    let placeholder = comment.querySelector(`.${CONFIG.placeholderClass}`);

    if (!placeholder) {
      placeholder = document.createElement("div");
      placeholder.className = CONFIG.placeholderClass;
      placeholder.hidden = true;

      const body = comment.querySelector(SELECTORS.commentBody);
      if (body) {
        body.insertAdjacentElement("beforebegin", placeholder);
      }
    }

    return placeholder;
  }

  function renderPlaceholder(comment, mode, userState) {
    const placeholder = ensurePlaceholder(comment);
    if (!placeholder) return;

    const login = comment.dataset.user_login || userState?.login || comment.dataset.user_id || "unknown";
    const mediaNote = commentHasMedia(comment) ? " Есть медиа." : "";

    if (mode === CONFIG.modes.hide) {
      placeholder.hidden = false;
      placeholder.innerHTML = `
        Комментарий <strong>${escapeHtml(login)}</strong> скрыт.${mediaNote}
        <button type="button" data-action="show-comment">Показать</button>
      `;
    } else if (mode === CONFIG.modes.mute) {
      placeholder.hidden = false;
      placeholder.innerHTML = `
        Комментарий <strong>${escapeHtml(login)}</strong> приглушён.${mediaNote}
        <button type="button" data-action="expand-comment">Развернуть</button>
      `;
    } else {
      placeholder.hidden = true;
      placeholder.innerHTML = "";
    }
  }

  function applyCommentState(comment) {
    ensureCommentControls(comment);

    const userId = comment.dataset.user_id;
    const userState = getUserState(userId);
    const mode = !state.ui.paused && userState ? userState.mode : null;
    const control = comment.querySelector(`.${CONFIG.controlClass}`);
    const body = comment.querySelector(SELECTORS.commentBody);

    comment.classList.remove("lepra-mode-mute", "lepra-mode-hide", "lepra-comment-expanded");

    if (control) {
      control.dataset.activeMode = mode || "";
      control.querySelectorAll("[data-action]").forEach((actionNode) => {
        const targetMode = actionNode.dataset.action === "mode-hide" ? CONFIG.modes.hide : CONFIG.modes.mute;
        actionNode.classList.toggle("is-active", targetMode === mode);
      });
    }

    if (body) {
      body.style.maxHeight = "";
      body.style.overflow = "";
      body.style.opacity = "";
    }

    renderPlaceholder(comment, mode, userState);

    if (mode === CONFIG.modes.mute) {
      comment.classList.add("lepra-mode-mute");
    }

    if (mode === CONFIG.modes.hide) {
      comment.classList.add("lepra-mode-hide");
    }
  }

  function applyAllComments() {
    getComments().forEach(applyCommentState);
    renderPanel();
  }

  function cycleMode(userId, login, nextMode) {
    const currentMode = getUserState(userId)?.mode || null;
    const mode = currentMode === nextMode ? null : nextMode;
    setUserState(userId, login, mode);
    applyAllComments();
  }

  function clearAllUsers() {
    state.users = {};
    writeState(state);
    applyAllComments();
  }

  function temporarilyShowComment(comment) {
    const placeholder = comment.querySelector(`.${CONFIG.placeholderClass}`);
    comment.classList.remove("lepra-mode-hide", "lepra-mode-mute");
    comment.classList.add("lepra-comment-expanded");
    if (placeholder) {
      placeholder.hidden = true;
    }
    const body = comment.querySelector(SELECTORS.commentBody);
    if (body) {
      body.style.display = "";
      body.style.maxHeight = "";
      body.style.overflow = "";
      body.style.opacity = "";
    }
  }

  function handleDocumentClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;

    if (action === "mode-mute" || action === "mode-hide") {
      const comment = target.closest(SELECTORS.comment);
      if (!comment) return;

      event.preventDefault();
      const { user_id: userId, user_login: login } = comment.dataset;
      cycleMode(userId, login, action === "mode-hide" ? CONFIG.modes.hide : CONFIG.modes.mute);
      return;
    }

    if (action === "show-comment" || action === "expand-comment") {
      const comment = target.closest(SELECTORS.comment);
      if (!comment) return;

      event.preventDefault();
      temporarilyShowComment(comment);
      return;
    }

    if (action === "toggle-paused") {
      event.preventDefault();
      setPaused(!state.ui.paused);
      applyAllComments();
      return;
    }

    if (action === "show-all") {
      event.preventDefault();
      setPaused(true);
      applyAllComments();
      return;
    }

    if (action === "clear-all") {
      event.preventDefault();
      clearAllUsers();
      return;
    }

    if (action === "clear-user") {
      event.preventDefault();
      const userId = target.dataset.userId;
      if (!userId) return;
      delete state.users[userId];
      writeState(state);
      applyAllComments();
    }
  }

  function initExistingComments() {
    getComments().forEach(ensureCommentControls);
    applyAllComments();
  }

  function observeComments() {
    const holder = document.querySelector(SELECTORS.commentsHolder);
    if (!holder) return;

    const observer = new MutationObserver((mutations) => {
      let shouldRefresh = false;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;

          if (node.matches?.(SELECTORS.comment)) {
            ensureCommentControls(node);
            applyCommentState(node);
            shouldRefresh = true;
          }

          node.querySelectorAll?.(SELECTORS.comment).forEach((comment) => {
            ensureCommentControls(comment);
            applyCommentState(comment);
            shouldRefresh = true;
          });
        });
      });

      if (shouldRefresh) {
        renderPanel();
      }
    });

    observer.observe(holder, { childList: true, subtree: true });
  }

  function boot() {
    createStyleTag();
    initExistingComments();
    observeComments();
    document.addEventListener("click", handleDocumentClick, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
