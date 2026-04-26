# Release Checklist - Backlog Utils

Use this checklist for every release. Each step includes a copy-paste prompt you can send to an AI assistant to get help with that specific task.

---

## Phase 1: Pre-Release Preparation

### Step 1: Decide Version Number
**Action:** Update `manifest.json` version following [Semantic Versioning](https://semver.org/).

**AI Prompt:**
```
I want to release a new version of my Chrome extension. Current version is [X.Y.Z]. 
Changes since last release: [list your changes]
What should the next version number be following SemVer? Explain why.
```

**File to edit:** `manifest.json`

---

### Step 2: Update Changelog
**Action:** Add a new section to `release/CHANGELOG.md` with the new version and changes.

**AI Prompt:**
```
Add a new entry to my CHANGELOG.md for version [X.Y.Z] released today.
Here are the changes: [paste your commit messages or list changes]
Follow Keep a Changelog format with Added/Changed/Fixed/Removed sections.
File: /Users/thesea2201/project/personal/extension/backlog-utils/release/CHANGELOG.md
```

**File to edit:** `release/CHANGELOG.md`

---

### Step 3: Build Extension Package
**Action:** Create the zip file for Chrome Web Store upload.

**AI Prompt:**
```
Build the Chrome extension package for upload. 
Run the build script in /Users/thesea2201/project/personal/extension/backlog-utils/
The build script is either ./build.sh or node build.js.
Tell me the output file name and verify it contains all necessary files (manifest.json, src/, icons/, _locales/, popup.html, popup.js) and excludes dev files (.git, .github, build scripts).
```

**Command:** `./build.sh` or `node build.js`

---

### Step 4: Test the Build
**Action:** Load the built extension in Chrome and verify all features work.

**AI Prompt:**
```
Create a testing checklist for my Chrome extension "Backlog Utils". 
Features to test:
1. Copy MD button on Backlog issue pages
2. Copy Noty button for notifications
3. Translate button on comments
4. Popup settings (language, cache, custom prompt)
5. Translation with both Google and Gemini engines

Create a step-by-step test procedure I can follow manually.
```

**Manual test:** Load unpacked extension from `build/` folder at `chrome://extensions/`

---

## Phase 2: Store Assets Preparation

### Step 5: Generate Screenshots
**Action:** Capture 3-5 screenshots at 1280x800 resolution.

**AI Prompt:**
```
I'm preparing screenshots for the Chrome Web Store for my extension "Backlog Utils".
Required specs: 1280x800 or 640x400, PNG/JPEG, no transparency.

I need to capture these scenes:
1. Backlog issue page showing "Copy MD" button
2. Pasted markdown in Slack/GitHub/Notion
3. "Copy Noty" button and spreadsheet with imported data
4. Translate button with inline translation result
5. Extension popup showing settings

Give me step-by-step instructions to capture these cleanly, including what data to use in the demo and what to blur for privacy.
```

**Reference:** `release/SCREENSHOTS_GUIDE.md`

---

### Step 6: Write Store Description (if changed)
**Action:** Update the Chrome Web Store listing description if new features were added.

**AI Prompt:**
```
Update the Chrome Web Store description for my extension.
New features in this version: [list new features]
Current description: [paste from release/STORE_DESCRIPTION.md]

Write an updated full description (max 4000 chars), short description (max 132 chars), and highlight 3 key features.
Keep the tone professional and benefit-focused.
```

**Reference:** `release/STORE_DESCRIPTION.md`

---

### Step 7: Update Privacy Policy (if needed)
**Action:** Review if new permissions or data handling requires privacy policy updates.

**AI Prompt:**
```
Review my privacy policy for changes.
Current privacy policy: [paste from release/PRIVACY_POLICY.md]
New permissions added: [list any, or say "none"]
New third-party services: [list any, or say "none"]

Does my privacy policy need updating? If yes, provide the specific sections to modify.
```

**Reference:** `release/PRIVACY_POLICY.md`

---

## Phase 3: Chrome Web Store Submission

### Step 8: Prepare Permission Justifications
**Action:** Fill in the "Permission justification" fields in the Chrome Web Store developer dashboard.

**AI Prompt:**
```
I need short justifications for Chrome Web Store review. For each permission, write a 1-sentence user-facing explanation.
Permissions to justify:
- activeTab
- clipboardWrite
- tabs
- storage
- scripting
- Host: *://*.backlog.jp/*
- Host: *://translate.googleapis.com/*
- Host: *://*.google.com/*

Keep each under 100 characters and explain the user benefit, not the technical implementation.
```

**Reference:** `release/PERMISSIONS.md`

---

### Step 9: Fill Store Listing
**Action:** Upload to Chrome Web Store Developer Dashboard.

**AI Prompt:**
```
Walk me through uploading to the Chrome Web Store step by step:
1. Package zip file upload
2. Store listing (title, description, screenshots)
3. Privacy practices (single purpose, permissions)
4. Pricing and distribution
5. Content ratings

What should I select for each option for a free productivity extension?
```

**URL:** https://chrome.google.com/webstore/devconsole

---

### Step 10: Handle Review Feedback
**Action:** Respond to any rejection or additional information requests from Google.

**AI Prompt:**
```
I received this rejection/feedback from Chrome Web Store review:
[paste the rejection reason]

Help me write a response or fix the issue. Here are my current files:
- manifest.json: [paste]
- background.js: [paste relevant parts]
- privacy policy: [paste]

What should I change or explain to get approved?
```

---

## Phase 4: Post-Release

### Step 11: Create GitHub Release
**Action:** Tag the release and publish release notes on GitHub.

**AI Prompt:**
```
Create a GitHub release for version [X.Y.Z].
Changes: [paste from CHANGELOG.md]

Write the release notes in Markdown format suitable for GitHub Releases, including:
- Release title
- Summary paragraph
- What's new section
- Installation link to Chrome Web Store
```

**Commands:**
```bash
git tag -a v1.3.0 -m "Release version 1.3.0"
git push origin v1.3.0
```

---

### Step 12: Announce Release
**Action:** Post on social media / team channels.

**AI Prompt:**
```
Write release announcements for:
1. Twitter/X (280 chars)
2. LinkedIn (professional tone, 2-3 paragraphs)
3. Internal team Slack message (casual, with install link)

Version: [X.Y.Z]
Key changes: [list top 2-3 changes]
Chrome Web Store link: [your link]
```

**Reference:** `release/MARKETING.md`

---

## Quick Reference: File Locations

| File | Path |
|------|------|
| Changelog | `release/CHANGELOG.md` |
| Privacy Policy | `release/PRIVACY_POLICY.md` |
| Permissions | `release/PERMISSIONS.md` |
| Store Description | `release/STORE_DESCRIPTION.md` |
| Screenshots Guide | `release/SCREENSHOTS_GUIDE.md` |
| Marketing | `release/MARKETING.md` |
| Video Script | `release/VIDEO_SCRIPT.md` |
| Build Script | `./build.sh` or `node build.js` |

---

## Version History Template

When starting a new release, copy this to track progress:

```markdown
## Release v[X.Y.Z] - [Date]

- [ ] Step 1: Decide version number
- [ ] Step 2: Update changelog
- [ ] Step 3: Build extension package
- [ ] Step 4: Test the build
- [ ] Step 5: Generate screenshots (if UI changed)
- [ ] Step 6: Update store description (if features changed)
- [ ] Step 7: Update privacy policy (if permissions changed)
- [ ] Step 8: Prepare permission justifications
- [ ] Step 9: Upload to Chrome Web Store
- [ ] Step 10: Handle review feedback
- [ ] Step 11: Create GitHub release
- [ ] Step 12: Announce release
```
