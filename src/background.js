(function() {
  'use strict';

  // Rate limiting: max 5 requests per minute
  const RATE_LIMIT_MAX = 5;
  const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
  let requestTimestamps = [];

  function checkRateLimit() {
    const now = Date.now();
    // Remove timestamps older than the window
    requestTimestamps = requestTimestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    
    if (requestTimestamps.length >= RATE_LIMIT_MAX) {
      const oldestTimestamp = requestTimestamps[0];
      const waitMs = RATE_LIMIT_WINDOW_MS - (now - oldestTimestamp);
      return { allowed: false, waitMs };
    }
    
    requestTimestamps.push(now);
    return { allowed: true, waitMs: 0 };
  }

  // Translation cache: persist translations to avoid re-translating unchanged content
  const CACHE_PREFIX = 'translation_cache_';
  const DEFAULT_CACHE_DAYS = -1; // -1 = never cache (default)
  const CACHE_DURATION_KEY = 'backlogUtilsCacheDuration';

  // Simple hash function for text
  function hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  async function getCacheTtlMs() {
    try {
      const result = await chrome.storage.sync.get([CACHE_DURATION_KEY]);
      const days = result[CACHE_DURATION_KEY] ?? DEFAULT_CACHE_DAYS;
      if (days === -1) return null; // Never cache
      if (days === 0) return Infinity; // Forever
      return days * 24 * 60 * 60 * 1000;
    } catch (e) {
      return null; // Default to no cache on error
    }
  }

  async function getCachedTranslation(text, targetLang) {
    const ttlMs = await getCacheTtlMs();
    if (ttlMs === null) return null; // Caching disabled

    const cacheKey = CACHE_PREFIX + hashText(text) + '_' + targetLang;
    try {
      const result = await chrome.storage.local.get([cacheKey]);
      const cached = result[cacheKey];
      if (!cached || !cached.timestamp) return null;

      // Forever (ttlMs = Infinity) or within TTL
      if (ttlMs === Infinity || (Date.now() - cached.timestamp < ttlMs)) {
        console.log('Cache hit for translation');
        return cached;
      }
      // Expired - remove it
      await chrome.storage.local.remove([cacheKey]);
    } catch (e) {
      console.error('Error reading cache:', e);
    }
    return null;
  }

  async function setCachedTranslation(text, targetLang, translatedText, source) {
    const ttlMs = await getCacheTtlMs();
    if (ttlMs === null) {
      console.log('Cache disabled, not saving translation');
      return; // Caching disabled
    }

    const cacheKey = CACHE_PREFIX + hashText(text) + '_' + targetLang;
    try {
      await chrome.storage.local.set({
        [cacheKey]: {
          originalText: text.substring(0, 200), // Store preview for debugging
          translatedText,
          source,
          targetLang,
          timestamp: Date.now()
        }
      });
      console.log('Translation cached');
    } catch (e) {
      console.error('Error writing cache:', e);
    }
  }

  // Extract text content from HTML using regex (DOMParser not available in service workers)
  function extractTextFromHtml(html) {
    if (!html) return '';
    
    // Remove script, style tags and their contents
    // Also remove any translate buttons that might have been injected into content
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, '')
      .replace(/translate-btn/gi, '');
    
    // Replace block-level tags with newlines for structure
    text = text
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/li>/gi, '\n');
    
    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');
    
    // Decode HTML entities
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&#\d+;/g, (match) => String.fromCharCode(parseInt(match.slice(2, -1), 10)))
      .replace(/&#[xX][0-9a-fA-F]+;/g, (match) => String.fromCharCode(parseInt(match.slice(3, -1), 16)));
    
    // Normalize whitespace
    text = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n\n');
    
    return text.trim();
  }

  // Google Translate free API
  async function translateWithGoogle(text, targetLang) {
    try {
      // Encode text for URL
      const encodedText = encodeURIComponent(text);
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodedText}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract translated text from response
      // Format: [[["translated", "original", ...], ...], ...]
      if (data && data[0]) {
        const translatedParts = data[0].map(part => part[0]).filter(Boolean);
        return translatedParts.join('');
      }
      
      throw new Error('Invalid response format from Google Translate');
    } catch (err) {
      console.error('Google Translate failed:', err);
      throw err;
    }
  }

  // Gemini session management
  let geminiTabId = null;
  const GEMINI_BASE_URL = 'https://gemini.google.com/app';
  const GEMINI_TIMEOUT_MS = 30000; // 30 seconds timeout
  const STORAGE_KEY_CHAT_ID = 'backlogUtilsGeminiChatId';

  // ChatGPT session management
  let chatgptTabId = null;
  const CHATGPT_BASE_URL = 'https://chatgpt.com';
  const CHATGPT_TIMEOUT_MS = 60000; // 60 seconds timeout (ChatGPT is slower)
  const STORAGE_KEY_CHATGPT_CHAT_URL = 'backlogUtilsChatGPTChatUrl';

  // Default engine preference
  const STORAGE_KEY_DEFAULT_ENGINE = 'backlogUtilsDefaultEngine';

  // Language name mapping for Gemini prompts
  const LANG_NAMES_FULL = {
    'en': 'English',
    'ja': 'Japanese',
    'vi': 'Vietnamese',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'zh': 'Chinese (Simplified)',
    'ko': 'Korean',
    'ru': 'Russian',
    'pt': 'Portuguese'
  };

  async function getSavedChatId() {
    const result = await chrome.storage.local.get([STORAGE_KEY_CHAT_ID]);
    return result[STORAGE_KEY_CHAT_ID] || null;
  }

  async function saveChatId(chatId) {
    await chrome.storage.local.set({ [STORAGE_KEY_CHAT_ID]: chatId });
  }

  async function clearChatId() {
    await chrome.storage.local.remove(STORAGE_KEY_CHAT_ID);
  }

  // ChatGPT URL management
  async function getSavedChatGPTUrl() {
    const result = await chrome.storage.local.get([STORAGE_KEY_CHATGPT_CHAT_URL]);
    return result[STORAGE_KEY_CHATGPT_CHAT_URL] || null;
  }

  async function saveChatGPTUrl(url) {
    await chrome.storage.local.set({ [STORAGE_KEY_CHATGPT_CHAT_URL]: url });
  }

  async function clearChatGPTUrl() {
    await chrome.storage.local.remove(STORAGE_KEY_CHATGPT_CHAT_URL);
  }

  // Extract chat URL from ChatGPT tab
  // Handles both: /c/<id> (single chat) and /g/<gizmo>/c/<id> (project chat)
  async function extractChatGPTUrlFromTab(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab.url) return null;
      // Match /c/<uuid> pattern at end of path
      const match = tab.url.match(/chatgpt\.com\/(.*)/);
      if (!match) return null;
      const path = match[1];
      // Only save URLs that contain a chat ID (not the main page)
      if (path.includes('/c/')) {
        return tab.url;
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  // Extract chat ID from Gemini URL: gemini.google.com/app/{chatId}
  async function extractChatIdFromTab(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      const match = tab.url && tab.url.match(/gemini\.google\.com\/app\/([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    } catch (err) {
      return null;
    }
  }

  async function waitForTabLoad(tabId, timeoutMs = 10000) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), timeoutMs);

      const listener = (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          clearTimeout(timeout);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(true);
        }
      };

      chrome.tabs.onUpdated.addListener(listener);

      // Check if already loaded
      chrome.tabs.get(tabId).then(tab => {
        if (tab.status === 'complete') {
          clearTimeout(timeout);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(true);
        }
      }).catch(() => resolve(false));
    });
  }

  async function getOrCreateGeminiTab() {
    // Check if in-memory tab is still valid
    if (geminiTabId) {
      try {
        const tab = await chrome.tabs.get(geminiTabId);
        if (tab && !tab.discarded) {
          return geminiTabId;
        }
      } catch (err) {
        geminiTabId = null;
      }
    }

    // Determine URL: reuse saved chat session if available
    const savedChatId = await getSavedChatId();
    const url = savedChatId
      ? `${GEMINI_BASE_URL}/${savedChatId}`
      : GEMINI_BASE_URL;

    // Create a hidden pinned tab
    const tab = await chrome.tabs.create({ url, active: false, pinned: true });
    geminiTabId = tab.id;

    // Wait for the page to fully load
    await waitForTabLoad(geminiTabId);
    // Reduced settle time - Gemini loads quickly on cached connections
    await new Promise((resolve) => setTimeout(resolve, 500));

    return geminiTabId;
  }

  async function sendPromptToGemini(tabId, prompt) {
    console.log('Sending prompt to Gemini, length:', prompt?.length);
    console.log('Prompt preview (first 200 chars):', prompt?.substring(0, 200));
    console.log('Prompt preview (last 200 chars):', prompt?.substring(prompt.length - 200));
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (userPrompt) => {
        console.log('Inside injected script, prompt length:', userPrompt?.length);
        console.log('Inside injected script, prompt preview:', userPrompt?.substring(0, 100));

        // Gemini uses rich-textarea > div[contenteditable="true"] for the main chat input
        // Be specific to avoid picking other contenteditable elements
        const inputEl = document.querySelector('rich-textarea div[contenteditable="true"]')
          || document.querySelector('message-input rich-textarea div[contenteditable="true"]')
          || document.querySelector('input-area rich-textarea div[contenteditable="true"]')
          || document.querySelector('div[role="textbox"][contenteditable="true"]')
          || document.querySelector('div[inputmode][contenteditable="true"]');

        if (!inputEl) {
          console.error('Could not find Gemini input element');
          return { success: false, error: 'Could not find Gemini input element' };
        }

        console.log('Found input element:', inputEl.tagName, inputEl.className);

        console.log('Starting text insertion, prompt length:', userPrompt.length);

        // Focus and clear
        inputEl.focus();
        inputEl.click();
        inputEl.innerHTML = '';

        // Convert newlines to <br> tags for proper display in contenteditable
        // while keeping the text content accessible
        const htmlContent = userPrompt
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');

        // Set innerHTML for proper line break rendering
        inputEl.innerHTML = htmlContent;
        console.log('After innerHTML set, innerText:', (inputEl.innerText || '').substring(0, 100));

        // Also set a data attribute with raw text to ensure it's preserved
        inputEl.setAttribute('data-raw-text', userPrompt);

        // Dispatch input event to trigger Angular binding
        inputEl.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          inputType: 'insertText',
          data: userPrompt
        }));

        // Also dispatch on parent rich-textarea
        const richTextarea = inputEl.closest('rich-textarea');
        if (richTextarea) {
          richTextarea.dispatchEvent(new InputEvent('input', { bubbles: true }));
        }

        // Wait for Angular to sync
        await new Promise(r => setTimeout(r, 150));

        // Verify content was set
        const finalText = (inputEl.innerText || inputEl.textContent || '').trim();
        console.log('Final text in input length:', finalText.length, 'expected:', userPrompt.length);
        console.log('Final text preview:', finalText.substring(0, 100));

        // If text wasn't set properly, try fallback with execCommand
        if (finalText.length < userPrompt.length * 0.5) {
          console.log('Fallback: using execCommand');
          inputEl.focus();
          inputEl.innerHTML = '';
          document.execCommand('insertText', false, userPrompt);
          inputEl.dispatchEvent(new InputEvent('input', { bubbles: true }));
          await new Promise(r => setTimeout(r, 100));
        }

        // Wait briefly then find and click send button
        return new Promise((resolve) => {
          setTimeout(() => {
            // Find send button
            let sendBtn = null;
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
              const matIcon = btn.querySelector('mat-icon[fonticon="send"], mat-icon[data-mat-icon-name="send"]');
              if (matIcon) {
                const isDisabled = btn.disabled || btn.getAttribute('aria-disabled') === 'true';
                console.log('Found send button, disabled:', isDisabled);
                if (!isDisabled) {
                  sendBtn = btn;
                  break;
                }
              }
            }

            // Fallback selectors
            if (!sendBtn) {
              sendBtn = document.querySelector('button[aria-label="Send message"]')
                || document.querySelector('button.send-button')
                || document.querySelector('button[jslog*="173899"]');
              console.log('Fallback send button found:', !!sendBtn);
            }

            if (!sendBtn) {
              resolve({ success: false, error: 'Could not find send button' });
              return;
            }

            // Check if button is enabled
            const isDisabled = sendBtn.disabled || sendBtn.getAttribute('aria-disabled') === 'true';
            if (isDisabled) {
              console.log('Send button disabled, waiting...');
              // Wait a bit more for button to enable
              setTimeout(() => {
                const stillDisabled = sendBtn.disabled || sendBtn.getAttribute('aria-disabled') === 'true';
                if (stillDisabled) {
                  console.error('Send button still disabled after wait');
                  resolve({ success: false, error: 'Send button is disabled — input may not have been detected' });
                } else {
                  console.log('Clicking send button after delay');
                  sendBtn.click();
                  resolve({ success: true });
                }
              }, 500);
              return;
            }

            console.log('Clicking send button');
            sendBtn.click();
            resolve({ success: true });
          }, 100);
        });
      },
      args: [prompt]
    });

    return results[0]?.result;
  }

  async function waitForGeminiResponse(tabId, timeoutMs = GEMINI_TIMEOUT_MS) {
    // Reduced initial wait - start checking earlier
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const startTime = Date.now();
    // Poll more frequently for faster response detection
    const checkInterval = 500;

    while (Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));

      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            // Check if Gemini is still generating
            // Gemini shows a stop button while generating
            const isGenerating = !!document.querySelector(
              'button[aria-label="Stop response"], button[aria-label="Stop generating"], .stop-button'
            );
            if (isGenerating) {
              return { done: false, loading: true };
            }

            // Get the last model response — Gemini's DOM structure:
            // model-response > .response-content > message-content > .markdown
            const modelResponses = document.querySelectorAll('model-response');
            if (!modelResponses.length) {
              return { done: false, loading: false };
            }

            const lastResponse = modelResponses[modelResponses.length - 1];

            // Try inner selectors in order of specificity
            const contentSelectors = [
              'message-content .markdown',
              'message-content',
              '.response-content',
              '.model-response-text',
              '.response-container'
            ];

            for (const sel of contentSelectors) {
              const el = lastResponse.querySelector(sel);
              if (el && el.innerText.trim().length > 0) {
                return { done: true, text: el.innerText.trim() };
              }
            }

            // Last resort: textContent of the whole model-response
            const text = lastResponse.innerText.trim();
            if (text.length > 0) {
              return { done: true, text };
            }

            return { done: false, loading: false };
          }
        });

        const result = results[0]?.result;
        if (result?.done) {
          return result.text;
        }
      } catch (err) {
        console.error('Error checking Gemini response:', err);
      }
    }

    throw new Error('Timeout waiting for Gemini response');
  }

  async function attemptGeminiSession(text, targetLang) {
    const langName = LANG_NAMES_FULL[targetLang] || targetLang;

    // Validate text content
    if (!text || text.trim().length === 0) {
      throw new Error('No text content provided for translation');
    }

    // Load custom prompt from storage or use default
    const customPromptResult = await chrome.storage.sync.get(['backlogUtilsCustomPrompt']);
    const defaultPrompt = `Translate the following text to ${langName}. Only return the translation, no explanations:`;
    const customPromptTemplate = customPromptResult.backlogUtilsCustomPrompt || defaultPrompt;
    // Replace {lang} placeholder with actual language name
    const promptPrefix = customPromptTemplate.replace(/{lang}/g, langName);
    const prompt = `${promptPrefix}\n\n${text}`;
    console.log('Gemini prompt length:', prompt.length, 'Text length:', text.length);
    console.log('Full prompt being sent to Gemini:', prompt);

    // Check for saved chat session
    const savedChatId = await getSavedChatId();
    console.log('Saved Gemini chat ID:', savedChatId);

    // Check user preference for keeping focus on Gemini
    const keepFocusResult = await chrome.storage.sync.get(['backlogUtilsKeepGeminiFocus']);
    const keepGeminiFocus = keepFocusResult.backlogUtilsKeepGeminiFocus ?? false;

    // Remember the original active tab to return focus if needed
    const originalTab = await chrome.tabs.query({ active: true, currentWindow: true });
    const originalTabId = originalTab[0]?.id;
    console.log('Original tab ID:', originalTabId, 'Current active tab:', originalTab[0]?.url);

    try {
      const tabId = await getOrCreateGeminiTab();

      // Check current tab URL to see if we're reusing a session
      const currentTab = await chrome.tabs.get(tabId);
      console.log('Current Gemini tab URL:', currentTab.url);

      // Activate Gemini tab to ensure it can execute scripts properly
      // Background tabs get throttled by Chrome and may not work correctly
      await chrome.tabs.update(tabId, { active: true });
      console.log('Activated Gemini tab for translation');

      const sendResult = await sendPromptToGemini(tabId, prompt);
      console.log('Send result:', sendResult);

      if (!sendResult.success) {
        throw new Error(sendResult.error || 'Failed to send prompt');
      }

      // Wait for Gemini to process and update URL with new chat session ID
      // Need sufficient time for URL to update before extracting chat ID
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Extract and save chat ID if it's a new session
      const chatId = await extractChatIdFromTab(tabId);
      console.log('Extracted chat ID:', chatId);

      if (chatId && chatId !== savedChatId) {
        await saveChatId(chatId);
        console.log('New Gemini chat ID saved:', chatId);
      }

      const response = await waitForGeminiResponse(tabId);

      // Return focus to original tab if user didn't want to keep focus on Gemini
      console.log('Focus decision:', { keepGeminiFocus, originalTabId, geminiTabId: tabId, shouldReturnFocus: !keepGeminiFocus && originalTabId && originalTabId !== tabId });
      if (!keepGeminiFocus && originalTabId && originalTabId !== tabId) {
        try {
          await chrome.tabs.update(originalTabId, { active: true });
          console.log('Returned focus to original tab:', originalTabId);
        } catch (e) {
          console.log('Could not return focus to original tab:', e.message);
        }
      } else {
        console.log('Keeping focus on Gemini tab (setting:', keepGeminiFocus, ')');
      }

      return response;
    } catch (err) {
      console.error('Gemini session error:', err);
      // On failure: close tab and clear stored chat ID to force a fresh session next time
      if (geminiTabId) {
        try { await chrome.tabs.remove(geminiTabId); } catch (e) {}
        geminiTabId = null;
      }
      await clearChatId();
      throw err;
    }
  }

  // --- ChatGPT functions ---

  async function getOrCreateChatGPTTab() {
    if (chatgptTabId) {
      try {
        const tab = await chrome.tabs.get(chatgptTabId);
        if (tab && !tab.discarded) {
          return chatgptTabId;
        }
      } catch (err) {
        chatgptTabId = null;
      }
    }

    const savedUrl = await getSavedChatGPTUrl();
    const url = savedUrl || CHATGPT_BASE_URL;

    const tab = await chrome.tabs.create({ url, active: false, pinned: true });
    chatgptTabId = tab.id;

    await waitForTabLoad(chatgptTabId, 15000);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return chatgptTabId;
  }

  async function sendPromptToChatGPT(tabId, prompt) {
    console.log('Sending prompt to ChatGPT, length:', prompt?.length);
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (userPrompt) => {
        const inputEl = document.querySelector('#prompt-textarea')
          || document.querySelector('div[contenteditable="true"].ProseMirror')
          || document.querySelector('div[contenteditable="true"]');

        if (!inputEl) {
          return { success: false, error: 'Could not find ChatGPT input element' };
        }

        console.log('Found ChatGPT input:', inputEl.tagName, inputEl.id, inputEl.className);

        inputEl.focus();
        inputEl.click();

        if (inputEl.tagName === 'P' || inputEl.querySelector('br') !== null) {
          inputEl.innerHTML = '';
        } else {
          inputEl.innerHTML = '<p></p>';
        }

        const paragraphs = userPrompt.split('\n');
        const htmlContent = paragraphs.map(p => {
          const escaped = p
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          return `<p>${escaped}</p>`;
        }).join('');

        inputEl.innerHTML = htmlContent;

        inputEl.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          inputType: 'insertText',
          data: userPrompt
        }));

        const parent = inputEl.closest('form') || inputEl.parentElement;
        if (parent && parent !== inputEl) {
          parent.dispatchEvent(new InputEvent('input', { bubbles: true }));
        }

        await new Promise(r => setTimeout(r, 200));

        const sendBtn = document.querySelector('button[data-testid="send-button"]')
          || document.querySelector('button[aria-label="Send prompt"]')
          || document.querySelector('button svg[width="24"]')?.closest('button');

        if (!sendBtn) {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.querySelector('svg') && !btn.disabled && btn.offsetParent !== null) {
              const rect = btn.getBoundingClientRect();
              if (rect.right > window.innerWidth - 80) {
                sendBtn = btn;
                break;
              }
            }
          }
        }

        if (!sendBtn) {
          return { success: false, error: 'Could not find send button' };
        }

        if (sendBtn.disabled) {
          return new Promise((resolve) => {
            setTimeout(() => {
              if (!sendBtn.disabled) {
                sendBtn.click();
                resolve({ success: true });
              } else {
                resolve({ success: false, error: 'Send button is disabled' });
              }
            }, 500);
          });
        }

        sendBtn.click();
        return { success: true };
      },
      args: [prompt]
    });

    return results[0]?.result;
  }

  async function waitForChatGPTResponse(tabId, timeoutMs = CHATGPT_TIMEOUT_MS) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const startTime = Date.now();
    const checkInterval = 800;

    while (Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));

      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            const stopBtn = document.querySelector('button[data-testid="stop-button"]')
              || document.querySelector('button[aria-label="Stop streaming"]')
              || document.querySelector('button[aria-label="Stop generating"]');

            if (stopBtn && stopBtn.offsetParent !== null) {
              return { done: false, loading: true };
            }

            const messages = document.querySelectorAll('[data-message-author-role="assistant"]');
            if (!messages.length) {
              return { done: false, loading: false };
            }

            const lastMsg = messages[messages.length - 1];

            const markdownEl = lastMsg.querySelector('.markdown')
              || lastMsg.querySelector('.prose')
              || lastMsg.querySelector('[data-message-content]')
              || lastMsg;

            const text = (markdownEl.innerText || markdownEl.textContent || '').trim();
            if (text.length > 0) {
              return { done: true, text };
            }

            return { done: false, loading: false };
          }
        });

        const result = results[0]?.result;
        if (result?.done) {
          return result.text;
        }
      } catch (err) {
        console.error('Error checking ChatGPT response:', err);
      }
    }

    throw new Error('Timeout waiting for ChatGPT response');
  }

  async function attemptChatGPTSession(text, targetLang) {
    const langName = LANG_NAMES_FULL[targetLang] || targetLang;

    if (!text || text.trim().length === 0) {
      throw new Error('No text content provided for translation');
    }

    const customPromptResult = await chrome.storage.sync.get(['backlogUtilsCustomPrompt']);
    const defaultPrompt = `Translate the following text to ${langName}. Only return the translation, no explanations:`;
    const customPromptTemplate = customPromptResult.backlogUtilsCustomPrompt || defaultPrompt;
    const promptPrefix = customPromptTemplate.replace(/{lang}/g, langName);
    const prompt = `${promptPrefix}\n\n${text}`;
    console.log('ChatGPT prompt length:', prompt.length);

    const savedUrl = await getSavedChatGPTUrl();
    console.log('Saved ChatGPT URL:', savedUrl);

    const originalTab = await chrome.tabs.query({ active: true, currentWindow: true });
    const originalTabId = originalTab[0]?.id;

    try {
      const tabId = await getOrCreateChatGPTTab();

      const currentTab = await chrome.tabs.get(tabId);
      console.log('Current ChatGPT tab URL:', currentTab.url);

      await chrome.tabs.update(tabId, { active: true });
      console.log('Activated ChatGPT tab for translation');

      const sendResult = await sendPromptToChatGPT(tabId, prompt);
      console.log('ChatGPT send result:', sendResult);

      if (!sendResult?.success) {
        throw new Error(sendResult?.error || 'Failed to send prompt to ChatGPT');
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const chatUrl = await extractChatGPTUrlFromTab(tabId);
      console.log('Extracted ChatGPT URL:', chatUrl);

      if (chatUrl && chatUrl !== savedUrl) {
        await saveChatGPTUrl(chatUrl);
        console.log('New ChatGPT URL saved:', chatUrl);
      }

      const response = await waitForChatGPTResponse(tabId);

      if (originalTabId && originalTabId !== tabId) {
        try {
          await chrome.tabs.update(originalTabId, { active: true });
          console.log('Returned focus to original tab:', originalTabId);
        } catch (e) {
          console.log('Could not return focus:', e.message);
        }
      }

      return response;
    } catch (err) {
      console.error('ChatGPT session error:', err);
      if (chatgptTabId) {
        try { await chrome.tabs.remove(chatgptTabId); } catch (e) {}
        chatgptTabId = null;
      }
      await clearChatGPTUrl();
      throw err;
    }
  }

  // Main translation function with caching
  async function translateText(text, targetLang, force = false, engine = null) {
    // Check cache first (skip if force re-translate requested)
    if (!force && !engine) {
      const cached = await getCachedTranslation(text, targetLang);
      if (cached) {
        return {
          success: true,
          text: cached.translatedText,
          source: cached.source + ' (cached)',
          targetLang,
          cached: true
        };
      }
    }

    // Force re-translate: clear existing cache for this text
    if (force) {
      const cacheKey = CACHE_PREFIX + hashText(text) + '_' + targetLang;
      await chrome.storage.local.remove([cacheKey]);
      console.log('Force re-translate: cleared cache for this text');
    }

    // Read default engine preference (default: 'gemini')
    let defaultEngine = 'gemini';
    try {
      const defaultEngineResult = await chrome.storage.sync.get([STORAGE_KEY_DEFAULT_ENGINE]);
      defaultEngine = defaultEngineResult[STORAGE_KEY_DEFAULT_ENGINE] || 'gemini';
    } catch (e) {
      // Fall through with 'gemini' default
    }

    // Engine preference: 'gemini' only
    if (engine === 'gemini') {
      try {
        const geminiResult = await attemptGeminiSession(text, targetLang);
        await setCachedTranslation(text, targetLang, geminiResult, 'gemini');
        return { success: true, text: geminiResult, source: 'gemini (forced)', targetLang };
      } catch (geminiErr) {
        return { success: false, error: 'Gemini failed: ' + geminiErr.message };
      }
    }

    // Engine preference: 'chatgpt' only
    if (engine === 'chatgpt') {
      try {
        const chatgptResult = await attemptChatGPTSession(text, targetLang);
        await setCachedTranslation(text, targetLang, chatgptResult, 'chatgpt');
        return { success: true, text: chatgptResult, source: 'chatgpt (forced)', targetLang };
      } catch (chatgptErr) {
        return { success: false, error: 'ChatGPT failed: ' + chatgptErr.message };
      }
    }

    // Engine preference: 'google' only
    if (engine === 'google') {
      try {
        const googleResult = await translateWithGoogle(text, targetLang);
        await setCachedTranslation(text, targetLang, googleResult, 'google');
        return { success: true, text: googleResult, source: 'google (forced)', targetLang };
      } catch (googleErr) {
        return { success: false, error: 'Google Translate failed: ' + googleErr.message };
      }
    }

    // Default: Try user's preferred engine first, then fallback through others
    const engines = defaultEngine === 'chatgpt'
      ? ['chatgpt', 'gemini', 'google']
      : defaultEngine === 'google'
        ? ['google', 'gemini', 'chatgpt']
        : ['gemini', 'chatgpt', 'google']; // default: gemini first

    for (const eng of engines) {
      try {
        let result;
        if (eng === 'chatgpt') {
          result = await attemptChatGPTSession(text, targetLang);
        } else if (eng === 'google') {
          result = await translateWithGoogle(text, targetLang);
        } else {
          result = await attemptGeminiSession(text, targetLang);
        }
        await setCachedTranslation(text, targetLang, result, eng);
        return { success: true, text: result, source: eng, targetLang };
      } catch (err) {
        console.log(`${eng} translation failed, trying next:`, err.message);
      }
    }

    return { success: false, error: 'All translation engines failed' };
  }

  // Handle messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle i18n message requests
    if (message.action === 'i18n') {
      const result = chrome.i18n.getMessage(message.key, message.substitutions);
      sendResponse({ message: result });
      return false;
    }

    if (message.action === 'clearChatGPT') {
      if (chatgptTabId) {
        try { chrome.tabs.remove(chatgptTabId); } catch (e) {}
        chatgptTabId = null;
      }
      chrome.storage.local.remove(STORAGE_KEY_CHATGPT_CHAT_URL).then(() => {
        sendResponse({ success: true });
      }).catch(() => {
        sendResponse({ success: false });
      });
      return true;
    }

    if (message.action !== 'translate') return false;

    // Check rate limit
    const rateLimit = checkRateLimit();
    if (!rateLimit.allowed) {
      sendResponse({
        success: false,
        error: `Rate limit exceeded. Please wait ${Math.ceil(rateLimit.waitMs / 1000)} seconds.`
      });
      return false;
    }

    // Get target language from storage or use default
    chrome.storage.sync.get(['backlogUtilsTargetLang'], async (result) => {
      const targetLang = result.backlogUtilsTargetLang || 'en';

      console.log('=== Translation Request ===');
      console.log('Target lang:', targetLang);

      try {
        // Use plain text directly if provided, otherwise extract from HTML
        const plainText = message.text
          ? message.text.trim()
          : extractTextFromHtml(message.html || '');

        console.log('Plain text length:', plainText?.length);
        console.log('Plain text preview:', plainText?.substring(0, 200));
        console.log('Force re-translate:', message.force);
        console.log('Engine preference:', message.engine);

        if (!plainText || plainText.length < 2) {
          sendResponse({ success: false, error: 'No text content to translate' });
          return;
        }

        // Perform translation with force/engine options
        const result = await translateText(plainText, targetLang, message.force, message.engine);
        console.log('Translation result source:', result.source);
        sendResponse(result);
      } catch (err) {
        console.error('Translation error:', err);
        sendResponse({ success: false, error: err.message });
      }
    });

    return true; // Keep channel open for async response
  });

  console.log('Backlog Utils background script loaded');
})();
