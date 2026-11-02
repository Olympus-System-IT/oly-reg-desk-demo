# Login & Authentication Audit

_Date: 2026-10-10 · Role: Senior Product Designer & Senior Next.js/TanStack Engineer_

---

## 1. Current Authentication Flow

- **Login Route & File Path**: `src/routes/index.tsx` (mounted at `/` with optional search params).
- **Module Selection Route**: `src/routes/modules.tsx` (mounted at `/modules`).
- **Logout Flow**: Triggered in `app-shell.tsx` and `modules.tsx` via `mutate((d) => (d.auth = { userId: null, module: null }))` followed by navigation to `/`.
- **Middleware & Guards**:
  - `src/routes/_shell.tsx` renders a layout guard: `if (!user) return <Navigate to="/" />;`.
  - `src/components/hms/common.tsx` provides `<Guard perm={...}>` which checks permissions against `can(user, perm)`.
  - Module enforcement in `app-shell.tsx` evaluates `db.auth.module` against permitted modules (`modulesFor(user)`).
- **Demo Session Storage**: Persisted in browser `localStorage` under key `hms-demo-db`. The session record contains `{ auth: { userId: string | null, module: ModuleKey | null } }`. No password is ever saved to persistent storage.
- **Roles & Permitted Modules**:
  - Defined in `src/lib/hms/permissions.ts` and `src/lib/hms/types.ts`.
  - Roles: `admin`, `manager`, `receptionist`, `nurse`.
  - Modules: `sfa` (Administration), `billing` (Reception, POS & Patient Operations).
  - Admins have access to both `sfa` and `billing` modules. Managers, Receptionists, and Nurses have access to `billing` only.

---

## 2. Existing Components Inventory

The following components already exist in `src/components/` and will be reused:
- `src/components/ui/input.tsx`: Accessible input field.
- `src/components/ui/button.tsx`: Primary, secondary, outline, ghost variants with loading states.
- `src/components/ui/label.tsx`: Radix-based accessible label.
- `src/components/ui/alert.tsx`: Accessible alert container with `role="alert"`.
- `src/components/ui/dialog.tsx`: Accessible modal dialog for the Forgot Password flow.
- `src/components/ui/checkbox.tsx`: Accessible Radix checkbox for "Remember me".
- `src/components/ui/badge.tsx`: Role indicators and module status chips.
- `src/components/hms/common.tsx`: Field wrapper (`Field`), status badges, and layout headers.
- `src/components/hms/CompanyLogo.tsx`: Brand logo mark and Olympus Lanka Hospital typography.
- `lucide-react`: Icons (`Eye`, `EyeOff`, `Lock`, `User`, `ShieldAlert`, `ArrowRight`, `CalendarClock`, `Receipt`, `BarChart3`, etc.).

---

## 3. Design System & Tokens

- **Primary Brand Color**: `#1729C4` (`--primary`, `bg-primary`, `text-primary`).
- **Brand Accent Red**: `#DD0607` (`--brand-red`, `text-brand-red`, `border-t-brand-red`).
- **Status Colors**: Success green (`--success`), Warning amber (`--warning`), Danger red (`--destructive`), Info soft blue (`--info-soft`).
- **Radius**: `--radius: 0.5rem` (`rounded-lg`, `rounded-md`).
- **Typography**: IBM Plex Sans with clean tabular figures.
- **Focus Rings**: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`.
- **Card Shadows**: `shadow-xs`, `shadow-sm`, `shadow-md` with subtle border contrast (`border-border`).

---

## 4. Existing Demo Users & Credentials

All demo users share the demo password `demo1234`:
1. **Admin**: `admin` / `admin@example-hospital.lk` — Achala Admin (has access to both SFA and Billing modules).
2. **Manager**: `manager` / `0771234567` — Mahesh Manager (Billing module, reports, expenses).
3. **Receptionist / Cashier**: `reception` / `0712345678` — Rashmi Reception (Billing module, book, POS, appointments).
4. **Nurse**: `nurse` / `0759876543` — Nadeesha Nurse (Billing module, queue and sessions; no financials).
5. **Deactivated Test User**: `cashier.old` / `0700000000` — Former Cashier (`active: false`, tests deactivated error state).

---

## 5. Identified Gaps & Redesign Plan

1. **Authentication Architecture**:
   - *Current*: Direct synchronous query in the login page component.
   - *Fix*: Decouple into a dedicated `authService` in `src/features/auth/services/authService.ts` simulating secure server-side authentication timing (250ms), in-memory lockout tracking (5 consecutive failed attempts lock account for 5 minutes), and sanitized session return.
2. **Validation & Error Handling**:
   - Use Zod schema in `src/features/auth/schemas/loginSchema.ts`.
   - Provide generic error messages to prevent username enumeration on invalid credentials.
   - Show specific error for deactivated accounts.
   - Display a live countdown banner for locked-out accounts.
3. **Open-Redirect Protection**:
   - Validate `next` / `returnTo` URL query parameter to only accept safe relative internal routes (`/dashboard`, `/queue`, `/modules`, etc.) and reject external URLs (e.g. `https://evil.example` or `//evil.example`).
4. **Form Ergonomics & Accessibility**:
   - Caps Lock indicator while typing password.
   - Show / Hide password toggle with `aria-pressed` and accessible title.
   - Accessible "Remember me" checkbox storing username only in `hms-remembered-username`.
   - Honest "Forgot Password" modal with a simulated form and clear demo notice.
5. **Modern Split-Screen Desktop Layout**:
   - Left 45% brand panel in brand blue (`#1729C4`), hospital logo, value proposition, 3 feature highlights with icons, and demo prototype footer.
   - Right 55% form panel, vertically centered with max-width 420px, generous spacing, and smooth subtle entrance animation.
   - Responsive `100dvh` mobile container preventing layout break with on-screen virtual keyboards.
6. **Module Selection Screen**:
   - Accessible dual-card selection for Admin (`SFA: Administration` and `Billing: Reception, POS and patient operations`) with subtle hover lift and keyboard navigation.
   - Single-module users (Manager, Receptionist, Nurse) automatically bypass this screen.

---

## 6. Assumptions Documented

- In TanStack Start / Vite single-page demo mode, authentication is managed via a dedicated `authService` singleton simulating backend credentials verification and managing in-memory brute-force lockouts.
- Passwords are strictly ephemeral during submission and never saved in `localStorage`, session storage, or URLs.
- The `VITE_DEMO_MODE` flag controls visibility of the prototype demo role chips.
