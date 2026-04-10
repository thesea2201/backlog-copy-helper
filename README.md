# Backlog Utils

A Chrome extension toolkit for [Backlog](https://backlog.jp/) that enhances your workflow with utilities like markdown copying, and more features coming soon.

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
