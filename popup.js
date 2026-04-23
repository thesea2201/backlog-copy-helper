(function() {
  'use strict';

  const DEFAULT_LANG = 'en';
  const STORAGE_KEY = 'backlogUtilsTargetLang';
  const CACHE_DURATION_KEY = 'backlogUtilsCacheDuration';
  const CUSTOM_PROMPT_KEY = 'backlogUtilsCustomPrompt';
  const DEFAULT_CACHE_DAYS = -1; // -1 = never cache (default)
  const CACHE_PREFIX = 'translation_cache_';
  
  // Default prompt for technical translation (preserves engineering terminology)
  const DEFAULT_CUSTOM_PROMPT = `Translate the following text to {lang}. 
- Keep technical terms, programming concepts, and engineering vocabulary in English
- Use professional, formal tone
- Only return the translation, no explanations, no apologies, no comments`;

  async function loadSettings() {
  // After settings are loaded we also render the list of cached translations
  renderCacheList();
    try {
      const result = await chrome.storage.sync.get([STORAGE_KEY, CACHE_DURATION_KEY, CUSTOM_PROMPT_KEY]);
      const lang = result[STORAGE_KEY] || DEFAULT_LANG;
      const cacheDays = result[CACHE_DURATION_KEY] ?? DEFAULT_CACHE_DAYS;
      const customPrompt = result[CUSTOM_PROMPT_KEY] || DEFAULT_CUSTOM_PROMPT;
      document.getElementById('targetLang').value = lang;
      document.getElementById('cacheDuration').value = String(cacheDays);
      document.getElementById('customPrompt').value = customPrompt;
      updateCacheStats();
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }

  async function saveSettings(lang) {
    try {
      await chrome.storage.sync.set({ [STORAGE_KEY]: lang });
      showStatus('Saved!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      showStatus('Error saving', true);
    }
  }

  async function saveCacheDuration(days) {
    try {
      await chrome.storage.sync.set({ [CACHE_DURATION_KEY]: parseInt(days, 10) });
      showStatus('Cache setting saved!');
      updateCacheStats(); // Refresh stats display
    } catch (err) {
      console.error('Failed to save cache duration:', err);
      showStatus('Error saving', true);
    }
  }

  async function saveCustomPrompt(prompt) {
    try {
      await chrome.storage.sync.set({ [CUSTOM_PROMPT_KEY]: prompt });
      showStatus('Custom prompt saved!');
    } catch (err) {
      console.error('Failed to save custom prompt:', err);
      showStatus('Error saving', true);
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
        statsEl.textContent = 'Caching disabled';
        return;
      }

      const all = await chrome.storage.local.get(null);
      const cacheKeys = Object.keys(all).filter(k => k.startsWith(CACHE_PREFIX));
      const count = cacheKeys.length;
      if (count === 0) {
        statsEl.textContent = 'No cached translations';
      } else {
        statsEl.textContent = `${count} translation${count > 1 ? 's' : ''} cached`;
      }
    } catch (err) {
      console.error('Failed to update cache stats:', err);
    }
  }

  async function clearAllCache() {
    if (!confirm('Are you sure you want to clear all cached translations?\n\nThis cannot be undone.')) {
      return;
    }

    try {
      const all = await chrome.storage.local.get(null);
      const cacheKeys = Object.keys(all).filter(k => k.startsWith(CACHE_PREFIX));
      if (cacheKeys.length === 0) {
        showStatus('No cache to clear');
        return;
      }
      await chrome.storage.local.remove(cacheKeys);
      showStatus(`Cleared ${cacheKeys.length} cached translation${cacheKeys.length > 1 ? 's' : ''}!`);
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
        container.textContent = 'No cached translations';
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
        itemDiv.style = 'border:1px solid #ddd;padding:6px;margin:4px 0;background:#fafafa;position:relative;';
        const src = value.sourceText || '';
        const trans = value.translatedText || '';
        const lang = value.targetLang || '';
        itemDiv.innerHTML = `
          <div><strong>Lang:</strong> ${lang}</div>
          <div><strong>Source:</strong> ${src}</div>
          <div><strong>Translated:</strong> ${trans}</div>
          <a href="#" style="position:absolute;top:4px;right:4px;color:#c00;" data-key="${key}">✕</a>
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
    if (!confirm('Reset Gemini chat session?\n\nThis will start a fresh chat next time you translate. The old chat history will remain in Gemini but won\'t be used.')) {
      return;
    }

    try {
      const GEMINI_CHAT_KEY = 'backlogUtilsGeminiChatId';
      await chrome.storage.local.remove(GEMINI_CHAT_KEY);
      showStatus('Gemini chat reset! Fresh chat will start next translation.');
      console.log('Cleared Gemini chat ID');
    } catch (err) {
      console.error('Failed to reset Gemini chat:', err);
      showStatus('Error resetting chat', true);
    }
  }

  function showStatus(message, isError = false) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.style.color = isError ? '#ef4444' : '#10b981';
    setTimeout(() => {
      statusEl.textContent = '';
    }, 2000);
  }

  function init() {
    loadSettings();

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
  }

  document.addEventListener('DOMContentLoaded', init);
})();
