(function() {
  'use strict';

  const DEFAULT_LANG = 'en';
  const STORAGE_KEY = 'backlogUtilsTargetLang';
  const CACHE_DURATION_KEY = 'backlogUtilsCacheDuration';
  const CUSTOM_PROMPT_KEY = 'backlogUtilsCustomPrompt';
  const DEFAULT_ENGINE_KEY = 'backlogUtilsDefaultEngine';
  const DEFAULT_CACHE_DAYS = -1; // -1 = never cache (default)
  const CACHE_PREFIX = 'translation_cache_';

  // Helper to get i18n message
  function i18n(messageName, substitutions) {
    return chrome.i18n.getMessage(messageName, substitutions);
  }

  // Translate all elements with data-i18n attribute
  function translateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translation = i18n(key);
      if (translation) {
        // For input elements, update value or placeholder
        if (el.tagName === 'INPUT' && el.type === 'submit') {
          el.value = translation;
        } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = translation;
        } else {
          el.textContent = translation;
        }
      }
    });
  }

  // Default prompt for technical translation (preserves engineering terminology)
  const DEFAULT_CUSTOM_PROMPT = `Translate the following text to {lang}.
- Keep technical terms, programming concepts, and engineering vocabulary in English
- Use professional, formal tone
- Only return the translation, no explanations, no apologies, no comments`;

  async function loadSettings() {
  // After settings are loaded we also render the list of cached translations
  renderCacheList();
    try {
      const result = await chrome.storage.sync.get([STORAGE_KEY, CACHE_DURATION_KEY, CUSTOM_PROMPT_KEY, DEFAULT_ENGINE_KEY]);
      const lang = result[STORAGE_KEY] || DEFAULT_LANG;
      const cacheDays = result[CACHE_DURATION_KEY] ?? DEFAULT_CACHE_DAYS;
      const customPrompt = result[CUSTOM_PROMPT_KEY] || DEFAULT_CUSTOM_PROMPT;
      const defaultEngine = result[DEFAULT_ENGINE_KEY] || 'gemini';
      document.getElementById('targetLang').value = lang;
      document.getElementById('cacheDuration').value = String(cacheDays);
      document.getElementById('customPrompt').value = customPrompt;
      document.getElementById('defaultEngine').value = defaultEngine;
      updateCacheStats();
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  async function saveSettings(lang) {
    try {
      await chrome.storage.sync.set({ [STORAGE_KEY]: lang });
      showStatus(i18n('statusSaved'));
    } catch (err) {
      console.error('Failed to save settings:', err);
      showStatus(i18n('statusError'), true);
    }
  }

  async function saveCacheDuration(days) {
    try {
      await chrome.storage.sync.set({ [CACHE_DURATION_KEY]: parseInt(days, 10) });
      showStatus(i18n('statusCacheSaved'));
      updateCacheStats(); // Refresh stats display
    } catch (err) {
      console.error('Failed to save cache duration:', err);
      showStatus(i18n('statusError'), true);
    }
  }

  async function saveCustomPrompt(prompt) {
    try {
      await chrome.storage.sync.set({ [CUSTOM_PROMPT_KEY]: prompt });
      showStatus(i18n('statusPromptSaved'));
    } catch (err) {
      console.error('Failed to save custom prompt:', err);
      showStatus(i18n('statusError'), true);
    }
  }

  async function saveDefaultEngine(engine) {
    try {
      await chrome.storage.sync.set({ [DEFAULT_ENGINE_KEY]: engine });
      showStatus(i18n('statusSaved'));
    } catch (err) {
      console.error('Failed to save default engine:', err);
      showStatus(i18n('statusError'), true);
    }
  }

  async function updateCacheStats() {
  // Update cache statistics (count) displayed in the UI
  // Existing logic remains unchanged

    try {
      const result = await chrome.storage.sync.get([CACHE_DURATION_KEY]);
      const days = result[CACHE_DURATION_KEY] ?? DEFAULT_CACHE_DAYS;
      const statsEl = document.getElementById('cacheStats');

      if (days === -1) {
        statsEl.textContent = i18n('cachingDisabled');
        return;
      }

      const all = await chrome.storage.local.get(null);
      const cacheKeys = Object.keys(all).filter(k => k.startsWith(CACHE_PREFIX));
      const count = cacheKeys.length;
      if (count === 0) {
        statsEl.textContent = i18n('noCachedTranslations');
      } else {
        const plural = count > 1 ? 's' : '';
        statsEl.textContent = i18n('cachedTranslationsCount', [String(count), plural]);
      }
    } catch (err) {
      console.error('Failed to update cache stats:', err);
    }
  }

  async function clearAllCache() {
    if (!confirm(i18n('confirmClearCache'))) {
      return;
    }

    try {
      const all = await chrome.storage.local.get(null);
      const cacheKeys = Object.keys(all).filter(k => k.startsWith(CACHE_PREFIX));
      if (cacheKeys.length === 0) {
        showStatus(i18n('statusNoCacheToClear'));
        return;
      }
      await chrome.storage.local.remove(cacheKeys);
      const plural = cacheKeys.length > 1 ? 's' : '';
      showStatus(i18n('statusCacheCleared', [String(cacheKeys.length), plural]));
      updateCacheStats();
    } catch (err) {
      console.error('Failed to clear cache:', err);
    }
  }

  // Render the list of cached translations in the popup
  async function renderCacheList() {
    const container = document.getElementById('cachedList');
    if (!container) return;
    container.innerHTML = '';
    try {
      const all = await chrome.storage.local.get(null);
      const cacheItems = Object.entries(all).filter(([k]) => k.startsWith(CACHE_PREFIX));
      if (cacheItems.length === 0) {
        container.textContent = i18n('noCachedTranslations');
        return;
      }
      const result = await chrome.storage.sync.get([CACHE_DURATION_KEY]);
      const days = result[CACHE_DURATION_KEY] ?? DEFAULT_CACHE_DAYS;
      const now = Date.now();
      cacheItems.forEach(([key, value]) => {
        const ageDays = (now - (value.timestamp || now)) / (1000 * 60 * 60 * 24);
        if (days !== -1 && ageDays > days) return; // respect cache duration setting
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cached-item';
        const src = value.sourceText || '';
        const trans = value.translatedText || '';
        const lang = value.targetLang || '';
        itemDiv.innerHTML = `
          <a href="#" data-key="${key}">✕</a>
          <strong>Lang:</strong> ${lang}<br>
          <strong>Source:</strong> ${src}<br>
          <strong>Translated:</strong> ${trans}
        `;
        container.appendChild(itemDiv);
        itemDiv.querySelector('a').addEventListener('click', (e) => {
          e.preventDefault();
          const k = e.target.getAttribute('data-key');
          chrome.storage.local.remove(k).then(() => {
            renderCacheList();
            updateCacheStats();
          });
        });
      });
    } catch (e) {
      console.error('Error rendering cache list:', e);
    }
  }

  async function resetGeminiChat() {
    if (!confirm(i18n('confirmResetGemini'))) {
      return;
    }

    try {
      const GEMINI_CHAT_KEY = 'backlogUtilsGeminiChatId';
      await chrome.storage.local.remove(GEMINI_CHAT_KEY);
      showStatus(i18n('statusGeminiReset'));
      console.log('Cleared Gemini chat ID');
    } catch (err) {
      console.error('Failed to reset Gemini chat:', err);
      showStatus(i18n('statusResetError'), true);
    }
  }

  async function resetChatGPTChat() {
    if (!confirm(i18n('confirmResetChatGPT'))) {
      return;
    }

    try {
      await chrome.runtime.sendMessage({ action: 'clearChatGPT' });
      showStatus(i18n('statusChatGPTReset'));
      console.log('Cleared ChatGPT chat URL');
    } catch (err) {
      console.error('Failed to reset ChatGPT chat:', err);
      showStatus(i18n('statusResetError'), true);
    }
  }

  function showStatus(message, isError = false) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = 'status' + (isError ? ' error' : '');
    statusEl.classList.add('show');
    setTimeout(() => {
      statusEl.classList.remove('show');
    }, 2000);
  }

  function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetId = tab.dataset.tab;

        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(`tab-${targetId}`).classList.add('active');
      });
    });
  }

  function init() {
    translateUI(); // Apply i18n translations first
    loadSettings();
    initTabs();

    document.getElementById('targetLang').addEventListener('change', (e) => {
      saveSettings(e.target.value);
    });

    document.getElementById('cacheDuration').addEventListener('change', (e) => {
      saveCacheDuration(e.target.value);
    });

    document.getElementById('clearCacheBtn').addEventListener('click', () => {
      clearAllCache();
    });

    document.getElementById('resetGeminiChatBtn').addEventListener('click', () => {
      resetGeminiChat();
    });

    document.getElementById('savePromptBtn').addEventListener('click', () => {
      const prompt = document.getElementById('customPrompt').value;
      saveCustomPrompt(prompt);
    });

    document.getElementById('defaultEngine').addEventListener('change', (e) => {
      saveDefaultEngine(e.target.value);
    });

    document.getElementById('resetChatGPTBtn').addEventListener('click', () => {
      resetChatGPTChat();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
