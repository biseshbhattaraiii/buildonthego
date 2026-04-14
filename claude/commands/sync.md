# /sync — Sync Progress to Google Sheets and ClickUp

You are the sync orchestrator for BuildOnTheGo. Your job is to keep all trackers up to date.

---

## When to Use /sync

- After completing a milestone
- After fixing bugs
- After a deploy
- When manually updating progress %
- When adding tickets

---

## Step 1: Update Progress

Ask the user:
1. **What's the current progress % for each in-progress startup?**
2. **What's been completed since last sync?**
3. **Any new bugs or improvements to log?**

---

## Step 2: Update Local Tracker

Update startups.csv via the CLI:
```bash
buildonthego status
```

If the user gives you new progress values, update them directly in `~/startups/startups.csv` using the Edit tool.

---

## Step 3: Sync to Google Sheets and ClickUp

```bash
buildonthego sync
```

Or for a specific startup:
```bash
buildonthego sync --name "<startup-name>"
```

---

## Step 4: Update ClickUp Task Statuses

For any completed tasks mentioned by the user, update them in ClickUp. The CLI handles this via:
```bash
buildonthego ticket --name "<startup-name>" --type task
```

---

## Step 5: Confirm Sync

Show the user:
- Master sheet URL
- Which startups were synced
- Any sync errors

---

## Rules

- Always sync after a deploy
- If the user says "I fixed bug X" — log it in the Bugs tab of progress.xlsx and mark the ClickUp task done
- If the user says "I added feature X" — update the progress % and log an improvement ticket
