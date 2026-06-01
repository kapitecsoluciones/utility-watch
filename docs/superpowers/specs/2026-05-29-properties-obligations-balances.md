# Property-centric obligations, balances, payments & history

Status: approved (scope A+B+C + data import), 2026-05-29.

## Why

Operators manage utilities by **property** (a building/unit), and each property
has several recurring utility accounts. They need, per account: the current
balance owed, the history of statements over time, and the record of payments
made. The retrieval engine already produces `bills` tagged with
`(provider_id, account_ref)` over successive `runs`; this adds the
organization layer on top so the console answers "what does each property owe
right now, and what's the history".

This mirrors a prior production dashboard whose model is
property → obligation → payment_history, with computed status and alerts.

## Data model (new tables in core schema)

- `properties` (id, name, address, type, notes, created_at) — the real-estate units.
- `categories` (id, name, description) — optional grouping.
- `obligations` (id, provider_id, account_ref, property_id NULL, category_id NULL,
  label, account_type, due_day TINYINT NULL, payment_method, is_autopay,
  paid_by_tenant, is_cancelled, is_payment_arrangement, currency, notes,
  current_balance DECIMAL NULL, current_due_date DATE NULL, last_seen_run_id,
  last_payment_date, last_payment_amount, created_at, updated_at).
  - **Unique (provider_id, account_ref)** — the recurring "thing that accrues a balance".
  - Auto-upserted from each run: for every bill, ensure an obligation row for its
    `(provider_id, account_ref)`, and refresh `current_balance`/`current_due_date`/`last_seen_run_id`.
- `payments` (id, obligation_id, payment_date, amount, payment_method, source
  ['manual'|'scraped'], notes, created_at). `payment_add` inserts + decrements
  `obligations.current_balance` and updates `last_payment_*` (matches old behavior).

`bills` already carries `(provider_id, account_ref, amount_due, due_date, run_id,
status, confidence)`; an obligation's **history** = all bills sharing its
`(provider_id, account_ref)` ordered by run, and the latest is its current balance.

## Status (computed, not stored)

`paid` (balance ≤ 0) · `arrangement` (is_payment_arrangement) · `cancelled`
(is_cancelled) · `overdue` (balance > 0 and due date/day in the past) · `due`
(balance > 0, upcoming) · `unknown` (no balance yet).

## Service layer

- `obligations.ts`: upsertFromBill(), list (filters: property, category, status,
  search, payment_method, account_type; sort), get(id) with bill-history + payments,
  setMeta (property/category/type/notes…), computeStatus().
- `payments.ts`: list(obligationId), add() [decrements balance], delete().
- `properties.ts`: CRUD.
- Roll the obligation upsert into the runner after each bill insert.

## HTTP / console (gated, capability-scoped)

- `GET /api/properties` → properties with rollup (count + sum current_balance).
- `GET /api/obligations` (filters/sort) · `GET /api/obligations/:id` (history + payments).
- `POST /api/obligations/:id` (set property/category/meta) · `POST /api/payments` (add) · `DELETE`.
- `GET /api/alerts` (overdue) · `GET /api/export.csv`.
- Console sections: **Properties** (property → obligations → balance, property total,
  grand total owed), **Obligation detail** (statement history timeline + payment history +
  "Add payment / mark paid"), **Alerts**, plus filters/search/sort + CSV on the obligations list.

## Phases

- **A** — schema (properties, obligations, payments) + obligation auto-upsert in runner +
  Properties view + Obligation-detail history view + current-balance rollups.
- **B** — payments (add/mark-paid → decrement) + computed status + Alerts + filters/sort + CSV export.
- **C** — one-time import (private deployment): `ut_properties` → `properties`;
  `ut_obligations` → tag obligations to property by matching `provider_name`→provider_id and
  property heuristics; `ut_payment_history` → `payments`. Fuzzy where the old data lacks an
  account number; log unmatched rows for manual tagging.

## Privacy

Schema/service/UI are generic (public repo). The import script + any real property
names/balances live only in a private overlay; never in the public repo.
