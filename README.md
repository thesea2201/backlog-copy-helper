# Backlog Copy Helper

A Chrome extension that adds a copy button to Backlog issue pages to copy issue key, title, and summary in markdown format.

## Features

- Adds a "Copy MD" button next to the issue key on any Backlog.jp issue page
- Copies the following information in markdown format:
  - **Issue Key** (e.g., `FURUCRM_AGENTFORCE_DEV-90`)
  - **Issue Title** (from the summary section)
  - **Ticket Summary** (the collapsed summary text)
- Shows a success notification when copied

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" button
4. Select the `backlog-utils` folder
5. The extension is now installed and active on backlog.jp domains

## Usage

1. Navigate to any issue page on Backlog (e.g., `https://*.backlog.jp/view/*`)
2. Click the purple "Copy MD" button next to the issue key
3. The markdown-formatted content is copied to your clipboard

## Example Output

```markdown
**FURUCRM_AGENTFORCE_DEV-90**

**Title:** 質問ごとの評価サジェスト / Evaluation suggestions for each question

**Summary:** 概要 選択した質問の回答内容をもとにAIが推奨評価ラベル・評価理由・レビューポイントを生成 実装方式 LWC + Apex + PromptTemplate
```

## Files

- `manifest.json` - Extension configuration
- `content.js` - Main script that injects the button and handles copying
- `styles.css` - Styling for the button and notifications
- `icon*.png` - Extension icons (optional, extension works without them)
