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

    const observer = new MutationObserver(() => {
      injectButton();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(injectButton, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
