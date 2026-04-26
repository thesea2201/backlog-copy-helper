# Permission Justifications for Chrome Web Store

This document provides short, user-friendly explanations for every permission and host access requested by Backlog Utils. Use these when filling out the Chrome Web Store review form.

---

## Required Permissions

### `activeTab`
- **Justification:** To read the current Backlog issue page and extract the issue key, title, summary, and comment text when you click the Copy MD or Translate button. We only access the page after an explicit user click.

### `clipboardWrite`
- **Justification:** To copy the generated markdown or tab-separated notification data to your clipboard so you can paste it into Slack, GitHub, Notion, or spreadsheets.

### `tabs`
- **Justification:** To open a hidden Gemini tab for AI translations and to return focus to your original Backlog tab after translation is complete. No tab data is collected or transmitted elsewhere.

### `storage`
- **Justification:** To remember your preferred translation language, cache duration setting, custom prompt, and cached translations locally on your device. No data is sent to external servers.

### `scripting`
- **Justification:** To programmatically input your selected text into the Gemini web interface and retrieve the translated result. This is only triggered by an explicit user action (clicking a Translate button).

---

## Host Permissions

### `*://*.backlog.jp/*` and `*://backlog.jp/*`
- **Justification:** The Extension injects Copy MD, Copy Noty, and Translate buttons directly into Backlog issue and notification pages. This is the primary site the Extension supports.

### `*://*.google.com/*` and `*://translate.googleapis.com/*`
- **Justification:** Required to call Google Translate's free API and to interact with the Gemini web interface for AI-powered translations. These are only accessed when you actively use the translate feature.

---

## Remote Code Policy

**Does this extension use remote code?**
- **Answer:** No. All code is bundled in the extension package. The only external network calls are:
  1. HTTPS GET to `translate.googleapis.com` for Google Translate.
  2. HTTPS navigation to `gemini.google.com` via a browser tab for Gemini translations.

Both are standard browser-to-service requests, not dynamically loaded or executed code.
