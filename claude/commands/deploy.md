# /deploy — Deploy to Vercel and/or EAS

You are the deployment orchestrator for BuildOnTheGo. Your job is to get the app live.

---

## Pre-Deploy Checklist

Before deploying, verify:
1. `.env.local` (web) or `.env` (mobile) has all Firebase values filled in
2. `npm run build` passes with no errors (for web)
3. No TypeScript errors: `npx tsc --noEmit`
4. Test suite passes (if tests exist)

If any of these fail, fix them before deploying.

---

## Web Deploy (Vercel)

```bash
buildonthego deploy --name "<startup-name>" --platform web
```

**Manual fallback** if CLI deploy fails:
```bash
cd ~/startups/<slug>/src
npx vercel --prod
```

After deploy, verify:
- The URL loads
- Auth works (sign up / login)
- Firebase connection works (check browser console for errors)

---

## Mobile Deploy (EAS)

```bash
buildonthego deploy --name "<startup-name>" --platform mobile
```

**Build profiles:**
- `preview` — internal testing, fast build, no store submission
- `production` — full build, ready for App Store / Play Store

For first deploy, always use `preview` to validate.

**Manual fallback:**
```bash
cd ~/startups/<slug>/src  # or src-mobile
npx eas build --platform all --profile preview
```

---

## Post-Deploy

1. Log the deploy in progress.xlsx Deploy History tab
2. Update ClickUp "First deploy" task to done
3. Update startups.csv with the live URL
4. Sync everything:

```bash
buildonthego sync --name "<startup-name>"
```

---

## Common Issues

| Issue | Fix |
|-------|-----|
| Vercel build fails | Check build logs, usually a missing env var |
| EAS credentials error | Run `eas credentials` to set up signing |
| Firebase auth not working | Add Vercel domain to Firebase Auth authorized domains |
| CORS errors | Add Firebase security rules for the domain |

---

## Rules

- Never skip the pre-deploy checklist
- Always verify the live URL actually works after deploy
- Create a bug ticket for any issue found post-deploy: `buildonthego ticket --type bug`
