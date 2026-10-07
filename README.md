# JS Drill

A Next.js app for deliberate JavaScript practice with spaced repetition, pattern tracking, and progress analytics.

## Tech Stack

- Next.js (App Router), React, TypeScript
- SQLite (`better-sqlite3`) with Drizzle ORM
- CodeMirror for in-browser coding
- FSRS scheduling (`ts-fsrs`)

## Project Layout

- `src/app`: Pages and API routes
- `src/components`: UI and feature components
- `src/lib`: Executor, session builder, FSRS logic, and DB access
- `seed-data`: Categories, patterns, and problem JSON
- `docs` and `training-docs`: Architecture and implementation references

## Learning Path

Start with `training-docs/00-architecture-overview.md`, then read `training-docs/01` to `15` in order
(schema, session builder, drill page, executor, attempts API, FSRS, and so on). Each has a
`docs/code-explanations/` companion that is shorter and more conversational. Review notes added on
2026-10-06 flag three verified gaps worth discussing in a code review: `deepEqual` treats `[]` and
`{}` as equal (`training-docs/14-utils.md`, with a no-install check), the FSRS card never stores
`learning_steps` (`training-docs/06-fsrs.md`), and `user_cards` has no unique index on
`(user_id, problem_id)` (`training-docs/01-schema.md`). There are no automated tests in this repository.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Database

Seed local database:

```bash
npm run db:seed
```

Reset and reseed:

```bash
npm run db:reset
```
