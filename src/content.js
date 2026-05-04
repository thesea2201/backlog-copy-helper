(function() {
  'use strict';

  const COPY_BUTTON_ID = 'backlog-utils-copy-btn';
  const TRANSLATE_BTN_CLASS = 'backlog-utils-translate-btn';
  const TRANSLATED_BLOCK_CLASS = 'translated-block';

  // Cached i18n strings
  let i18nStrings = {};

  // Load i18n strings from background script
  async function loadI18nStrings() {
    const keys = [
      'copyButtonTitle', 'copyButtonText', 'copyNotyButtonTitle', 'copyNotyButtonText',
      'notificationCopied', 'notificationCopyFailed', 'notificationNoIssueInfo',
      'notificationOpeningNoty', 'notificationNoNotyFound', 'notificationNotyCopied',
      'notificationNotyCopyFailed', 'translateButtonTitle', 'translateButtonText',
      'translatingText', 'dropdownMoreOptions',       'menuForceRetranslate', 'menuUseGemini', 'menuUseChatGPT',
      'menuUseGoogle', 'translationMetaTranslatedBy', 'translationMetaCached',
      'translationHideLink', 'notificationTranslatedTo', 'notificationTranslationFailed',
      'notificationNoTextToTranslate', 'sourceGoogle', 'sourceGemini', 'sourceChatGPT',
      'issueTitleLabel', 'issueSummaryLabel',
      'langEnglish', 'langJapanese', 'langVietnamese', 'langSpanish', 'langFrench',
      'langGerman', 'langChinese', 'langKorean', 'langRussian', 'langPortuguese'
    ];

    try {
      const results = await Promise.all(
        keys.map(key =>
          chrome.runtime.sendMessage({ action: 'i18n', key })
            .then(res => ({ key, message: res?.message || key }))
        )
      );
      results.forEach(({ key, message }) => {
        i18nStrings[key] = message;
      });
    } catch (err) {
      console.error('Failed to load i18n strings:', err);
    }
  }

  // Helper to get i18n string
  function i18n(key, substitutions) {
    let message = i18nStrings[key] || key;
    if (substitutions) {
      substitutions.forEach((sub, i) => {
        message = message.replace(new RegExp(`\\$${i + 1}\\b`, 'g'), sub);
      });
    }
    return message;
  }

  const LANG_NAMES = {
    'en': i18n('langEnglish'),
    'ja': i18n('langJapanese'),
    'vi': i18n('langVietnamese'),
    'es': i18n('langSpanish'),
    'fr': i18n('langFrench'),
    'de': i18n('langGerman'),
    'zh': i18n('langChinese'),
    'ko': i18n('langKorean'),
    'ru': i18n('langRussian'),
    'pt': i18n('langPortuguese')
  };

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
      parts.push(`**${i18n('issueTitleLabel')}** ${issueTitle}`);
    }

    if (ticketSummary) {
      parts.push(`**${i18n('issueSummaryLabel')}** ${ticketSummary}`);
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
      showNotification(i18n('notificationNoIssueInfo'), 'error');
      return;
    }

    const markdown = formatMarkdown(issueKey, issueTitle, ticketSummary);
    const success = await copyToClipboard(markdown);

    if (success) {
      showNotification(i18n('notificationCopied'));
    } else {
      showNotification(i18n('notificationCopyFailed'), 'error');
    }
  }

  function createCopyButton() {
    const existingBtn = document.getElementById(COPY_BUTTON_ID);
    if (existingBtn) return existingBtn;

    const button = document.createElement('button');
    button.id = COPY_BUTTON_ID;
    button.className = 'backlog-utils-copy-btn';
    button.title = i18n('copyButtonTitle');
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span>${i18n('copyButtonText')}</span>
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
    // Look for various panel selectors - the scroll container or its parent
    const panel = document.querySelector('#globalNotificationsContainer, .slide-in--notifications, .slide-in.global-nav-content.-notifications, .notifications-panel, [data-testid="notificationsPanel"]');
    const scrollContainer = document.querySelector('.slide-in__content--notifications, .js-notifications-content, .notifications-content, #globalNotificationsContainer .slide-in__content');
    const container = scrollContainer || panel;
    return container && container.offsetParent !== null;
  }

  function findNotifications() {
    // Open panel if not already open
    if (!isNotificationsPanelOpen()) {
      openNotificationsPanel();
    }

    // Find the scrollable container - search directly in document
    // The scroll container might not be inside a specific panel element
    const scrollContainer = document.querySelector('#globalNotificationsContainer .slide-in__content--notifications, .slide-in__content--notifications, .js-notifications-content, #globalNotificationsContainer .slide-in__content, .notifications-content') ||
                           document.querySelector('#globalNotificationsContainer') ||
                           document.querySelector('.slide-in .notification-list')?.closest('.slide-in__content, .slide-in') ||
                           document.querySelector('.notification-list')?.parentElement;

    // Scroll to load all items (lazy loading/virtual scroll)
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    console.log('[Backlog Utils] findNotifications - scrollContainer:', scrollContainer);
    console.log('[Backlog Utils] scrollContainer scrollHeight:', scrollContainer?.scrollHeight);
    console.log('[Backlog Utils] scrollContainer clientHeight:', scrollContainer?.clientHeight);
    console.log('[Backlog Utils] isNotificationsPanelOpen():', isNotificationsPanelOpen());

    // Re-open panel if it closed during the wait
    if (!isNotificationsPanelOpen()) {
      console.log('[Backlog Utils] Panel closed, re-opening...');
      openNotificationsPanel();
      // Wait for panel to re-open and render in DOM
      const start = Date.now();
      while (Date.now() - start < 800) {}
    }

    // Try finding scroll container again after potential re-open
    const scrollContainerRetry = document.querySelector('#globalNotificationsContainer .slide-in__content--notifications, .slide-in__content--notifications, .js-notifications-content, #globalNotificationsContainer .slide-in__content, .notifications-content') ||
                                 document.querySelector('#globalNotificationsContainer');
    const finalScrollContainer = scrollContainer || scrollContainerRetry;
    if (!scrollContainer && scrollContainerRetry) {
      console.log('[Backlog Utils] Found scroll container after retry');
    }

    // Log notification items found
    const allItems = document.querySelectorAll('.notification-list__item, .notification-item');
    console.log('[Backlog Utils] Total notification items in DOM:', allItems.length);

    if (finalScrollContainer) {
      // Scroll to bottom in chunks to trigger lazy loading
      let previousScrollHeight = 0;
      let scrollAttempts = 0;
      const maxAttempts = 10;
      let foundPrevMonth = false;

      while (scrollAttempts < maxAttempts && !foundPrevMonth) {
        const currentScrollHeight = finalScrollContainer.scrollHeight;
        console.log(`[Backlog Utils] Scroll attempt ${scrollAttempts + 1}: scrollHeight=${currentScrollHeight}, previous=${previousScrollHeight}`);

        if (currentScrollHeight === previousScrollHeight && scrollAttempts > 0) {
          console.log('[Backlog Utils] No new content loaded, stopping scroll');
          break;
        }
        previousScrollHeight = currentScrollHeight;
        finalScrollContainer.scrollTop = currentScrollHeight;
        console.log(`[Backlog Utils] Scrolled to: ${finalScrollContainer.scrollTop}`);
        scrollAttempts++;
        // Small delay to allow lazy loading to trigger
        const start = Date.now();
        while (Date.now() - start < 150) {} // Busy wait ~150ms

        // Check if we've scrolled to previous month records
        const visibleItems = finalScrollContainer.querySelectorAll('.notification-list__item, .notification-item');
        console.log(`[Backlog Utils] Visible items after scroll: ${visibleItems.length}`);
        for (const item of visibleItems) {
          const timeEl = item.querySelector('.js-notification-time, .notification-time');
          if (timeEl && timeEl.title) {
            const itemDate = new Date(timeEl.title);
            console.log(`[Backlog Utils] Item date: ${timeEl.title} -> month=${itemDate.getMonth()}, year=${itemDate.getFullYear()} (checking against ${curMonth}/${curYear})`);
            if (itemDate.getMonth() !== curMonth || itemDate.getFullYear() !== curYear) {
              console.log('[Backlog Utils] Found previous month item, stopping scroll');
              foundPrevMonth = true;
              break;
            }
          }
        }
      }

      // Scroll back to top to ensure we capture all items
      finalScrollContainer.scrollTop = 0;
      console.log('[Backlog Utils] Scrolled back to top');
    } else {
      console.log('[Backlog Utils] No scroll container found!');
    }

    // Wait a bit for panel to render after scrolling
    const items = document.querySelectorAll('.notification-list__item, .notification-item');
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
      lines.push(`${key} ${title}\t${status}\t${dateStr}`);
    });

    return lines.join('\n');
  }

  async function handleCopyNotyClick(e) {
    e.preventDefault();
    e.stopPropagation();

    // Open panel if not already open (avoid toggling it closed)
    if (!isNotificationsPanelOpen()) {
      openNotificationsPanel();
    }
    showNotification(i18n('notificationOpeningNoty'));

    // Wait for panel to open and items to render
    setTimeout(async () => {
      const text = findNotifications();
      if (!text) {
        showNotification(i18n('notificationNoNotyFound'), 'error');
        return;
      }
      const success = await copyToClipboard(text);
      if (success) {
        showNotification(i18n('notificationNotyCopied'));
      } else {
        showNotification(i18n('notificationNotyCopyFailed'), 'error');
      }
    }, 500);
  }

  function createNotyButton() {
    if (document.getElementById(NOTY_BUTTON_ID)) return document.getElementById(NOTY_BUTTON_ID);
    const btn = document.createElement('button');
    btn.id = NOTY_BUTTON_ID;
    btn.className = 'backlog-utils-copy-noty-btn';
    btn.title = i18n('copyNotyButtonTitle');
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg> <span>${i18n('copyNotyButtonText')}</span>`;
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

  // Injection guard to prevent infinite loops from MutationObserver
  let isInjecting = false;

  function runInjection() {
    if (isInjecting) return;
    isInjecting = true;
    try {
      injectButton();
      injectNotyButton();
      injectTranslateButtons();
    } finally {
      isInjecting = false;
    }
  }

  // Debounce helper to prevent performance issues during rapid DOM mutations
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  async function init() {
    // Load i18n strings first
    await loadI18nStrings();
    // Initial injection
    runInjection();

    // Debounced injection for mutations - prevents freeze during page load
    const debouncedInject = debounce(() => {
      runInjection();
    }, 250);

    const observer = new MutationObserver((mutations) => {
      // Only react to mutations that might add new content, not our own button insertions
      const hasMeaningfulChanges = mutations.some(mutation => {
        // Check if any added nodes are elements (not just our buttons)
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Ignore if it's our own button
            if (node.classList?.contains(TRANSLATE_BTN_CLASS)) continue;
            if (node.classList?.contains('backlog-utils-copy-btn')) continue;
            if (node.id === COPY_BUTTON_ID) continue;
            // Found a meaningful element addition
            return true;
          }
        }
        return false;
      });

      if (hasMeaningfulChanges) {
        debouncedInject();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also run after a delay to catch any missed elements
    setTimeout(runInjection, 1000);
  }

  // --- Translation feature ---

  function createTranslateButton() {
    const button = document.createElement('button');
    button.className = TRANSLATE_BTN_CLASS;
    button.title = i18n('translateButtonTitle');
    button.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
      <span>${i18n('translateButtonText')}</span>
    `;
    return button;
  }

  function createTranslateButtonWithDropdown(contentEl) {
    const wrapper = document.createElement('span');
    wrapper.className = 'backlog-utils-translate-wrapper';
    // position: relative is crucial so the dropdown menu positions relative to this wrapper
    wrapper.style.cssText = 'display: inline-flex; align-items: center; gap: 2px; position: relative; vertical-align: middle;';

    const btn = createTranslateButton();
    btn.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        // Force re-translate
        handleTranslateClick(e, contentEl, true);
      } else {
        // Normal translate (uses cache)
        handleTranslateClick(e, contentEl, false);
      }
    });

    const dropdownBtn = document.createElement('button');
    dropdownBtn.className = TRANSLATE_BTN_CLASS + ' dropdown';
    dropdownBtn.title = i18n('dropdownMoreOptions');
    dropdownBtn.style.cssText = 'padding: 2px 4px; margin-left: 0;';
    dropdownBtn.innerHTML = `
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;

    const menu = document.createElement('div');
    menu.className = 'backlog-utils-translate-menu';
    menu.style.cssText = `
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
      min-width: 160px;
      padding: 4px 0;
    `;
    menu.innerHTML = `
      <div class="menu-item" data-action="force" style="padding: 8px 12px; cursor: pointer; font-size: 12px; color: #333; hover: background: #f5f5f5;">
        🔄 ${i18n('menuForceRetranslate')}
      </div>
      <div class="menu-item" data-action="gemini" style="padding: 8px 12px; cursor: pointer; font-size: 12px; color: #333; hover: background: #f5f5f5;">
        ✨ ${i18n('menuUseGemini')}
      </div>
      <div class="menu-item" data-action="chatgpt" style="padding: 8px 12px; cursor: pointer; font-size: 12px; color: #333; hover: background: #f5f5f5;">
        🤖 ${i18n('menuUseChatGPT')}
      </div>
      <div class="menu-item" data-action="google" style="padding: 8px 12px; cursor: pointer; font-size: 12px; color: #333; hover: background: #f5f5f5;">
        🔤 ${i18n('menuUseGoogle')}
      </div>
    `;

    // Hover styles via inline events since we can't add CSS easily
    menu.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        item.style.background = '#f5f5f5';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'white';
      });
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.style.display = 'none';
        const action = item.dataset.action;
        handleTranslateClick(e, contentEl, action === 'force', action === 'gemini' ? 'gemini' : action === 'chatgpt' ? 'chatgpt' : action === 'google' ? 'google' : null);
      });
    });

    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const isVisible = menu.style.display === 'block';
      // Close all other menus
      document.querySelectorAll('.backlog-utils-translate-menu').forEach(m => m.style.display = 'none');
      menu.style.display = isVisible ? 'none' : 'block';
    });

    // Close menu when clicking outside
    document.addEventListener('click', () => {
      menu.style.display = 'none';
    });

    wrapper.appendChild(btn);
    wrapper.appendChild(dropdownBtn);
    wrapper.appendChild(menu);

    return { wrapper, btn };
  }

  function showTranslatedBlock(originalElement, translatedText, button, targetLang = 'en', source = 'google') {
    // Check if already translated
    const existingBlock = originalElement.parentElement.querySelector('.' + TRANSLATED_BLOCK_CLASS);
    if (existingBlock) {
      existingBlock.remove();
      return;
    }

    const langName = LANG_NAMES[targetLang] || targetLang;
    const isCached = source.includes('(cached)');
    const baseSource = source.replace(' (cached)', '');
    let sourceName;
    if (baseSource === 'gemini') {
      sourceName = i18n('sourceGemini');
    } else if (baseSource === 'chatgpt') {
      sourceName = i18n('sourceChatGPT');
    } else {
      sourceName = i18n('sourceGoogle');
    }
    const cacheIndicator = isCached ? i18n('translationMetaCached') : '';

    const block = document.createElement('div');
    block.className = TRANSLATED_BLOCK_CLASS;
    if (isCached) {
      block.classList.add('cached');
    }
    const translatedByText = i18n('translationMetaTranslatedBy', [sourceName + cacheIndicator, langName]);
    block.innerHTML = `
      <div class="translated-content">${escapeHtml(translatedText).replace(/\n\n/g, '<br><br>')}</div>
      <div class="translation-meta">
        <span class="translation-source">${translatedByText}</span>
        <a href="#" class="remove-translation">${i18n('translationHideLink')}</a>
      </div>
    `;

    // Insert after the original element's parent or the original element itself
    const insertAfter = originalElement.closest('.comment-item__container, .ticket__article, .markdown-body') || originalElement;
    insertAfter.insertAdjacentElement('afterend', block);

    // Handle remove link
    block.querySelector('.remove-translation').addEventListener('click', (e) => {
      e.preventDefault();
      block.remove();
      button.classList.remove('active');
    });

    button.classList.add('active');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function handleTranslateClick(e, targetElement, force = false, engine = null) {
    e.preventDefault();
    e.stopPropagation();

    const button = e.currentTarget;

    // Show loading state
    button.disabled = true;
    button.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg> <span>${i18n('translatingText')}</span>`;

    try {
      // Debug: log what we're working with
      console.log('Translate click - targetElement:', targetElement.tagName, targetElement.className);
      console.log('Force re-translate:', force);
      console.log('Engine preference:', engine);

      const clone = targetElement.cloneNode(true);
      // Remove all translation-related UI elements
      clone.querySelectorAll('.' + TRANSLATE_BTN_CLASS).forEach(el => el.remove());
      clone.querySelectorAll('.backlog-utils-translate-wrapper').forEach(el => el.remove());
      clone.querySelectorAll('.backlog-utils-translate-menu').forEach(el => el.remove());

      // innerText on detached nodes may not work, use textContent
      const plainText = (clone.textContent || '').trim();
      console.log('Extracted plainText length:', plainText.length);
      console.log('Extracted plainText:', plainText.substring(0, 200));

      if (!plainText || plainText.length < 2) {
        showNotification(i18n('notificationNoTextToTranslate'), 'error');
        return;
      }

      const response = await chrome.runtime.sendMessage({
        action: 'translate',
        text: plainText,
        force,
        engine
      });

      if (response.success) {
        showTranslatedBlock(targetElement, response.text, button, response.targetLang, response.source);
        showNotification(i18n('notificationTranslatedTo', [LANG_NAMES[response.targetLang] || response.targetLang]), 'success');
      } else {
        showNotification(response.error || i18n('notificationTranslationFailed'), 'error');
      }
    } catch (err) {
      console.error('Translation error:', err);
      showNotification(i18n('notificationTranslationFailed') + ': ' + err.message, 'error');
    } finally {
      // Restore button
      button.disabled = false;
      button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        <span>${i18n('translateButtonText')}</span>
      `;
    }
  }

  function injectTranslateButtons() {
    // Inject at top of comment items
    const commentContainers = document.querySelectorAll('.comment-item__container.js_comment-container');
    commentContainers.forEach(container => {
      if (container.querySelector('.' + TRANSLATE_BTN_CLASS)) return;

      const contentEl = container.querySelector('.comment-item__content, .markdown-body');
      if (!contentEl) return;

      const { wrapper, btn } = createTranslateButtonWithDropdown(contentEl);

      // Insert at the top of the container
      const header = container.querySelector('.comment-item__header, .comment-header');
      if (header) {
        header.style.position = 'relative';
        header.appendChild(wrapper);
      } else {
        container.insertBefore(wrapper, container.firstChild);
      }
    });

    // Inject at top of ticket articles
    const ticketArticles = document.querySelectorAll('.ticket__article');
    ticketArticles.forEach(article => {
      if (article.querySelector('.' + TRANSLATE_BTN_CLASS)) return;

      const contentEl = article.querySelector('.markdown-body, .article-content');
      if (!contentEl) return;

      const { wrapper, btn } = createTranslateButtonWithDropdown(contentEl);

      // Insert at the top
      const header = article.querySelector('.ticket__article-header, .article-header');
      if (header) {
        header.style.position = 'relative';
        header.appendChild(wrapper);
      } else {
        article.insertBefore(wrapper, article.firstChild);
      }
    });

    // Inject after issueDescription
    const issueDesc = document.getElementById('issueDescription');
    if (issueDesc) {
      // Check if button already exists as next sibling (since we insert afterend)
      const nextEl = issueDesc.nextElementSibling;
      const hasButton = nextEl && (nextEl.classList?.contains(TRANSLATE_BTN_CLASS) || nextEl.querySelector('.' + TRANSLATE_BTN_CLASS));
      if (!hasButton) {
        const contentEl = issueDesc.querySelector('.markdown-body') || issueDesc;
        // Skip if no actual text content to translate
        const textContent = contentEl.textContent?.trim();
        if (!textContent || textContent.length < 2) return;
        const { wrapper, btn } = createTranslateButtonWithDropdown(contentEl);
        issueDesc.insertAdjacentElement('afterend', wrapper);
      }
    }

    // Inject for loom comment-content elements that have text
    const loomContents = document.querySelectorAll('.loom.comment-content');
    loomContents.forEach(contentEl => {
      // Skip if already has translate button or no text
      if (contentEl.querySelector('.' + TRANSLATE_BTN_CLASS)) return;
      const textContent = contentEl.textContent?.trim();
      if (!textContent || textContent.length < 2) return;

      const { wrapper, btn } = createTranslateButtonWithDropdown(contentEl);

      // Insert at the beginning of the content element
      contentEl.insertBefore(wrapper, contentEl.firstChild);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
