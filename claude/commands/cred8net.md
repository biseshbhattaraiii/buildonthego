# Cre8net Mobile — Full-Stack System Context

You are a full-stack expert on the **Cre8net** mobile platform. Use this knowledge to answer questions, debug issues, suggest changes, and write code without re-exploring the codebase.

---

## What Is Cre8net?

Cre8net is a **decentralized creator economy platform** built on Expo/React Native. It enables:

- **Content creation & sharing** — posts (reviews, guides, comparisons) with media, hashtags, location, and mentions
- **Task & escrow system** — peer-to-peer task posting with GVC escrow payments, bid/proposal management, dispute resolution
- **Wallet & token system** — GVC (platform token) for payments/tips, CRP (Creator Reputation Points) earned through engagement; Solana blockchain for wallet management
- **Reputation & tier system** — trust point-based membership tiers (Bronze → Silver → Gold → Platinum → Diamond) with fee discounts and verified badges
- **Messaging** — 1-to-1 and group conversations with push notifications
- **Discovery & search** — posts, users, tasks, hashtags with filters and trending content
- **Creator dashboard** — analytics, earnings tracking, content management
- **KYC & compliance** — identity verification via DIDIT SDK

**Mobile repo**: `/Users/bisheshbhattarai/panthos/cred8net-mobile`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo 54, React Native 0.81.5, React 19.1.0 |
| Language | TypeScript 5.9+ (strict mode) |
| Navigation | Expo Router (file-based) + React Navigation 7 |
| State | Zustand 5.0.8 |
| Styling | NativeWind 4.2 + Tailwind CSS 3.4 |
| Database | Firebase Firestore (custom DB: "treasury-staging") |
| Auth | Firebase Auth (email/password + Google Sign-In) |
| Storage | Firebase Storage |
| Push Notifications | Firebase Cloud Messaging (FCM) + expo-notifications |
| HTTP | Axios 1.13 |
| Lists | @shopify/flash-list (replaces FlatList everywhere) |
| Animations | Reanimated 4.1 + Gesture Handler 2.28 |
| Messaging UI | react-native-gifted-chat 3.2 |
| KYC | @didit-protocol/sdk-react-native 3.0 |
| Local Cache | AsyncStorage 2.2 |
| Fonts | Inter (400/500/600/700) via Expo Google Fonts |

---

## Project Structure

```
cred8net-mobile/
├── app/                    # Expo Router — file-based routing
│   ├── _layout.tsx         # Root stack layout
│   ├── index.tsx           # Welcome/auth redirect
│   ├── (tabs)/             # Main tab navigator
│   │   ├── index.tsx       # Search/discovery feed
│   │   ├── messages.tsx    # Chat list
│   │   ├── tasks.tsx       # Task management
│   │   ├── earnings.tsx    # Wallet & earnings
│   │   └── profile.tsx     # User profile
│   ├── auth/               # Login, signup
│   ├── onboarding/         # Multi-step onboarding
│   ├── kyc/                # KYC verification flow
│   ├── chat/[chatId]       # Chat detail
│   ├── task/[id]           # Task detail & creation
│   ├── post/[id]           # Post detail & creation
│   ├── profile/[userId]    # Other user profiles
│   ├── settings/           # App settings
│   ├── dashboard/          # Creator analytics
│   └── notifications.tsx   # Notification center
│
├── components/             # ~57 reusable UI components
├── hooks/                  # ~50 custom React hooks
├── store/                  # Zustand global stores
├── services/               # Business logic & Firebase ops (~20 files)
├── api/                    # HTTP layer (wallet service via Axios)
├── db/                     # Firebase init (firestore.ts, storage.ts)
├── utils/                  # Pure utilities (colors, formatting, etc.)
├── types/                  # TypeScript interfaces (~11 files)
└── constants/              # Theme, trust tiers, earnings constants
```

---

## Navigation

**Tab Navigator** (always visible after auth):
- **Search** (`app/(tabs)/index.tsx`) — main feed, FlashList of PostCards
- **Messages** (`app/(tabs)/messages.tsx`) — chat list with unread badge
- **Tasks** (`app/(tabs)/tasks.tsx`) — task browsing & bid submission
- **Earnings** (`app/(tabs)/earnings.tsx`) — GVC/CRP wallet view
- **Profile** (`app/(tabs)/profile.tsx`) — avatar badge, notification count

**Stack routes**: `chat/[chatId]`, `task/[id]`, `post/[id]`, `profile/[userId]`, `auth/*`, `onboarding/*`, `kyc/*`, `settings/*`, `dashboard/*`

---

## State Management (Zustand)

All stores are global singletons. Use selector pattern: `const value = useStore(s => s.property)`.

| Store | File | Key State |
|-------|------|-----------|
| User | `store/userStore.ts` | uid, username, avatar, tier, trustPoints |
| Likes | `store/useLikesStore.ts` | Set<postId> (O(1) lookup, persisted per user) |
| Posts | `store/usePostStore.ts` | drafts, form state (persisted) |
| Saved Posts | `store/useSavedPostsStore.ts` | Set<postId> (persisted) |
| Chats | `store/useChatStore.ts` | chat list, cached messages |
| Messages | `store/useMessagesStore.ts` | message thread cache |
| Notifications | `store/useNotificationStore.ts` | items, unread count |
| Tier | `store/useTierStore.ts` | tier name, benefits, next threshold |
| Wallet | `store/walletStore.ts` | GVC balance, CRP balance |
| Earnings | `store/earningsStore.ts` | earnings, trust points, history |

**Data flow**: `Firestore change → listener callback → Zustand store → component re-render`

---

## Firestore Patterns

**Database**: `"treasury-staging"` (not the default Firestore instance)

**Always use helpers from `utils/firestore.ts`** — never call Firestore directly in components or hooks.

```typescript
// Real-time subscription
subscribeToCollection(collection, constraints, callback) → unsubscribe()

// Paginated fetch
fetchPaginated(collection, constraints, limit, lastDoc) → { data, lastDoc }

// Single doc
fetchDataFromFirestore(collection, docId) → T | null

// Write
updateDataAtFirestore(collection, docId, { field: value })
incrementField(collection, docId, field, amount)
batchWriteFirestore(operations) → Promise<void>

// Field values
fieldValue.serverTimestamp()
fieldValue.arrayUnion([items])
fieldValue.arrayRemove([items])
```

**Firestore field naming**: always `snake_case` (user_id, created_at, display_name).

**Collections**: `users`, `posts`, `tasks`, `comments`, `notifications`, `chats`, `messages`, `transactions`, `proposals`, `bids`, `reviews`

---

## HTTP API (Wallet Service)

Configured in `api/http.ts` — Axios instance with Bearer token auth.
All endpoints defined in `api/endpoints.ts` as `ApiService` class.

```
GET  /v1/user/wallet/balances/crp
GET  /v1/user/wallet/balances/gvc
POST /v1/wallet/create
POST /v1/wallet/transfer      (Solana address + amount)
POST /v1/rewards/redeem
```

---

## Authentication Flow

1. Firebase Auth (email/password or Google Sign-In)
2. `useAuth` hook checks Firestore `/users/{uid}` on auth state change
3. If new user: create doc, award 100 trust points, call `ensureWallet()`
4. Store `userId` in AsyncStorage → set `isAuthenticated(true)` in userStore
5. **Special**: daily login streak tracked — award 3 CRP every 7 consecutive days
6. **Logout**: remove push token from Firestore, clear AsyncStorage, clear all stores, `signOut()`

---

## Key Services

| Service | File | Responsibility |
|---------|------|---------------|
| App Init | `services/appInitializer.ts` | Bootstrap on startup |
| Tasks | `services/taskService.ts` | Task CRUD + real-time subscriptions |
| Posts | `services/postService.ts` | Post operations |
| Chat | `services/chatService.ts` | Messaging operations |
| Wallet | `services/walletService.ts` | GVC/CRP balances + transfers |
| Notifications | `services/notificationService.ts` | FCM + local scheduling |
| Trust Points | `services/trustPointsService.ts` | Points calc + tier logic |
| Push Tokens | `services/pushTokenService.ts` | FCM token management |
| Proposals | `services/proposalService.ts` | Task proposal/bid handling |
| CRP | `services/crpService.ts` | CRP reward logic |
| KYC | `services/kycService.ts` | DIDIT SDK integration |

---

## Key Components

| Component | Purpose |
|-----------|---------|
| `PostCard` | Main content card — post display with like/comment/share |
| `CommentItem` | Comment with nested replies, like action |
| `Avatar` | User avatar with optional tier badge |
| `Button` | Primary/secondary/outline/ghost variants |
| `SearchBar` | Search input with autocomplete & history |
| `FilterDropdown` | Multi-select filter panel |
| `NotificationButton` | Bell icon with unread count badge |
| `EmptyState` | No-content fallback (icon + title + description) |

---

## Design System

**Theme**: Dark mode only (enabled in app.json).

**Brand Colors** (`utils/colors.ts`):
```
gold:           #C99F43   // primary CTAs, badges, highlights
greenEarnings:  #2E7D32   // positive values, success states
teal:           #4A7C6F   // trust tier badges
screenBg:       #2B2B2B   // screen & card backgrounds
divider:        #3D3D3D   // borders, separators
inputBg:        #333333   // form inputs
textPrimary:    #FFFFFF
textSecondary:  #E6E6E3
textMuted:      #9CA3AF
successGreen:   #16A34A
errorRed:       #DC2626
warningAmber:   #D97706
infoBlue:       #60A5FA
```

**Responsive utilities** (`utils/responsive.ts`):
```typescript
wp(50)  // 50% of screen width
hp(20)  // 20% of screen height
```

**Tailwind custom config** (`tailwind.config.js`):
- `primary` color with 11-shade gold palette
- Custom spacing: 18, 22, 88, 100, 112, 128
- Custom border radius: 4xl, 5xl
- Custom shadows: card, card-lg, primary
- Custom animations: fade-in, fade-out, slide-up, slide-down

---

## Coding Conventions

- **Firestore fields**: `snake_case`
- **React components/types**: `PascalCase`
- **Functions/hooks/variables**: `camelCase`
- **Constants**: `UPPER_CASE`
- **Path aliases**: `@/*` maps to repo root
- **Lists**: always use `FlashList` from `@shopify/flash-list`, never `FlatList`
- **Images**: always use `expo-image` (with `cachePolicy`), never `Image` from React Native
- **Fonts**: always use `Inter` variant via `useFonts` hook
- **Server time**: always use `fieldValue.serverTimestamp()`, never `new Date()`
- **Hooks pattern**: hooks handle state + side effects; services handle Firestore/API logic; components are UI-only
- **Error handling**: `console.error` for logging; user-facing errors via CustomAlert or Toast

---

## Trust Tier System

Defined in `constants/trustTiers.ts`:

| Tier | Trust Points | Benefits |
|------|-------------|---------|
| Bronze | 0–999 | Base access |
| Silver | 1,000–4,999 | Reduced fees |
| Gold | 5,000–14,999 | Verified badge |
| Platinum | 15,000–49,999 | Priority support |
| Diamond | 50,000+ | Max discounts, exclusive features |

Trust points awarded for: account creation (100), content creation, engagement (likes, comments), completed tasks, daily login streaks (3 CRP/7-day streak).

---

## Performance Patterns

- `FlashList` for all virtualized lists
- `expo-image` with `cachePolicy: 'memory-disk'`
- `Set<string>` in likes/saved stores for O(1) lookup
- `useMemo` for expensive computations
- `startAfter` cursor for Firestore pagination
- Firestore listeners always unsubscribed in `useEffect` cleanup
- AsyncStorage caching to reduce cold-start Firebase reads
