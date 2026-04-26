# Marketing & Use Case Guide for Backlog Utils

## Elevator Pitch

Backlog Utils turns repetitive copy-paste and language barriers into one-click workflows. Copy any issue as markdown, export notifications to spreadsheets, and translate comments on the fly — all without leaving Backlog.

---

## Primary Use Cases

### 1. Developers Sharing Issues in Chat
**Pain:** You need to reference a Backlog ticket in Slack or a GitHub PR, but copying the title and key manually is tedious and the link alone lacks context.
**Solution:** Click "Copy MD" to instantly get formatted markdown with the issue key, title, and summary.
**Result:** Cleaner messages, better context, zero typing.

### 2. Project Managers Building Status Reports
**Pain:** Compiling a monthly report means manually opening each notification, copying details, and formatting a spreadsheet.
**Solution:** Click "Copy Noty" to export all current-month notifications as tab-separated values.
**Result:** Import directly into Excel / Google Sheets. A 10-minute task becomes 1 second.

### 3. Multilingual Teams Reading Japanese Tickets
**Pain:** Your team has Japanese-speaking PMs and English-speaking developers. Comments and descriptions are often in Japanese, creating bottlenecks.
**Solution:** Click "Translate" on any comment or article. Choose English (or any of 10 languages). Pick Google Translate for speed or Gemini for nuance.
**Result:** Everyone reads in their preferred language without switching tabs or apps.

### 4. QA / Support Handing Off Issues
**Pain:** Writing handoff notes requires copying multiple fields from Backlog into a bug report template.
**Solution:** "Copy MD" captures the structured summary in one click, ready to paste into Jira, Linear, or internal wikis.

### 5. Non-Technical Stakeholders Reviewing Backlog
**Pain:** Managers who don't read Japanese struggle to review issue comments and updates.
**Solution:** One-click translation makes every comment readable in their language.
**Result:** Inclusive project visibility without hiring translators.

---

## Target Audiences

| Audience | Why They Need It | Top Feature |
|----------|-----------------|-------------|
| Developers | Share ticket context in PRs / Slack | Copy MD |
| Project Managers | Build weekly/monthly status reports | Copy Noty |
| Multilingual Teams | Bridge language gaps in comments | Translate |
| QA Engineers | Document bugs with full context | Copy MD |
| Engineering Managers | Review Japanese team output | Translate |

---

## Key Messages for Different Channels

### Twitter / X (280 chars)
> Tired of manually copying Backlog issues into Slack? Backlog Utils adds a "Copy MD" button to every ticket — one click, clean markdown, zero typing. Also exports notifications to spreadsheets and translates comments. Free. chrome.google.com/webstore/...

### LinkedIn Post
> Managing projects across languages on Backlog.jp? Our new Chrome extension adds three superpowers to your workflow:
> 1. Copy any issue as markdown in 1 click.
> 2. Export monthly notifications as spreadsheet-ready data.
> 3. Translate comments & articles into 10 languages (Google + Gemini).
> No sign-up. No tracking. All local. Try it: [link]

### Reddit / Hacker News
> Show HN: I built a Chrome extension that adds "Copy Markdown" and "Translate" buttons directly into Backlog.jp issue pages. It also exports notifications as TSV for spreadsheet reporting. Uses Google Translate + Gemini in the browser — no API keys, no servers, no tracking.

### Internal Team Announcement
> We now have a Chrome extension to speed up Backlog workflows. Install "Backlog Utils" to copy issues as markdown, export notifications, and translate comments. Settings and cache stay in your browser.

---

## Feature Comparison (Why Backlog Utils vs. Alternatives)

| Task | Without Extension | With Backlog Utils |
|------|-------------------|-------------------|
| Share issue in Slack | Copy key, open ticket, copy title, paste, format | 1 click |
| Monthly notification report | Open each notification manually, copy data | 1 click, paste into Sheets |
| Read a Japanese comment | Open Google Translate in new tab, copy, paste, switch back | 1 click, inline result |
| Preserve technical terms in translation | Manual re-translation | Custom prompt in settings |

---

## Release Checklist (Marketing)

- [ ] Post on personal / company Twitter
- [ ] Share in Backlog user communities (Reddit, Slack, Discord)
- [ ] Submit to Japanese tech forums (if targeting JP users)
- [ ] Write a short blog post: "3 Backlog Utils That Saved Me Hours"
- [ ] Record 30-60s demo video (see VIDEO_SCRIPT.md)
- [ ] Add to Chrome Web Store with 5 screenshots
- [ ] Request reviews from early users after 1 week
