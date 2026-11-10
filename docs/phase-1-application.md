# Phase 1: Application Walkthrough

> **Status:** Done ✅ (2 November 2026)  
> **Result:** Full application runs locally, 100% of automated tests pass, user isolation and urgency logic verified.

---

## 1. Objective

Build and verify the complete CloudFridge application locally before touching AWS cloud infrastructure. This ensures all business rules, database schema, security controls, and automated tests are sound.

---

## 2. What Was Built

```text
cloudfridge/
├── backend/                  Express API & PostgreSQL migrations
│   ├── migrations/           Schema definitions with check constraints & indexes
│   ├── scripts/              bootstrap-db.js (least-privilege app user setup)
│   ├── src/                  Auth, items, stats routes, middleware, and validation
│   └── test/                 Automated API test suite (19 tests)
├── frontend/                 React SPA (Vite)
│   ├── src/pages/            Dashboard, AddItem, EditItem, Statistics, Login, Register
│   ├── src/components/       ItemCard, ItemForm, NavBar
│   ├── src/utils/            Urgency engine & calendar day calculation
│   └── src/utils/urgency.test.js  Unit test suite (7 tests)
└── docs/                     Project architecture and status tracking
```

---

## 3. Step-by-Step Implementation Details

### Step 1: Database Schema & Migration
- **File:** `backend/migrations/1730000000000_init.sql`
- **Tables created:**
  - `users`: UUID primary key, lowercase unique email, bcrypt password hash, timestamp.
  - `items`: UUID primary key, foreign key to `users` with `ON DELETE CASCADE`, name (1–100 chars), category enum, expiry date, status enum (`active`, `used`, `wasted`), `has_photo` flag (for Phase 5), `alert_sent_at` timestamp (for Phase 4).
- **Forward-compatibility:** `has_photo` and `alert_sent_at` were included now so later phases need zero database schema migrations.
- **Indexes:**
  - Composite index `items_user_status_expiry_idx` on `(user_id, status, expiry_date)` for fast dashboard and statistics queries.
  - Partial index `items_pending_alert_idx` on `(expiry_date)` WHERE `status = 'active' AND alert_sent_at IS NULL` for daily alerts.

### Step 2: Backend API
- **Framework:** Node.js Express (ES Modules) with `helmet` for security headers.
- **Authentication:** JWT tokens (`24h` expiration) signed with secret from environment. Passwords hashed with `bcryptjs` (cost factor 10). Constant-time dummy hash comparison on invalid emails to prevent timing attacks.
- **Validation:** Strict `zod` schemas for login, register, item creation, and partial item updates. Rejects invalid dates (e.g., leap day invalid dates like `2026-02-30`), empty names, and unauthorized status changes.
- **Tenant Isolation:** Every item query, update, and delete strictly includes `WHERE user_id = req.userId`. Attempting to access or mutate another user's item returns `404 Not Found`.
- **Database Safety:** Uses connection pooling via `pg`. `bootstrap-db.js` prepares a dedicated application role `cloudfridge_app` restricted to row CRUD (schema altering revoked).

### Step 3: Frontend Single-Page App
- **Stack:** React 18, Vite 5, React Router 6.
- **Design:** Clean, modern responsive interface with responsive cards and mobile-friendly layouts.
- **Urgency Calculation:** Implemented in `frontend/src/utils/urgency.js` using local calendar boundaries (midnight-to-midnight) to avoid UTC offset and daylight saving shifts.
  - **Grey:** Expired (< 0 days left)
  - **Red:** Urgent (0 to 2 days left)
  - **Amber:** Approaching (3 to 7 days left)
  - **Green:** Safe (8+ days left)

---

## 4. How It Was Verified

### Automated Tests
Run locally against PostgreSQL 16:
1. **Backend API Suite (`npm test` in `backend/`):**
   - **19 of 19 tests passed**
   - Tested: User registration, duplicate email rejection, invalid password rejection, JWT auth, CRUD operations, cross-user isolation (404 on reading/updating/deleting other user's items), malformed UUID handling, and statistics calculation.
2. **Frontend Urgency Suite (`npm test` in `frontend/`):**
   - **7 of 7 tests passed**
   - Tested: Calendar boundary cases, year/month transitions, leap years (2028-02-29), daylight saving clock shifts, and color thresholds.
3. **Production Build:**
   - `npm run build` in `frontend/` succeeds cleanly with zero bundle errors into `dist/`.

### Manual End-to-End Test
- Registered user A → added items across different expiry dates → verified correct color tags.
- Marked item as `used` → verified removal from dashboard and update in Statistics (Used count incremented, Waste % updated).
- Registered user B → verified user B's dashboard was empty and user A's items could not be accessed.

---

## 5. Deliverables & Git Commit

- Initial commit: `b93a2a9` (*Complete Phase 1: local application, database schema, tests, and documentation*).
- Verification & docs reorganization: `e829040` (*Verify Phase 1 and reorganize project docs*).
