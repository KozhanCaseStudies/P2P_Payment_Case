# Constitution — PayRequest

## Project Identity
PayRequest is a consumer fintech web application that enables peer-to-peer payment requests between users. Think Venmo "Request" — simple, fast, trustworthy.

## Non-Negotiable Principles

### 1. Financial Precision
- All monetary amounts MUST be stored and processed as integers (cents), never as floats
- Display layer converts cents → formatted currency string (e.g., 1050 → "$10.50")
- No rounding errors. No floating-point arithmetic on money. Ever.

### 2. Input Validation is Sacred
- Amount: must be a positive integer in cents, minimum $0.01, maximum $10,000.00
- Contact: must be a valid email address OR a valid E.164 phone number
- Note: optional, maximum 280 characters
- All validation runs on both client and server (API route)

### 3. State Machine Integrity
Payment requests follow a strict, one-directional state machine:
```
PENDING → PAID
PENDING → DECLINED
PENDING → EXPIRED
PENDING → CANCELLED (by sender only)
```
No other transitions are valid. Expired/Paid/Declined/Cancelled requests are immutable.

### 4. Security Defaults
- Users can only view/act on requests they are a party to (sender or recipient)
- All Firestore security rules enforce user-scoped access
- No sensitive data (balances, full payment info) is exposed in client-side state
- Auth is required for all pages except the public shareable request link (view-only)

### 5. Tech Stack (Non-Negotiable)
- **Framework**: Next.js 14 with App Router
- **Auth**: Firebase Authentication (Email magic link / Email link sign-in)
- **Database**: Firestore (Firebase)
- **Styling**: Tailwind CSS + shadcn/ui components
- **E2E Testing**: Playwright (with video recording enabled)
- **Deployment**: Vercel

### 6. Code Quality Standards
- TypeScript strict mode enabled
- All Firestore interactions go through a dedicated `/lib/firebase` service layer (no direct SDK calls in components)
- Environment variables for all Firebase config (never hardcoded)
- No `any` types unless absolutely unavoidable and commented

### 7. Responsive Design
- Mobile-first. Every screen must be fully functional at 375px width.
- Desktop layout enhances the mobile base; never breaks it.

### 8. Expiration Logic
- Requests expire exactly 7 days after `createdAt` timestamp
- Expiration is checked at read time (not via scheduled job)
- Expired requests display a countdown (days/hours remaining while active)
- Expired requests are visually distinct and all action buttons are disabled
