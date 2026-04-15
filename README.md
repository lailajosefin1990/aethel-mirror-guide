# Guidance Journal

[![Build & Test](https://github.com/lailajosefin1990/guidance-journal-guide/actions/workflows/ci.yml/badge.svg)](https://github.com/lailajosefin1990/guidance-journal-guide/actions/workflows/ci.yml)

A decision clarity tool that synthesises astrology, Human Design, numerology, Gene Keys, and Destiny Matrix into one clear next move — the Third Way.

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind + Framer Motion
- **Backend:** Supabase (Auth, Database, Edge Functions)
- **AI:** OpenAI via Supabase Edge Functions
- **Payments:** Stripe
- **Analytics:** PostHog
- **Monitoring:** Sentry
- **i18n:** react-i18next (EN, ES, FR, PT)

## Architecture

```
src/
├── context/appReducer.ts       ← typed state + 24-action reducer
├── hooks/
│   ├── useFlowNavigation.ts    ← view transitions, auth flow, React Router sync
│   ├── useReadingFlow.ts       ← generate, save, regenerate readings
│   └── useProfileData.ts       ← profile loading, birth data, consent, journals
├── lib/
│   ├── analytics.ts            ← typed event registry (EVENTS + trackEvent)
│   └── db.ts                   ← typed Supabase data access layer
├── components/                 ← 25 feature components
├── pages/Index.tsx             ← thin orchestrator (~160 lines)
└── test/                       ← 33 tests across 4 suites
```

## Development

```bash
npm install
npm run dev          # start dev server
npm run test         # run all tests
npm run test:watch   # run tests in watch mode
```

## Testing

```bash
npm run test                                                    # all tests
npx vitest run --coverage                                       # with coverage report
npx vitest run src/test/hooks-integration.test.tsx               # single suite
npx vitest run src/test/oauth-roundtrip.test.tsx                 # E2E (requires >4GB heap)
```

**Test suites:**
| File | Tests | Covers |
|------|-------|--------|
| `hooks-integration.test.tsx` | 21 | Reducer, OAuth restore, regeneration cap, anonymous save flow |
| `unit-coverage.test.ts` | 28 | Reducer 100% branch coverage, utils, stripe, analytics, reading |
| `regeneration-feedback.test.tsx` | 7 | Feedback pipeline from modal to edge function |
| `regeneration-cap.test.tsx` | 4 | 3-regeneration cap + UI lockout |
| `example.test.ts` | 1 | Sanity check |
| `oauth-roundtrip.test.tsx` | 6 | Full-page OAuth E2E (excluded from CI, run locally) |

**Coverage thresholds** (enforced in CI):

*Per-file — locked at 100%, any regression fails CI:*
- `appReducer.ts`, `analytics.ts`, `reading.ts`, `utils.ts`, `stripe.ts`

*Global floor — raises as component tests are added:*
- Lines: 6% → 20% → 35% → 50% (current: ~7%)

## CI

Every push to `main` and every pull request runs:
1. `npm install` — dependency installation
2. `tsc --noEmit` — TypeScript type checking
3. `vitest run --coverage` — 61 tests + coverage thresholds
4. `vite build` — production build verification
