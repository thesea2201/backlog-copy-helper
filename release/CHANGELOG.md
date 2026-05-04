# Backlog Utils - Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.3] - 2026-05-05

### Added
- **ChatGPT Translation Engine** — translate Backlog content via ChatGPT (tab automation, like Gemini).
  - Supports both single chat (`/c/<uuid>`) and project chat (`/g/<gizmo>/c/<uuid>`) URL formats.
  - Automatically reuses the same ChatGPT session across translations (chat URL cached).
- **Default Engine Selector** — choose your preferred translation engine in Settings: Gemini, ChatGPT, or Google Translate.
- **Reset ChatGPT Chat Session** button in popup Settings.

### Fixed
- ChatGPT translation output now preserves line breaks correctly (paragraphs rendered as inline text previously).
- ChatGPT chat URL now reliably cached using DOM `window.location.href` instead of `chrome.tabs.get()` which returns stale URLs in MV3.

## [1.3.1] - 2026-04-26

### Fixed
- Fixed duplicate translate buttons appearing on issues with empty descriptions.

## [1.3.0] - 2026-04-25

### Added
- **Translation Engine** - Translate any text content on Backlog issue pages, comments, and articles with one click.
  - Supports 10 languages: English, Japanese, Vietnamese, Spanish, French, German, Chinese (Simplified), Korean, Russian, Portuguese.
  - Dual-engine translation: Google Translate API (default) with optional Gemini (experimental) fallback.
  - Translation cache with configurable TTL (Never, 7 days, 1 month, Forever).
  - Custom translation prompts for fine-tuned results (e.g., preserve technical terms).
  - Force re-translate with Ctrl+Click.
  - Dropdown menu per translate button to choose engine (Google only / Gemini only / force re-translate).
- **Popup Settings** - New settings tab in the extension popup for cache management and custom prompts.
- **Rate Limiting** - Max 5 translations per minute to respect free API limits.
- **i18n Support** - Full internationalization framework ready for multi-language UI.

### Changed
- Enhanced popup UI with tabbed interface (Main / Settings).
- Gemini chat session persistence across browser sessions.

## [1.2.0] - 2026-04-24

### Added
- **Copy Notifications** (`Copy Noty`) button next to the notifications bell.
  - Auto-opens the notifications panel.
  - Copies current month's notifications as tab-separated values (TSV).
  - Columns: Issue Key, Issue Title, Status, Date (YYYY-MM-DD).
  - Useful for importing into spreadsheets for reporting.

## [1.1.0] - 2026-04-24

### Added
- **Notification Copy Feature** (initial version).

## [1.0.0] - 2026-04-24

### Added
- **Copy Markdown** (`Copy MD`) button on Backlog issue pages.
  - Copies issue key, title, and collapsed summary as formatted markdown.
  - One-click paste into Slack, GitHub, Notion, or any markdown editor.
  - Visual success / error toast notifications.
- Backlog.jp domain content script injection.
- Chrome extension popup with basic branding.
