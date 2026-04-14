# CreditFlow Full-Stack System Context

You are a full-stack expert on the CreditFlow platform — both backend and frontend. Use this knowledge to answer questions, debug issues, suggest changes, and write code without re-exploring the codebase.

---

## What Is CreditFlow?

CreditFlow is a **credit repair management SaaS** built for Australian credit repair businesses. It manages:
- Lead capture and qualification
- Client onboarding with document collection
- AI-powered credit report analysis (Gemini 2.0 Flash)
- Dispute letter generation and bureau submission
- Invoice collection via Xero
- Client self-service portal

**Backend**: FastAPI on Google Cloud Run, Firestore database
**Frontend**: Next.js 15 (App Router), Firebase real-time

---

## Repositories

| Repo | Path | Purpose |
|------|------|---------|
| Backend | `/Users/bisheshbhattarai/panthos/creditflow` | FastAPI API Gateway + Cloud Functions |
| Frontend | `/Users/bisheshbhattarai/panthos/creditflow-frontend` | Next.js 15 dashboard + portals |

---

## BACKEND

### Tech Stack
- FastAPI 0.115+, Python 3.11, Uvicorn, Pydantic v2
- Google Cloud Firestore (database), Google Cloud Storage (files)
- Firebase Auth (dashboard users), custom JWT (client portal)
- SendGrid (email), ClickSend (SMS), Xero (invoicing)
- Equifax / Experian / CBCX (credit bureaus, SOAP/XML)
- Google Cloud Tasks (reminders), Pub/Sub (events)
- Gemini AI (credit file parsing via Cloud Function)
- Deployed: Google Cloud Run

### Key Files
| File | Purpose |
|------|---------|
| `api_gateway.py` | Main FastAPI app (~17,400 lines) — all primary endpoints |
| `shared/firestore_client.py` | ALL Firestore CRUD (never call Firestore directly in routes) |
| `shared/email_service.py` | SendGrid email sending |
| `shared/sms_service.py` | ClickSend SMS |
| `shared/activity_logger.py` | Audit trail (50+ activity types) |
| `shared/cloud_tasks_service.py` | Cloud Tasks scheduling |
| `shared/xero_service.py` | Xero OAuth2 + invoice creation |
| `shared/auth_middleware.py` | API key + Firebase token validation |
| `shared/authorization.py` | Resource-level authorization |
| `shared/entity_factories.py` | Entity creation with sensible defaults |
| `shared/reminder_chain_creators.py` | Multi-step reminder sequences |
| `routes/email_intake.py` | n8n PDF email webhook |
| `config/firebase_config.py` | Firebase initialization |

### Authentication
- All requests: `x-api-key` header required
- Dashboard users: Firebase ID token (JWT) in `Authorization: Bearer`
- Client portal: custom session token from OTP verification
- Public routes: `/health`, `/api/leads/submit`, `/api/email-intake`, `/api/sms/*`, `/api/scheduled/*`, webhooks

### Firestore Collections
`companies`, `users`, `leads`, `clients`, `cases`, `disputes`, `team_members`, `reminders`, `case_activities`, `portal_sessions`, `invoices`, `integrations/xero_{companyId}`, `activity_log`

### Core API Endpoints
```
POST   /api/cases/create
GET    /api/cases/{case_id}
POST   /api/cases/{case_id}/send-client-update
POST   /api/cases/{case_id}/approve-loa
GET    /api/cases/stuck
POST   /api/leads/submit
POST   /api/leads/{lead_id}/convert-to-case
POST   /api/leads/{lead_id}/mark-payment-received
GET    /api/disputes/{dispute_id}
POST   /api/disputes/{dispute_id}/generate-pdf
POST   /api/loa/generate
POST   /api/email-intake
POST   /api/sms/send-otp + /api/sms/verify-otp
GET    /api/xero/callback
POST   /api/xero/webhook
```

### Key Workflows
- **Lead → Case**: Lead created → Senior Manager assigned → Welcome SMS/email → Onboarding link → Payment → Credit file → AI analysis → Convert → Disputes auto-created
- **Email Intake**: n8n forwards email+PDF → AI parses → Dedup → Create client/lead/case
- **Reminders**: Multi-step Cloud Tasks chains, cancelled when action completes
- **Case phases**: `onboarding → credit-file → analysis → disputes → filing → tracking → completion`
- **Multi-tenancy**: All resources scoped to `companyId`; Xero tokens stored per-company

### Conventions
- Firestore access only via `shared/firestore_client.py`
- Log every significant action via `shared/activity_logger.py`
- Use `entity_factories.py` when creating new entities
- Always filter queries by `companyId`
- Deferred work via Cloud Tasks — never `asyncio.sleep`

---

## FRONTEND

### Tech Stack
- Next.js 15 (App Router), React 19, TypeScript 5.3
- Tailwind CSS 3 (all styling), Lucide React + Heroicons
- Firebase Firestore (real-time), Firebase Auth (Google OAuth), Firebase Storage
- React Context for global state, `onSnapshot` for real-time
- Recharts (charts), pdf-lib + pdfjs (PDF), easymde (markdown editor)
- @dnd-kit (drag-drop), React Select, date-fns
- PayWay (payment iframe), Xero OAuth callback

### Three Portals
| Portal | Path | Auth | Who Uses It |
|--------|------|------|------------|
| Staff Dashboard | `/dashboard` | Firebase Google OAuth | Case managers, admins |
| Broker Portal | `/broker-portal` | Firebase (isBroker role) | Broker partners |
| Client Portal | `/client-portal` | OTP session token | End clients |

### Key Files
| File | Purpose |
|------|---------|
| `src/lib/firestoreData.ts` | 102KB — ALL real-time subscriptions + queries |
| `src/lib/apiClient.ts` | `authFetch()` — all API calls go through here |
| `src/contexts/AuthContext.tsx` | Staff/broker global auth state |
| `src/contexts/ClientAuthContext.tsx` | Client portal OTP session |
| `src/types/index.ts` | Core TypeScript domain types |
| `src/lib/api.ts` | REST API client functions |
| `src/lib/firebase.ts` | Firebase init + `signInWithGoogle()` |

### State Management
1. **React Context**: `AuthContext` (identity, role, companyId), `ClientAuthContext` (session, active case), `ToastProvider`
2. **Firestore `onSnapshot`**: real-time data in `firestoreData.ts`; always unsubscribe on unmount
3. **`useState`**: local UI state (modals, filters, pagination)

### Authentication Flow
- **Staff/Broker**: `signInWithGoogle()` → check `team_members`/`users` → set `AuthContext`
- **Client**: Phone → `requestOTP()` → verify → session token → `ClientAuthContext`
- **`authFetch()`**: auto-attaches `x-api-key` + auth token (handles both user types)

### Routing
- `src/app/dashboard/[...]` — staff
- `src/app/broker-portal/[...]` — brokers
- `src/app/client-portal/[...]` — clients
- Dynamic routes always use `[id]` = Firestore document ID

### Conventions
- All styling via Tailwind; use `cn()` from `lib/utils.ts` for dynamic classes
- All components are `'use client'`
- All API calls via `authFetch()` from `lib/apiClient.ts`
- Real-time subscriptions from `lib/firestoreData.ts`
- Unsubscribe pattern: `useEffect(() => { return unsubscribeFn }, [deps])`
- Modals: parent owns open state, modal receives `onClose` + `onSuccess` callbacks

### Key Components
- `Sidebar.tsx` — role-gated nav (admin/staff/broker flags)
- `WorkflowProgress.tsx` — case phase visualization
- `LOAApprovalModal.tsx` — complex LOA review workflow
- `ActivityFeed.tsx` — real-time activity log
- `CreateInvoiceModal.tsx` — Xero invoice creation
- `PayWayCreditCardFrame.tsx` — payment iframe
- `ChatBot.tsx` — AI assistant
- `EscalationDashboardPanel.tsx` — escalation alerts

---

## ENVIRONMENT VARIABLES (Backend)

```bash
GOOGLE_CLOUD_PROJECT=creditflow-ai-473905
FIRESTORE_DATABASE=creditflow-staging | creditflow-prod
CREDITFLOW_API_KEY          # All requests
SENDGRID_API_KEY
CLICKSEND_USERNAME + CLICKSEND_API_KEY
SMS_ENABLED=true|false
EQUIFAX_TEST_ENDPOINT / USERNAME / PASSWORD
XERO_REDIRECT_URI
CREDIT_ANALYSIS_SERVICE_URL # Gemini AI cloud function
FRONTEND_URL
CLIENT_PORTAL_FRONTEND_URL
CLOUD_TASKS_LOCATION=australia-southeast1
CLOUD_TASKS_QUEUE
API_GATEWAY_URL
ALLOWED_ORIGINS
```
