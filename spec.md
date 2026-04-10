# Spec — PayRequest: P2P Payment Request Feature

## Overview
PayRequest allows authenticated users to request money from other people via email or phone number. Recipients receive a notification and can pay, decline, or let the request expire. Senders can monitor their requests and cancel pending ones.

---

## Data Models

### User
```typescript
interface User {
  uid: string;           // Firebase Auth UID
  email: string;
  displayName: string;
  createdAt: Timestamp;
}
```

### PaymentRequest
```typescript
interface PaymentRequest {
  id: string;            // Auto-generated Firestore doc ID
  senderId: string;      // Firebase Auth UID of requester
  senderEmail: string;   // Denormalized for display
  senderName: string;    // Denormalized for display
  recipientContact: string;  // Email or E.164 phone
  recipientUid?: string;     // Set when recipient logs in and matches
  amountCents: number;   // Amount in cents (integer). e.g., 1050 = $10.50
  note?: string;         // Optional, max 280 chars
  status: 'pending' | 'paid' | 'declined' | 'expired' | 'cancelled';
  shareableLink: string; // Public URL: /request/[id]
  createdAt: Timestamp;
  expiresAt: Timestamp;  // createdAt + 7 days
  updatedAt: Timestamp;
  paidAt?: Timestamp;    // Set when status → paid
}
```

### Firestore Collection Structure
```
/users/{uid}
/paymentRequests/{requestId}
```

### Firestore Security Rules (pseudo-code)
```
/paymentRequests/{requestId}
  - read: auth.uid == resource.senderId OR auth.uid == resource.recipientUid OR request is public read (shareableLink access)
  - create: auth.uid == request.senderId
  - update: 
      sender can set status = 'cancelled' (only if current status = 'pending')
      recipient can set status = 'paid' or 'declined' (only if current status = 'pending' and not expired)
```

---

## Pages & Routes

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/` | Landing / redirect to dashboard if logged in | No |
| `/login` | Magic link login page | No |
| `/dashboard` | Main dashboard (outgoing + incoming requests) | Yes |
| `/request/new` | Create new payment request form | Yes |
| `/request/[id]` | Request detail view (public shareable link) | No (view-only) / Yes (actions) |

---

## Feature Specifications

### F1: Authentication

**Magic Link Flow:**
1. User enters email on `/login`
2. Firebase sends sign-in link to email
3. User clicks link → redirected back to app → auto-authenticated
4. New users are created in `/users/{uid}` on first login
5. Authenticated users are redirected to `/dashboard`

**Validation:**
- Email must be a valid format
- Show loading state while sending magic link
- Show success message: "Check your email for a sign-in link"
- Show error if Firebase fails

**Edge Cases:**
- If user navigates to `/login` while already authenticated → redirect to `/dashboard`
- Magic link expires after 1 hour (Firebase default)
- If link is expired/invalid → show error with "Request new link" CTA

---

### F2: Request Creation

**Route:** `/request/new`

**Form Fields:**
| Field | Type | Validation |
|-------|------|-----------|
| Recipient | Text input | Required. Valid email OR valid E.164 phone (+1XXXXXXXXXX). Show format hint. |
| Amount | Currency input | Required. Min: $0.01. Max: $10,000.00. Decimal allowed (stored as cents). |
| Note | Textarea | Optional. Max 280 characters. Character counter shown. |

**On Submit:**
1. Client-side validation runs first (show inline errors, don't submit if invalid)
2. POST to `/api/requests` with `{ recipientContact, amountCents, note }`
3. API creates Firestore document:
   - Generates unique `id`
   - Sets `status: 'pending'`
   - Sets `expiresAt = createdAt + 7 days`
   - Generates `shareableLink = https://{domain}/request/{id}`
4. On success → redirect to `/dashboard` with success toast: "Request sent!"
5. On error → show error message inline, keep form filled

**Validation Error Messages:**
- Empty recipient: "Please enter an email or phone number"
- Invalid format: "Please enter a valid email (e.g. john@example.com) or phone number (e.g. +14155552671)"
- Amount = 0: "Amount must be greater than $0.00"
- Amount > $10,000: "Maximum request amount is $10,000.00"
- Note too long: "Note must be 280 characters or less"

**Edge Cases:**
- User cannot request money from themselves (senderId === recipientContact match) → show error
- Amount field: prevent non-numeric input, format as currency on blur (e.g. "10.5" → "$10.50")

---

### F3: Dashboard

**Route:** `/dashboard`

**Layout:**
- Two tabs: "Outgoing" (requests I sent) and "Incoming" (requests sent to me)
- Each tab shows a list of PaymentRequest cards
- Search bar: filter by recipient/sender name or email (client-side)
- Filter dropdown: All / Pending / Paid / Declined / Expired / Cancelled

**Outgoing Request Card:**
- Recipient contact
- Amount (formatted, e.g. "$25.00")
- Status badge (color-coded — see below)
- Time ago + expiration countdown if pending
- CTA: "Cancel" button (only shown if status = 'pending')
- Clicking card → `/request/[id]`

**Incoming Request Card:**
- Sender name + email
- Amount
- Status badge
- Time ago
- CTAs: "Pay" button + "Decline" button (only shown if status = 'pending' and not expired)
- Clicking card → `/request/[id]`

**Status Badge Colors:**
| Status | Color |
|--------|-------|
| Pending | Yellow / Amber |
| Paid | Green |
| Declined | Red |
| Expired | Gray |
| Cancelled | Gray / Strikethrough |

**Empty States:**
- Outgoing empty: "You haven't sent any requests yet. [Send a Request →]"
- Incoming empty: "No one has requested money from you."
- No results after filter: "No requests match your filter."

**Real-time Updates:**
- Use Firestore `onSnapshot` listeners so status changes appear instantly without page refresh

**Edge Cases:**
- If a pending request has passed `expiresAt` but status is still `pending` in DB → display as "Expired" on the client (read-time expiration check)
- Dashboard loads with skeleton loader while fetching

---

### F4: Request Detail View

**Route:** `/request/[id]`

**Publicly accessible (no auth required for viewing).**

**Content:**
- Sender name and email
- Recipient contact
- Amount (large, prominent display)
- Note (if present)
- Status badge
- Created at timestamp (formatted: "April 3, 2026 at 2:30 PM")
- Expiration info:
  - If pending and not expired: "Expires in X days, Y hours"
  - If pending and expired: "This request has expired"
  - If paid: "Paid on [date]"
  - If declined: "Declined"
  - If cancelled: "Cancelled by sender"

**Action Buttons (conditional):**

For **incoming** requests (auth.uid matches recipientUid OR recipientContact):
- If `pending` and not expired:
  - **"Pay $X.XX"** → triggers payment simulation (F5)
  - **"Decline"** → sets status to `declined`, shows confirmation
- If any other status: buttons hidden

For **outgoing** requests (auth.uid matches senderId):
- If `pending` and not expired:
  - **"Cancel Request"** → confirmation dialog → sets status to `cancelled`
- If any other status: no buttons, just status display

For **unauthenticated** users:
- Show request details (amount, sender, note)
- Show "Sign in to pay or decline this request" CTA
- After login, redirect back to this URL

**Shareable Link:**
- "Copy Link" button → copies `shareableLink` to clipboard → shows "Copied!" tooltip

**Edge Cases:**
- Request not found (invalid ID) → 404 page with "This request doesn't exist or has been removed"
- Request is expired but DB still shows `pending` → display "Expired" at read time, disable all action buttons
- User who is neither sender nor recipient views the page → show read-only view with no action buttons

---

### F5: Payment Fulfillment Simulation

**Trigger:** User clicks "Pay $X.XX" on an incoming request detail page.

**Flow:**
1. Button shows loading spinner: "Processing payment…"
2. Wait 2.5 seconds (simulated processing delay)
3. Update Firestore: `status = 'paid'`, `paidAt = now()`, `updatedAt = now()`
4. Show success state:
   - Green checkmark animation
   - "Payment of $X.XX sent successfully!"
   - Button replaced with "Done" (navigates back to dashboard)
5. Both sender and recipient dashboards update in real-time via Firestore listeners

**Error Handling:**
- If Firestore update fails → show error toast: "Payment failed. Please try again."
- Button re-enabled after error

**Edge Cases:**
- If user clicks "Pay" on an already-expired request (race condition) → show error: "This request has expired and can no longer be paid"
- Double-click prevention: button disabled immediately on first click
- Network loss during simulation: show error state, do not partially update

---

### F6: Request Expiration

**Logic:**
- `expiresAt = createdAt + (7 * 24 * 60 * 60 * 1000)ms`
- Expiration is **read-time**: no cron job needed
- On every read of a PaymentRequest, if `status === 'pending'` and `now() >= expiresAt` → treat as `expired` in UI
- Optional: write `status = 'expired'` to Firestore when user first views an expired request (lazy expiration)

**Countdown Display (on detail view and dashboard card):**
- While pending and >24h remaining: "Expires in X days"
- While pending and <24h remaining: "Expires in Xh Ym" (hours and minutes)
- While pending and <1h remaining: "Expires in Xm" (minutes only, show in red)
- Expired: "Expired X days ago"

**Edge Cases:**
- System clock manipulation on client is not a security concern since server-side Firestore rules don't enforce expiration (this is a simulation)
- Requests created exactly at expiry boundary display as expired (>= comparison)

---

## API Routes

### POST `/api/requests`
**Auth:** Required (Firebase ID token in Authorization header)

**Request Body:**
```typescript
{
  recipientContact: string;  // email or E.164 phone
  amountCents: number;       // positive integer
  note?: string;             // max 280 chars
}
```

**Response:**
```typescript
// 201 Created
{
  id: string;
  shareableLink: string;
}

// 400 Bad Request
{ error: string }

// 401 Unauthorized
{ error: "Unauthorized" }

// 500 Internal Server Error
{ error: "Internal server error" }
```

**Server-side Validation:**
- Verify Firebase ID token
- Validate `recipientContact` format
- Validate `amountCents`: integer, > 0, <= 1_000_000
- Validate `note` length if present
- Reject if sender is requesting from themselves

---

### PATCH `/api/requests/[id]`
**Auth:** Required

**Request Body:**
```typescript
{
  action: 'pay' | 'decline' | 'cancel';
}
```

**Server-side Rules:**
- `pay`: only if `auth.uid` matches `recipientUid`, status = `pending`, not expired
- `decline`: same as `pay`
- `cancel`: only if `auth.uid` matches `senderId`, status = `pending`

**Response:** `200 OK` with updated request or appropriate error

---

## UI/UX Requirements

- All loading states use skeleton loaders or spinners (never blank screens)
- All destructive actions (Cancel, Decline) require a confirmation dialog
- Toast notifications for all success/error events
- Currency always displayed with 2 decimal places and $ prefix
- Timestamps displayed in user's local timezone
- Mobile: all tap targets minimum 44×44px
- Keyboard accessible (Tab navigation, Enter to submit forms)

---

## Error States Reference

| Scenario | User-Facing Message |
|----------|-------------------|
| Network error | "Something went wrong. Please check your connection." |
| Auth expired | "Your session has expired. Please sign in again." |
| Request not found | "This request doesn't exist or has been removed." |
| Already paid | "This request has already been paid." |
| Already expired | "This request has expired." |
| Permission denied | "You don't have permission to perform this action." |
| Self-request | "You can't request money from yourself." |
| Amount too high | "Maximum request amount is $10,000.00" |
