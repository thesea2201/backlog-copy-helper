# Backlog Utils

A Chrome extension toolkit for [Backlog](https://backlog.jp/) that enhances your workflow with utilities like markdown copying, and more features coming soon.

## Features

### Issue Page: Copy Markdown (`Copy MD` button)
- Adds a "Copy MD" button next to the issue key on any Backlog.jp issue page
- Copies the following information in markdown format:
  - **Issue Key** (e.g., `FURUCRM_AGENTFORCE_DEV-90`)
  - **Issue Title** (from the summary section)
  - **Ticket Summary** (the collapsed summary text)
- Shows a success notification when copied

### Notifications: Copy List (`Copy Noty` button) - v1.1.0
- Adds a "Copy Noty" button next to the notifications bell icon
- Auto-opens the notifications panel
- Copies current month's notifications in tab-separated format:
  - **Issue Key** (e.g., `FURUCRM_AGENTFORCE_DEV-63`)
  - **Issue Title** (full issue title)
  - **Status** (e.g., `Resolved`, `In Progress`)
  - **Date** (YYYY-MM-DD format)
- Useful for tracking issues from notifications in a spreadsheet

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" button
4. Select the `backlog-utils` folder
5. The extension is now installed and active on backlog.jp domains

## Usage

### Copy Issue Markdown
1. Navigate to any issue page on Backlog (e.g., `https://*.backlog.jp/view/*`)
2. Click the cyan "Copy MD" button next to the issue key
3. The markdown-formatted content is copied to your clipboard

### Copy Notifications
1. Click anywhere on Backlog to see the notifications bell
2. Click the cyan "Copy Noty" button next to the bell icon
3. The notifications panel auto-opens
4. Current month's notifications are copied as tab-separated values

## Example Output

### Issue Markdown
```markdown
**FURUCRM_AGENTFORCE_DEV-90**

**Title:** 質問ごとの評価サジェスト / Evaluation suggestions for each question

**Summary:** 概要 選択した質問の回答内容をもとにAIが推奨評価ラベル・評価理由・レビューポイントを生成 実装方式 LWC + Apex + PromptTemplate
```

### Notifications (Tab-separated)
```
FURUCRM_AGENTFORCE_DEV-69	gBizINFO企業情報取得（Stage 2）	In Progress	2026-04-13
FURUCRM_AGENTFORCE_DEV-63	情報ソースが「CISA KEV Catalog」の場合、CVEスコアと該当のKEVカタログページのURLをセキュリティトレンド「説明」項目に格納してほしい	Resolved	2026-04-07
```

## Development

### Project Structure

```
backlog-utils/
├── manifest.json       # Extension configuration
├── README.md           # This file
├── src/
│   ├── content.js      # Main script that injects the button
│   └── styles.css      # Styling for the button and notifications
├── icons/
│   ├── icon16.svg      # Toolbar icon
│   ├── icon48.svg      # Extensions page icon
│   └── icon128.svg     # Chrome Web Store icon
└── build/              # Build output (generated)
```

### Building for Chrome Web Store

Run the build script to create a zip file for upload:

```bash
# Using shell script
./build.sh

# Or using Node.js
node build.js
```

The build script will:
1. Extract version from `manifest.json`
2. Create a zip file in `build/backlog-utils-v{VERSION}.zip`
3. Include only necessary files (no dev files like `.git/`, `.github/`)

### Updating Version

Before building for release, update the version in `manifest.json`:

```json
{
  "version": "1.1"
}
```
