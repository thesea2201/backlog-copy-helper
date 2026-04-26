# Privacy Policy for Backlog Utils

**Effective Date:** April 25, 2026

## 1. Introduction

Backlog Utils ("the Extension") is a Chrome browser extension that enhances the [Backlog](https://backlog.jp/) project management experience. This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information.

## 2. Information We Collect

### 2.1 Local Storage (chrome.storage)
The Extension stores the following data **locally on your device** via Chrome's storage API:

- **Extension settings**: target translation language, cache duration preference, custom translation prompt text, Gemini chat session ID.
- **Translation cache**: previously translated text snippets (original text preview up to 200 characters, translated text, source language, target language, and timestamp) to avoid re-translating unchanged content.

This data never leaves your browser and is not transmitted to our servers.

### 2.2 Translation Services
When you use the translation feature:

- **Google Translate**: Text is sent to `translate.googleapis.com` via a standard HTTPS request. This is the same free endpoint used by the Google Translate web interface.
- **Gemini**: Text is sent to `gemini.google.com` by programmatically interacting with an open Gemini tab in your browser. The Extension does not use a separate API key or server; it operates through your existing Google account session on Gemini.

**Important**: Translation text is sent directly from your browser to Google's services. We do not intercept, log, or store translation content on any third-party servers.

### 2.3 No Personal Data Collection
We do **not** collect:
- Your name, email, or Google account information.
- Your Backlog credentials or project data.
- Browsing history outside Backlog.jp domains.
- Analytics, crash reports, or telemetry.

## 3. Permissions and Their Purposes

| Permission | Purpose |
|------------|---------|
| `activeTab` | Read the current Backlog page to extract issue key, title, summary, and comments for copying / translating. |
| `clipboardWrite` | Copy markdown and notification data to your system clipboard. |
| `tabs` | Create and manage a pinned Gemini tab for translations, and return focus to your original tab. |
| `storage` | Persist user settings (language, cache duration, custom prompt) and translation cache locally. |
| `scripting` | Execute scripts in the Gemini tab to input text and retrieve translations. |
| `*://*.backlog.jp/*` | Run content scripts on Backlog issue pages to inject copy/translate buttons. |
| `*://google.com/*` | Access Gemini's web interface for translation functionality. |
| `*://translate.googleapis.com/*` | Call Google Translate's free translation endpoint. |

## 4. Data Retention and Deletion

- **Settings** persist until you uninstall the Extension or clear Chrome storage.
- **Translation cache** is retained according to your selected TTL (Never, 7 days, 1 month, Forever). You can clear all cached translations instantly via the popup settings.
- **Gemini chat session ID** is stored locally until you reset it via the popup settings or uninstall the Extension.

## 5. Third-Party Services

This Extension interacts with the following third-party services directly from your browser:

- **Backlog.jp** (Nulab Inc.) - Content is read for copy/translate functionality only.
- **Google Translate** - Text is sent for machine translation.
- **Gemini (Google)** - Text is sent for AI-powered translation.

Please refer to their respective privacy policies for details on how they handle data.

## 6. Changes to This Privacy Policy

We may update this Privacy Policy to reflect changes in the Extension. The latest version will always be available in the `release/PRIVACY_POLICY.md` file of this repository.

## 7. Contact

If you have questions about this Privacy Policy, please open an issue on the project's GitHub repository.
