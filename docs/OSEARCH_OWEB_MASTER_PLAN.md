# OSearch → OWeb Constellation — Master Plan

> **Status:** Phases 0–5 implemented; SSO launch tokens + guest ledger hardened  
> **OWeb catalog PR:** https://github.com/SalesflowOne/OWeb-Intelligence/pull/247  
> **osearch PR:** https://github.com/SalesflowOne/osearch/pull/1  
> **DB:** `os_*` + `ao_ecosystem_launch_tokens` on `ebjzdcnphkfpxfldnatm`  
> **Repos:** `SalesflowOne/osearch` (this repo — Vane fork)  
> **Control plane:** `SalesflowOne/OWeb-Intelligence` · Lovable `7186f297-568b-4b5d-8660-dcc463f6cb3d` · `https://oweb.one`  
> **Shared DB:** Supabase `ebjzdcnphkfpxfldnatm` (“One OS”, `us-east-1`)  
> **Related OWeb docs:** `ECOSYSTEM_APPS_MASTER_PLAN.md`, `BILLING_OWNERSHIP.md`, `ANONYMOUS_ENTRY_MASTER_PLAN.md`, `OWEB_BRAND_SPEC.md`, `Design System/cursor-handoff/`

---

## Executive verdict

**Keep this repo. Do not fork OWeb and gut it into a search UI. Do not merge the search engine into the OWeb monorepo.**

OSearch becomes the **search satellite** in the OWeb constellation: its own product surface, icon, domain, and research stack — while **identity, workspaces, Stripe/OneCredits, and App Store entitlements** stay on OWeb.

| Question | Answer |
|----------|--------|
| Copy OWeb and adapt for search? | **No.** You would throw away a production research agent (classify → research → widgets → cited answer) and rebuild it inside a giant ops app. |
| Keep osearch and bolt on OWeb identity? | **Yes.** Federation over absorption — same pattern OWeb already chose for SchedulePoll. |
| Shared billing & auth? | **Yes.** Same Supabase Auth project + workspace wallet; debit with `source_app=osearch`. |
| Own app experience? | **Yes.** Distinct mark, domain (`search.oweb.one` or `osearch.one`), composer-first search UX — not an OWeb sidebar tab. |

**Bottom line:** OWeb is the OS. OSearch is the search app. Shared wallet and login; separate deploy and UX.

---

## 1. What we audited

### 1.1 This repo (`osearch` / Vane)

| Area | State | Implication |
|------|-------|-------------|
| Product | Privacy-focused AI answering engine with citations | Core value to keep |
| Stack | Next.js 16 · Yarn · Tailwind 3 · Drizzle | Fine for satellite; different from OWeb’s TanStack Start |
| Storage | **SQLite** via `better-sqlite3` (`chats`, `messages`) | **Must leave** for multi-tenant SaaS |
| Auth | None (local / self-host setup wizard) | Add OWeb / Supabase Auth |
| Billing | None | Use OWeb OneCredits |
| Search | SearxNG meta-search + researcher agent + widgets | Keep as engine |
| AI | Multi-provider + Vercel AI Gateway / OIDC | Align metering with OWeb credits |
| Branding | Still “Vane” in copy/metadata | Full OSearch rebrand |
| Deploy | Vercel (`vercel.json`, 300s API max) | Keep separate Vercel project |

**Schema today (local only):**

- `chats` — `id`, `title`, `createdAt`, `sources`, `files`
- `messages` — `messageId`, `chatId`, `backendId`, `query`, `responseBlocks`, `status`

No `user_id`, no `org_id`, no RLS. Unusable as a shared constellation store.

### 1.2 Parent app (`OWeb-Intelligence`)

| Capability | Status | Notes |
|------------|--------|-------|
| Auth | ✅ Supabase Auth (+ anonymous guest entry) | Same project as One OS DB |
| Tenancy | ✅ `ao_orgs` / `ao_org_members` | Product language = Workspace |
| Billing | ✅ Stripe + credit grants/ledger | Wallet = **workspace**, not user |
| Metering | ✅ `source_app` on ledger / debit APIs | Built for satellites |
| Platform API | ✅ `oweb_sk_…`, `/api/v1/runs`, MCP | Entitlements + SSO launch hooks planned |
| Design system | ✅ Locked mark + tokens | Nunito / Plus Jakarta / JetBrains Mono; cyan `#22D3EE` once |
| Ecosystem App Store | ✅ v0 at `/apps` | Catalog seed — **OSearch not listed yet** |
| Stack | TanStack Start · Vite · React 19 · Tailwind 4 | Different from osearch — OK |

### 1.3 Shared database (`ebjzdcnphkfpxfldnatm`)

This is already a **multi-product** Postgres:

- **OWeb:** `ao_*` (orgs, threads, messages, credits, agents, integrations, …)
- **Other One OS apps:** school/CRM/scheduling tables (`enrollments`, `cohorts`, `orders`, …)
- **Cross-app:** `app_access(user_id, app_id)`, `profiles`, `user_roles`

OWeb billing already supports satellite metering:

```text
ao_debit_credits_v2(..., _source_app TEXT DEFAULT 'oweb', ...)
ao_credit_ledger.source_app
```

**Security note (shared project):** RLS is disabled on 8 non-OWeb tables (`project`, `users`, `anonymous_chat_logs`, …). Not OSearch-owned, but any new `os_*` tables **must** ship with RLS from day one.

### 1.4 Ecosystem doctrine (already decided in OWeb)

From `ECOSYSTEM_APPS_MASTER_PLAN.md`:

1. One Workspace wallet  
2. One membership source of truth  
3. AI always meters through OWeb  
4. Federation over absorption  
5. Separate deployables until SSO + entitlements prove out  

**OSearch should be the second constellation satellite** (after SchedulePoll), not a rewrite of OWeb.

---

## 2. Options considered

| Option | Description | Pros | Cons | Verdict |
|--------|-------------|------|------|---------|
| **A. Federated satellite (recommended)** | Keep osearch Next.js engine; add Supabase Auth, workspace binding, OWeb credits, OWeb DS skin | Preserves research quality; fastest path to product; matches constellation doctrine | Two codebases to theme; bridge auth carefully | **Ship this** |
| **B. Fork OWeb, add search** | Remix Agent Workspace; reimplement Vane agents inside TanStack | Instant auth/billing/UI | Months to port research/widgets/SearxNG; bloated ops shell for a search product | Reject |
| **C. Monorepo absorption** | Merge osearch routes into OWeb | One deploy | Wrong UX; coupling; deploy/runtime conflict (SQLite vs Nitro SSR) | Reject for v1 |
| **D. Thin embed only** | iframe/embed osearch inside OWeb chat | Quick demo | No shared identity; double metering; weak brand | Reject as primary |
| **E. Greenfield rewrite** | New TanStack search app | Clean stack match | Throw away working agent | Reject |

---

## 3. Target product

### Positioning

**OSearch** — OWeb’s search app. Ask anything; get a cited answer with sources, images, videos, and smart widgets. Same login and credits as OWeb. Own icon, own home screen, own muscle memory.

### Experience principles

1. **Composer-first** — first viewport = mark + one headline + search composer (mirror OWeb hero discipline, search-flavored).  
2. **Brand-adjacent, not identical** — same void/cyan system; **search mark** variant of the Source.  
3. **Guest → account** — reuse OWeb anonymous-entry pattern (limited free searches → AuthGate → same workspace wallet).  
4. **Workspace-scoped history** — library/history belongs to the workspace, attributed to users.  
5. **Deep research is a credit tier** — speed / balanced / quality map to credit multipliers.

### Domain & surface

| Surface | Target |
|---------|--------|
| Product URL | `https://search.oweb.one` (preferred) or `https://osearch.one` |
| App Store | Listed in OWeb `/apps` as `osearch` |
| Launch | SSO / shared session from App Store → OSearch with `workspace_id` |
| Embed (later) | Optional “Ask OSearch” widget powered by Platform API |

---

## 4. Brand & icon

### OWeb mark (locked)

8 nodes @ 45°, cyan crown pill, white nodes on dark. Lockup: `[mark] + "web"`. One accent law: cyan once per view.

### OSearch mark (propose)

Keep the ring geometry; **modify for search** without breaking constellation recognition:

| Variant | Idea | Recommendation |
|---------|------|----------------|
| **A. Lens crown** | Replace crown pill with a short magnifier handle + circular lens stroke using the same cyan | **Primary recommendation** — reads as “search” at favicon size |
| **B. Node gap** | Leave 7 nodes; open bottom-right arc as a lens cut | Riskier at 16px |
| **C. Dual mark** | Full OWeb mark + tiny lens badge | Feels bolted-on; avoid |

Ship SVG kit parallel to OWeb: `osearch-mark-dark.svg`, light, mono, tile, favicon sizes, and a spinner that shares motion rules (clockwise, cyan leads).

Typography & tokens: import OWeb DS values (`--void`, `--live`/`#22D3EE`, Nunito / Plus Jakarta / JetBrains Mono). Do **not** invent a second palette.

---

## 5. Architecture

```
                 ┌─────────────────────────────────────┐
                 │     Supabase Auth (One OS project)  │
                 │     profiles · memberships · guest  │
                 └──────────────────┬──────────────────┘
                                    │
                 ┌──────────────────▼──────────────────┐
                 │   Workspace (ao_orgs) = wallet      │
                 │   Stripe · OneCredits · plan tier   │
                 │   App Store entitlements            │
                 └─┬─────────────────┬─────────────────┘
                   │                 │
        ┌──────────▼──────┐   ┌──────▼──────────────┐
        │ OWeb            │   │ OSearch (this repo) │
        │ agents · MCP    │   │ research · citations│
        │ App Store       │   │ SearxNG · widgets   │
        │ /billing        │   │ os_* search data    │
        └─────────────────┘   └─────────────────────┘
                   ▲                 │
                   │  debit credits  │
                   └──── source_app='osearch' ───────┘
```

### Hard rules

1. **No second Stripe customer** for OSearch.  
2. **No local SQLite in production** for authenticated users.  
3. **Every LLM/search spend** goes through OWeb debit (`source_app=osearch`).  
4. **OSearch owns** search transcripts, sources, uploads, discover cache.  
5. **OWeb owns** identity, plans, entitlements, App Store, upgrade CTAs.  
6. Upgrade CTAs deep-link to `https://oweb.one/billing`, never a local checkout.

---

## 6. Data model (OSearch-owned tables)

Prefix: `os_` on the shared Supabase project. RLS via `ao_is_org_member(org_id, auth.uid())`.

```sql
-- Conversations (replaces SQLite chats)
os_chats (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES ao_orgs(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]',
  files JSONB NOT NULL DEFAULT '[]',
  optimization_mode TEXT NOT NULL DEFAULT 'balanced',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

os_messages (
  id UUID PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES os_chats(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES ao_orgs(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  query TEXT NOT NULL,
  response_blocks JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'answering',
  model TEXT,
  credits_used INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

os_uploads (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES ao_orgs(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES os_chats(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  name TEXT NOT NULL,
  mime TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional guest ledger if OSearch hosts its own anonymous entry
os_guest_search_usage (
  user_id UUID PRIMARY KEY,
  searches_used INT NOT NULL DEFAULT 0,
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Do not** write into `ao_threads` / `ao_messages` for search history — different product semantics (citations, research blocks, widgets). Cross-link later via intelligence graph if useful (`ao_entities` with `source_app`).

Local SQLite remains optional for **true self-host / offline** builds behind a feature flag; SaaS path is Postgres-only.

---

## 7. Auth, entitlements, billing

### Auth

| Mode | Approach |
|------|----------|
| Shared session | Prefer same Supabase project + cookie domain strategy (`.oweb.one`) |
| App Store launch | `POST /api/v1/ecosystem/sso/launch` → short-lived token → OSearch `/sso` |
| Guest | Mirror OWeb anonymous auth OR redirect guests to OWeb homepage for first prompt, then deep-link back — pick one in Phase 2; prefer **local anonymous on shared project** for snappy search UX |

### Entitlements (add to OWeb catalog)

| OWeb tier | OSearch package | Example limits |
|-----------|-----------------|----------------|
| `free` | `lite` | N searches/day, speed mode only, no uploads |
| `starter` | `standard` | Higher daily, balanced mode, uploads |
| `pro` | `pro` | Quality/deep research, image/video, Discover |
| `team` | `pro` | + shared workspace library, API |
| `scale` | `enterprise` | Unlimited soft-cap, custom search backends, SSO |

Numeric limits live in OWeb package JSON (`limits.searches_per_day`, `limits.quality_mode`, …).

### Credit metering (suggested v1)

| Action | Credits (baseline × model multiplier) |
|--------|----------------------------------------|
| Speed search | 1 |
| Balanced search | 2 |
| Quality / deep research | 5 |
| File-grounded research | +2 |
| Image/video pack | +1 |

Call OWeb service-role or Platform API with idempotency keys per `os_messages.id`. Preflight `assertCanSpend` before streaming; finalize on completion.

---

## 8. UI adaptation plan

Keep Next.js routes and agent pipeline. Reskin shell:

1. Import OWeb tokens (CSS variables) into `globals` / Tailwind theme.  
2. Replace Vane chrome with OSearch shell: mark, void background, aurora under composer, one-accent CTAs.  
3. Home = EmptyChat composer (not a dashboard).  
4. Sidebar library = workspace history (auth required for full history).  
5. Settings: strip self-host provider wizard for SaaS; keep advanced model prefs behind entitlement; billing link → OWeb.  
6. Motion: 2–3 intentional motions (mark pulse, composer aurora, citation fade-in) with `prefers-reduced-motion`.

**Do not** port OWeb’s Overview / Integrations / Agents nav into OSearch. Cross-link: “Open in OWeb” for agents & billing.

---

## 9. Implementation phases

| Phase | Scope | Ships in | Depends |
|-------|-------|----------|---------|
| **0 — Plan & catalog** | This doc; add `osearch` to OWeb `ecosystem-apps.ts`; placeholder App Store card | OWeb + osearch | — |
| **1 — Brand kit** | OSearch mark SVGs, favicons, package rename, strip Vane copy | osearch | 0 |
| **2 — Identity bridge** | Supabase client, session, workspace picker/bind, SSO launch stub | osearch + OWeb API | 0 |
| **3 — Postgres migration** | `os_*` tables + RLS; dual-write or cutover from SQLite | shared DB + osearch | 2 |
| **4 — Credits** | Preflight + debit via OWeb; mode multipliers; insufficient-credits UX | osearch + OWeb | 2–3 |
| **5 — Entitlements** | Package limits; upgrade CTAs → `/billing`; guest allowance | both | 4 |
| **6 — Experience polish** | DS shell, Discover, library, mobile, SEO for `search.oweb.one` | osearch | 1, 5 |
| **7 — Platform** | `POST /api/search` behind Platform keys; optional MCP `osearch_query` | both | 4 |
| **8 — Hardening** | Rate limits, abuse, observability, kill SQLite on Vercel prod | osearch | 3–7 |

**Critical path:** 0 → 1 → 2 → 3 → 4 → 5 (usable beta). 6–8 can overlap once credits work.

---

## 10. Infra & env

| Concern | Decision |
|---------|----------|
| Vercel project | Separate (`osearch`) |
| SearxNG | Managed service or private deploy; never browser-exposed keys |
| File storage | Supabase Storage or Vercel Blob under `org_id` prefix |
| Secrets | OWeb Platform / service role only on server; anon key on client |
| Domains | `search.oweb.one` + Supabase redirect allowlist + cookie parent `.oweb.one` |
| AI Gateway | Keep Vercel AI Gateway; meter in app layer against OneCredits |

---

## 11. Risks

| Risk | Mitigation |
|------|------------|
| Stack mismatch (Next vs TanStack) | Accept; share tokens/auth/API contracts, not components blindly |
| SQLite on serverless | Already fragile — Phase 3 removes it for SaaS |
| Double billing | No local Stripe; single debit path with idempotency |
| Shared-DB table sprawl | Strict `os_` prefix; never query foreign schemas casually |
| Guest abuse | Server ledger + IP rate limits (copy OWeb guest pattern) |
| Brand confusion | Distinct mark + product name; App Store clarifies roles |
| Upstream Vane drift | Track upstream selectively; constellation features live in `os_` / auth layers |

---

## 12. Success metrics

- SSO from OWeb App Store → first search &lt; 10s  
- Zero unpaid searches past guest/free caps (server enforced)  
- ≥95% of paid searches have matching `ao_credit_ledger` row with `source_app=osearch`  
- First-viewport brand test: remove nav → still reads as OSearch/OWeb family  
- p50 balanced search latency competitive with current Vane baseline  

---

## 13. Confirmation checklist

Reply with what to execute next:

- [ ] **A — Catalog only:** Add `osearch` to OWeb App Store seed + keep this plan  
- [ ] **B — Brand kit:** OSearch mark + rebrand pass in this repo  
- [ ] **C — Auth bridge:** Shared Supabase session + workspace bind  
- [ ] **D — DB cutover:** `os_*` migrations + chat persistence  
- [ ] **E — Credits end-to-end:** Metered search against OneCredits  
- [ ] **F — Full beta path:** A→E + DS shell on `search.oweb.one`

Recommended default: **F**, sequenced as phases 0–5.

---

*Audit sources: live Supabase `ebjzdcnphkfpxfldnatm`, GitHub `SalesflowOne/OWeb-Intelligence` @ `36e3f93e`, Lovable Agent Workspace, this repo’s Drizzle schema and search agent tree.*
