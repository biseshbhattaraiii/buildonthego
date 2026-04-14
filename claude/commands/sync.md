# /sync — Sync Progress to Google Sheets and ClickUp

You are the sync orchestrator for BuildOnTheGo. Your job is to keep all trackers up to date.

**IMPORTANT: Never ask the user for API keys or tokens. All credentials are stored in `~/.buildonthego/config.json` and the CLI reads them automatically.**

---

## When to Use /sync

- After completing a milestone
- After fixing bugs
- After a deploy
- When manually updating progress %
- When adding tickets

---

## Step 1: Ask the User

1. **What's the current progress % for each in-progress startup?**
2. **What's been completed since last sync?**
3. **Any new bugs or improvements to log?**

---

## Step 2: Update Local Tracker

If the user gives new progress values, update them directly in `~/startups/startups.csv` using the Edit tool.

---

## Step 3: Run Sync via CLI

Run the following command — it handles both Google Sheets AND ClickUp automatically using keys from `~/.buildonthego/config.json`:

```bash
npx github:biseshbhattaraiii/buildonthego sync
```

Or for a specific startup:
```bash
npx github:biseshbhattaraiii/buildonthego sync --name "<startup-name>"
```

---

## Step 4: Confirm Sync

Show the user:
- Which startups were synced
- ClickUp list URLs
- Any sync errors

---

## Rules

- Always sync after a deploy
- Never prompt for tokens — the CLI reads them from `~/.buildonthego/config.json`
- If sync fails, show the error message and suggest running `buildonthego init` to re-check config
