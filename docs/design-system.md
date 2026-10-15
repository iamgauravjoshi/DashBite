# Design System & Navigation — Phase 1

Companion to `DESIGN.md`/`SKILLS.md`. This file records what Phase 1 actually built.

## 1. Principles (food-service SaaS)

- Clarity before cleverness: one purpose per screen, one primary action per region.
- Calm density for consoles (tables, queues), generous spacing for decisions (checkout, confirmations).
- One brand accent (mess green) + neutrals + semantic states. No rainbow metrics.
- Prices, cutoffs, and consequences visible before confirmation (BR-17).
- Every screen answers: where am I, what matters, what can I do, what changed, what next.

## 2. Tokens (`src/app/globals.css`)

- Surfaces: `--background` white, canvas `#fafaf9` via body; cards `bg-card` with `ring-1 ring-foreground/10` (borders over shadows).
- Brand: `--brand #16a34a`, hover `#15803d`, contrast white. Wired as `--primary` (+ dark `#4ade80`/`#052e16`), `--ring`, `--sidebar-primary`, first chart color.
- Semantic: shadcn `destructive/secondary/muted/outline` + `StatusBadge` mapping (`src/components/data/StatusBadge.tsx`).
- Type: system sans stack; headings `tracking-tight`; prose `max-w-prose`; money/counts `.tnum` (tabular-nums).
- Radius `--radius 0.625rem` (10px); inputs/buttons 8–12px; standard cards 10–16px.
- Focus: global `:focus-visible` 2px `var(--ring)` ring + component rings; `aria-current="page"` + `bg-muted` + semibold for active nav (never color alone).

## 3. Components

- shadcn base-nova on Base UI (`components.json`, `base` = base). Imports via `@/components/ui`.
- Shared: `AppLogo`/`RoleMark`, `PageHeader` (eyebrow/title/description/actions), `StateBlock` (`LoadingBlock` Skeleton + sr-only + aria-live; `EmptyBlock` via `Empty` primitives; `ErrorBlock`/`SuccessBlock` via `Alert`), `StatusBadge`, `ShellPlaceholder` (honest not-yet-built states naming the implementing phase).
- Rules honored: `FieldGroup`+`Field` forms with `data-invalid`/`aria-invalid`; `SelectItem` in groups (where used); dialog/sheet always titled (sr-only accepted); full Card composition; `render` (not `asChild`) for Base UI triggers; `data-icon` on button icons, no icon sizing inside components; `gap-*` not `space-*`; `size-*` for square targets; `Separator` not `<hr>`; `Skeleton` not custom pulse; `Badge` for statuses.
- Global states: `src/app/loading.tsx` (Skeleton + aria-live), `error.tsx` (client, retry + home), `not-found.tsx` (Empty + home).

## 4. Layout & responsive

- Root `layout.tsx`: metadata template, viewport `device-width`, antialiased body.
- Public: `PublicShell` — sticky header (logo, desktop nav, real CTAs Find-a-mess/For-owners, mobile Sheet menu), footer. Max width 6xl, 16–20px mobile padding.
- Roles: `AppShell(role)` — desktop sidebar 256px (logo, role mark, nav, tagline) `hidden md:flex`; mobile top bar + Sheet menu; bottom primary nav `md:hidden` (4 items + More sheet for owner 8); content max 7xl, `px-4 pb-24 md:px-6 md:pb-10`. Skip link, `nav`/`main`/`header` landmarks.
- Breakpoints: Tailwind `sm/md/lg` (~640/768/1024). Tables scroll within cards on small screens; grids collapse 4→2→1 columns.
- Staff: subset of owner nav (`staffNavItems`: orders, kitchen, deliveries). Server enforcement from Phase 2.

## 5. Navigation map

- Public: `/` `discover` `how-it-works` `pricing` `for-owners` (+ `/system` reference).
- Customer `/app`: home, discover, orders (P5), subscriptions (P6), support (P9).
- Owner `/owner`: overview, orders (P5), subscribers (P6), menus (P4), kitchen (P7), deliveries (P8), revenue (P10), settings (P3).
- Delivery `/delivery`: tasks, history + support (P8/P9).
- Admin `/admin`: overview, verifications (P3+10), messes (P3), orders (P5+10), finance (P10).
- Source: `src/config/navigation.ts` (`allShellRoutes()` is the test/build contract).

## 6. Accessibility

WCAG AA basics: skip links, landmarks, heading order (one h1 via PageHeader), label-tied inputs, `aria-invalid`+`FieldError`, `role="alert"` errors, `aria-live` loading, dialog/sheet titles + Esc, visible focus, touch targets ≥44px (bottom nav `min-h-11` + padding), no color-only meaning.

## 7. What Phase 1 does NOT do

No auth, no listings, no ordering, no payments, no subscriptions logic, no kitchen math, no assignments, no notifications, no finance math. Subpages are honest shell placeholders naming their implementing phase.
