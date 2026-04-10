# Implementation Plan — PayRequest

## Architecture Overview

```
payrequest/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   └── login/page.tsx        # Magic link login
│   ├── (app)/
│   │   ├── dashboard/page.tsx    # Main dashboard
│   │   └── request/
│   │       ├── new/page.tsx      # Create request form
│   │       └── [id]/page.tsx     # Request detail (public)
│   ├── api/
│   │   ├── requests/route.ts     # POST /api/requests
│   │   └── requests/[id]/route.ts # PATCH /api/requests/[id]
│   ├── layout.tsx
│   └── page.tsx                  # Landing / redirect
├── lib/
│   ├── firebase/
│   │   ├── client.ts             # Firebase client SDK init
│   │   ├── admin.ts              # Firebase Admin SDK init (server)
│   │   └── requests.ts           # Firestore CRUD for PaymentRequests
│   ├── validations.ts            # Shared validation logic
│   └── utils.ts                  # formatCurrency, formatDate, etc.
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── RequestCard.tsx           # Dashboard list card
│   ├── RequestDetail.tsx         # Full detail view
│   ├── PaymentSimulation.tsx     # Pay flow with loading state
│   ├── StatusBadge.tsx           # Color-coded status pill
│   └── ExpirationCountdown.tsx   # Live countdown timer
├── hooks/
│   ├── useRequests.ts            # Firestore onSnapshot for dashboard
│   └── useAuth.ts               # Auth state hook
├── types/
│   └── index.ts                  # PaymentRequest, User interfaces
├── e2e/
│   ├── auth.spec.ts
│   ├── create-request.spec.ts
│   ├── dashboard.spec.ts
│   ├── pay-request.spec.ts
│   └── expiration.spec.ts
└── playwright.config.ts
```

---

## Implementation Phases

### Phase 1: Foundation (T001–T004)

**T001 — Project Bootstrap**
- `npx create-next-app@latest payrequest --typescript --tailwind --app`
- Install dependencies: `firebase`, `firebase-admin`, `shadcn/ui`, `lucide-react`, `date-fns`
- Setup `.env.local` with Firebase config vars
- Initialize shadcn: `npx shadcn-ui@latest init`
- Add shadcn components: `button`, `input`, `textarea`, `badge`, `card`, `dialog`, `toast`, `skeleton`, `tabs`

**T002 — Firebase Setup**
- Create Firebase project (or use existing)
- Enable: Authentication (Email Link), Firestore Database
- Write `lib/firebase/client.ts` (client SDK, singleton pattern)
- Write `lib/firebase/admin.ts` (Admin SDK for API routes)
- Write Firestore security rules (see spec F4 / constitution)
- Deploy security rules via Firebase CLI

**T003 — TypeScript Types & Utilities**
- Define `PaymentRequest` and `User` interfaces in `types/index.ts`
- Write `lib/utils.ts`:
  - `formatCurrency(cents: number): string` → "$10.50"
  - `formatDate(timestamp: Timestamp): string`
  - `getExpiresAt(createdAt: Date): Date` → +7 days
  - `isExpired(expiresAt: Timestamp): boolean`
  - `getCountdownText(expiresAt: Timestamp): string`
- Write `lib/validations.ts`:
  - `validateEmail(email: string): boolean`
  - `validatePhone(phone: string): boolean` → E.164
  - `validateContact(contact: string): boolean`
  - `validateAmountCents(cents: number): boolean`

**T004 — Auth Flow**
- Implement `hooks/useAuth.ts` (wraps `onAuthStateChanged`)
- Implement `app/(auth)/login/page.tsx`:
  - Email input + "Send Login Link" button
  - Calls `sendSignInLinkToEmail`
  - Saves email to `localStorage` for link completion
  - Shows success/error states
- Implement magic link handler in `app/page.tsx`:
  - Check `isSignInWithEmailLink` on load
  - Complete sign-in, create user doc in Firestore if new
  - Redirect to `/dashboard`
- Add auth middleware (`middleware.ts`): redirect unauthenticated users away from `/dashboard` and `/request/new`

---

### Phase 2: Core Features (T005–T008)

**T005 — Firestore Service Layer**

Write `lib/firebase/requests.ts` with these functions:
```typescript
createRequest(data: CreateRequestInput): Promise<string>
getRequest(id: string): Promise<PaymentRequest | null>
updateRequestStatus(id: string, action: 'pay' | 'decline' | 'cancel', userId: string): Promise<void>
subscribeToOutgoingRequests(userId: string, callback: (requests: PaymentRequest[]) => void): Unsubscribe
subscribeToIncomingRequests(userContact: string, userId: string, callback: (requests: PaymentRequest[]) => void): Unsubscribe
```

Note on incoming requests query: query by `recipientContact` (email) since we don't always have `recipientUid`. After user logs in, update `recipientUid` on matching requests.

**T006 — API Routes**

`app/api/requests/route.ts` (POST):
1. Extract Bearer token from `Authorization` header
2. Verify with `admin.auth().verifyIdToken(token)`
3. Validate body (recipientContact, amountCents, note)
4. Create Firestore document via service layer
5. Return `{ id, shareableLink }`

`app/api/requests/[id]/route.ts` (PATCH):
1. Verify auth token
2. Fetch request from Firestore
3. Validate action permissions (sender vs recipient, status checks, expiry check)
4. Update status in Firestore
5. Return updated request

**T007 — Request Creation Form**

`app/(app)/request/new/page.tsx`:
- Controlled form with React state
- Recipient field: input + format hint below
- Amount field: custom currency input component
  - On change: strip non-numeric, store as string
  - On blur: format to "XX.XX" display
  - Internal state stores cents
- Note field: textarea with character counter
- Inline validation errors (show on blur or submit attempt)
- Submit → POST `/api/requests` → redirect to dashboard with toast

**T008 — Dashboard**

`app/(app)/dashboard/page.tsx`:
- Two tabs: Outgoing / Incoming
- Uses `useRequests` hook (Firestore `onSnapshot`)
- Skeleton loader while initial data loads
- `RequestCard` component per item
- Search: filter on `recipientContact` or `senderName` client-side
- Status filter dropdown
- Empty states per tab

`components/RequestCard.tsx`:
- Shows all card fields per spec F3
- "Cancel" button for outgoing pending → opens confirmation dialog
- "Pay" / "Decline" buttons for incoming pending

---

### Phase 3: Detail View & Payment Simulation (T009–T010)

**T009 — Request Detail Page**

`app/(app)/request/[id]/page.tsx`:
- Server component fetches request by ID (for SEO / public access)
- Shows all detail fields per spec F4
- `ExpirationCountdown` component (client component, updates every minute)
- Copy link button (clipboard API)
- Conditional action buttons based on auth state and user role
- 404 handling for invalid IDs

`components/ExpirationCountdown.tsx`:
- Client component
- Uses `setInterval` (60s) to update countdown text
- Reads `expiresAt` timestamp, calls `getCountdownText()`

**T010 — Payment Simulation**

`components/PaymentSimulation.tsx`:
- "Pay $X.XX" button
- On click:
  1. Set `isProcessing = true`, disable button
  2. `await sleep(2500)`
  3. Call `PATCH /api/requests/[id]` with `{ action: 'pay' }`
  4. On success: show success UI (checkmark + message)
  5. On error: show toast, re-enable button
- "Decline" button → confirmation dialog → PATCH with `{ action: 'decline' }`
- "Cancel" button (sender) → confirmation dialog → PATCH with `{ action: 'cancel' }`

---

### Phase 4: Polish & E2E Tests (T011–T013)

**T011 — UI Polish**
- `StatusBadge` component with correct colors per spec
- Toast notifications (shadcn Toaster) wired up for all events
- Responsive layout audit (test at 375px, 768px, 1280px)
- Loading skeletons on dashboard
- Confirmation dialogs for destructive actions
- Copy-to-clipboard with "Copied!" feedback

**T012 — Playwright E2E Tests**

Setup `playwright.config.ts`:
```typescript
{
  use: {
    baseURL: 'http://localhost:3000',
    video: 'on',           // Always record video
    screenshot: 'on',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
  }
}
```

Test files:

`e2e/auth.spec.ts`
- [ ] Unauthenticated user redirected to /login from /dashboard
- [ ] Login page renders correctly
- [ ] (Mock auth) Authenticated user redirected to dashboard

`e2e/create-request.spec.ts`
- [ ] Form renders with all fields
- [ ] Empty submit shows validation errors
- [ ] Invalid email shows error
- [ ] Invalid amount (0) shows error
- [ ] Amount > $10,000 shows error
- [ ] Note > 280 chars shows error
- [ ] Valid submission creates request and redirects to dashboard

`e2e/dashboard.spec.ts`
- [ ] Dashboard loads with Outgoing tab active
- [ ] Can switch to Incoming tab
- [ ] Status filter works
- [ ] Search filter works
- [ ] Empty state shown when no requests
- [ ] Skeleton shown during load

`e2e/pay-request.spec.ts`
- [ ] Request detail page shows correct information
- [ ] Pay button shows loading state for ~2.5s
- [ ] Success state shown after payment
- [ ] Status updates to Paid in dashboard
- [ ] Decline button shows confirmation dialog
- [ ] Declining updates status to Declined

`e2e/expiration.spec.ts`
- [ ] Expired request shows "Expired" status (mock expiresAt in past)
- [ ] Pay/Decline buttons disabled for expired request
- [ ] Countdown shows correct text for pending request

**T013 — Deployment**
- Push to GitHub (public repo)
- Connect to Vercel
- Add environment variables in Vercel dashboard
- Deploy Firebase security rules
- Smoke test on production URL
- Record final E2E test video (playwright `--reporter=html` + video artifacts)

---

## Environment Variables

```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (Server only)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# App
NEXT_PUBLIC_APP_URL=https://payrequest.vercel.app
```

---

## Task Summary

| Task | Description | Estimated Time |
|------|-------------|----------------|
| T001 | Project bootstrap | 20 min |
| T002 | Firebase setup | 25 min |
| T003 | Types & utilities | 20 min |
| T004 | Auth flow | 30 min |
| T005 | Firestore service layer | 25 min |
| T006 | API routes | 25 min |
| T007 | Request creation form | 30 min |
| T008 | Dashboard | 35 min |
| T009 | Request detail page | 30 min |
| T010 | Payment simulation | 20 min |
| T011 | UI polish | 25 min |
| T012 | E2E tests | 40 min |
| T013 | Deployment | 20 min |
| **Total** | | **~5.5 hours** |

---

## Claude Code Usage Notes

When starting with Claude Code, run these slash commands in order:
1. `/spec-kit:constitution` → reference `constitution.md`
2. `/spec-kit:spec` → reference `spec.md`
3. `/spec-kit:plan` → reference this file
4. `/spec-kit:tasks` → let Claude break tasks into subtasks
5. `/spec-kit:implement T001` → implement task by task

Always commit after each task completes before moving to the next.
