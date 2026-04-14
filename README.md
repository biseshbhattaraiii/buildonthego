# BuildOnTheGo

> Build startups on the go — spec-driven, AI-powered, fully automated.

Whether you're in a car, cafe, office, or home — capture ideas and go from thought to deployed app.

---

## Install

```bash
npx github:biseshbhattaraiii/buildonthego
```

Or one-liner via install script:
```bash
curl -fsSL https://raw.githubusercontent.com/biseshbhattaraiii/buildonthego/main/install.sh | bash
```

---

## Setup (first time only)

```bash
buildonthego init
```

You'll be prompted for:
| Key | Where to get it |
|-----|-----------------|
| GitHub Token | github.com/settings/tokens → `repo` + `workflow` |
| ClickUp Token | app.clickup.com/settings/apps |
| Google Service Account JSON | Google Cloud Console → Sheets API + Drive API → Service Account |
| Vercel Token | vercel.com/account/tokens |
| Expo Token | expo.dev/settings/access-tokens |
| Firebase | Auto-handled via `firebase login` |

---

## Commands

| Command | Description |
|---------|-------------|
| `buildonthego idea` | Capture a new startup idea — validates, builds spec, creates ClickUp tasks + Google Sheet |
| `buildonthego scaffold` | Scaffold project — Next.js or Expo with Firebase wired up |
| `buildonthego deploy` | Deploy web to Vercel or mobile to EAS |
| `buildonthego sync` | Sync progress to Google Sheets and ClickUp |
| `buildonthego status` | View all startups with progress bars |
| `buildonthego ticket` | Add a bug, improvement, or task ticket |

---

## Claude Code Slash Commands

After `buildonthego init`, these are available in any Claude Code session:

| Command | What it does |
|---------|-------------|
| `/idea` | AI validates your idea, asks smart questions, builds a complete spec |
| `/build` | Scaffolds project, builds core structure, wires up Firebase |
| `/deploy` | Runs pre-deploy checks, deploys, verifies the live app |
| `/sync` | Updates all trackers — Sheets, ClickUp, local CSV |

---

## Folder Structure

```
~/startups/
├── startups.csv              ← master tracker (all startups)
└── {app-slug}/
    ├── spec.md               ← product spec
    ├── progress.xlsx         ← 5-tab Excel: Overview, Tickets, Bugs, Improvements, Deploy History
    ├── docs/
    │   ├── test-cases.md
    │   └── roadmap.md
    ├── src/                  ← web app (Next.js)
    └── src-mobile/           ← mobile app (Expo) — if type = both
```

---

## Integrations

| Service | Used For |
|---------|---------|
| ClickUp | Tasks, bugs, tickets — `startups` space, one list per app |
| Google Sheets | Master progress sheet + per-startup sheet |
| Vercel | Web app deployment |
| EAS (Expo) | Mobile build + deployment |
| Firebase | Auth, Firestore, Storage — auto-created per app |
| GitHub | Repo creation + code push |

---

## Tech Stack

**Web:** Next.js 14 · TailwindCSS · Firebase · Vercel
**Mobile:** Expo · React Native · NativeWind · Firebase · EAS

---

## Workflow

```
1. buildonthego idea          (or /idea in Claude Code)
   └── validates idea
   └── generates spec.md + test-cases.md + roadmap.md
   └── creates ClickUp list + tasks
   └── creates Google Sheet

2. buildonthego scaffold      (or /build in Claude Code)
   └── scaffolds Next.js / Expo project
   └── wires up Firebase
   └── creates GitHub repo

3. buildonthego deploy        (or /deploy in Claude Code)
   └── deploys to Vercel / EAS
   └── logs deploy in progress.xlsx

4. buildonthego sync          (or /sync in Claude Code)
   └── syncs everything to Google Sheets + ClickUp
```
