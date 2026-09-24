# End-to-end API checks

These scripts exercise the running app over HTTP. They need a server and
they **mutate the local `reps.db`** (they record attempts), so run them
against a throwaway database or accept that your progress will change.

```bash
npx next build && npx next start -p 3111   # in one terminal
npm run e2e                                # in another
```

Point them elsewhere with `REPS_URL=http://localhost:3000 npm run e2e`.

| Script | Covers |
|---|---|
| `e2e.mjs` | Every item kind graded both ways, FSRS ratings and intervals, all session modes, server-side re-grading |
| `features.mjs` | First-time module primers, module and cheat-sheet endpoints, second-attempt partial credit |
| `progression.mjs` | Answering a level's items correctly unlocks the next level and surfaces its content |

They complement, not replace, the unit tests (`npm test`) and the content
linter (`npm run content:check`): those run without a server; these prove
the routes, the database and the scheduler agree once everything is wired.
