(function() {
  'use strict';

  const COPY_BUTTON_ID = 'backlog-utils-copy-btn';

  function findIssueKey() {
    const issueKeyEl = document.querySelector('[data-testid="issueKey"]');
    return issueKeyEl ? issueKeyEl.textContent.trim() : null;
  }

  function findIssueTitle() {
    const summaryEl = document.querySelector('[data-testid="issueSummary"] .markdown-body');
    if (summaryEl) {
      return summaryEl.textContent.trim();
    }
    const titleEl = document.querySelector('[data-testid="issueSummary"]');
    return titleEl ? titleEl.textContent.trim() : null;
  }

  function findTicketSummary() {
    const summaryEl = document.querySelector('.ticket__collapsed-summary');
    return summaryEl ? summaryEl.textContent.trim() : null;
  }

  function formatMarkdown(issueKey, issueTitle, ticketSummary) {
    const parts = [];
    
    if (issueKey) {
      parts.push(`**${issueKey}**`);
    }
    
    if (issueTitle) {
      parts.push(`**Title:** ${issueTitle}`);
    }
    
    if (ticketSummary) {
      parts.push(`**Summary:** ${ticketSummary}`);
    }
    
    return parts.join('\n\n');
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      return false;
    }
  }

  function showNotification(message, type = 'success') {
    const existing = document.querySelector('.backlog-utils-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `backlog-utils-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  async function handleCopyClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const issueKey = findIssueKey();
    const issueTitle = findIssueTitle();
    const ticketSummary = findTicketSummary();

    if (!issueKey && !issueTitle && !ticketSummary) {
      showNotification('Could not find issue information', 'error');
      return;
    }

    const markdown = formatMarkdown(issueKey, issueTitle, ticketSummary);
    const success = await copyToClipboard(markdown);

    if (success) {
      showNotification('Copied to clipboard!');
    } else {
      showNotification('Failed to copy', 'error');
    }
  }

  function createCopyButton() {
    const existingBtn = document.getElementById(COPY_BUTTON_ID);
    if (existingBtn) return existingBtn;

    const button = document.createElement('button');
    button.id = COPY_BUTTON_ID;
    button.className = 'backlog-utils-copy-btn';
    button.title = 'Copy issue key, title & summary (markdown)';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span>Copy MD</span>
    `;
    button.addEventListener('click', handleCopyClick);

    return button;
  }

  // --- Notification copy feature ---
  const NOTY_BUTTON_ID = 'backlog-utils-copy-noty-btn';

  function openNotificationsPanel() {
    const notifLink = document.querySelector('.globalNotificationsLink, .notifications-link, [data-testid="notificationsLink"]');
    if (notifLink) {
      notifLink.click();
      return true;
    }
    return false;
  }

  function isNotificationsPanelOpen() {
    const panel = document.querySelector('.slide-in--notifications, .notifications-panel, [data-testid="notificationsPanel"]');
    return panel && panel.offsetParent !== null;
  }

  function findNotifications() {
    // Open panel if not already open
    if (!isNotificationsPanelOpen()) {
      openNotificationsPanel();
    }

    // Wait a bit for panel to render
    const items = document.querySelectorAll('.notification-list__item, .notification-item');
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    const seen = new Set();
    const lines = [];

    items.forEach(item => {
      // Get date from time element
      const timeEl = item.querySelector('.js-notification-time, .notification-time');
      if (!timeEl || !timeEl.title) return;
      const date = new Date(timeEl.title);
      if (date.getMonth() !== curMonth || date.getFullYear() !== curYear) return;

      // Get issue key from .notification-list__summary .key
      const summaryEl = item.querySelector('.notification-list__summary, .notification-summary');
      const keyEl = summaryEl ? summaryEl.querySelector('.key') : null;
      const key = keyEl ? keyEl.textContent.trim() : '';

      // Get issue title from .notification-list__summary span (the text after key)
      const spans = summaryEl ? summaryEl.querySelectorAll('span') : [];
      let title = '';
      for (const span of spans) {
        if (!span.classList.contains('key')) {
          title = span.textContent.trim();
          break;
        }
      }

      // Get status
      const statusEl = item.querySelector('.status');
      const status = statusEl ? statusEl.textContent.trim() : '';

      // Deduplicate by key + title
      const uniqueKey = key + '|' + title;
      if (!key || seen.has(uniqueKey)) return;
      seen.add(uniqueKey);

      // Format: Key, Title, Status, Date
      const dateStr = date.toISOString().split('T')[0];
      lines.push(`${key}\t${title}\t${status}\t${dateStr}`);
    });

    return lines.join('\n');
  }

  async function handleCopyNotyClick(e) {
    e.preventDefault();
    e.stopPropagation();

    // Open panel and wait for it to render
    openNotificationsPanel();
    showNotification('Opening notifications panel...');

    // Wait for panel to open and items to render
    setTimeout(async () => {
      const text = findNotifications();
      if (!text) {
        showNotification('No notifications for current month found', 'error');
        return;
      }
      const success = await copyToClipboard(text);
      if (success) {
        showNotification('Copied notifications to clipboard!');
      } else {
        showNotification('Failed to copy notifications', 'error');
      }
    }, 800);
  }

  function createNotyButton() {
    if (document.getElementById(NOTY_BUTTON_ID)) return document.getElementById(NOTY_BUTTON_ID);
    const btn = document.createElement('button');
    btn.id = NOTY_BUTTON_ID;
    btn.className = 'backlog-utils-copy-noty-btn';
    btn.title = 'Copy notifications (Key, Title, Status, Date) - auto-opens panel';
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg> <span>Copy Noty</span>`;
    btn.addEventListener('click', handleCopyNotyClick);
    return btn;
  }

  function injectNotyButton() {
    // Look for the global notifications link in header
    const notifLink = document.querySelector('.globalNotificationsLink, .notifications-link, [data-testid="notificationsLink"]');
    if (!notifLink) return;
    const parent = notifLink.parentElement;
    if (!parent) return;
    if (document.getElementById(NOTY_BUTTON_ID)) return;
    const btn = createNotyButton();
    parent.appendChild(btn);
  }

  function injectButton() {
    const issueKeyEl = document.querySelector('[data-testid="issueKey"]');
    if (!issueKeyEl) return;

    const parent = issueKeyEl.parentElement;
    if (!parent) return;

    if (document.getElementById(COPY_BUTTON_ID)) return;

    const button = createCopyButton();
    parent.appendChild(button);
  }

  function init() {
    injectButton();
    injectNotyButton();

    const observer = new MutationObserver(() => {
      injectButton();
      injectNotyButton();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(injectButton, 1000);
    setTimeout(injectNotyButton, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
