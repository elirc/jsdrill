# 11: Git, secrets and shipping

> Files: `.gitignore`, `git log`, `git show -s 6f06762 c027fca`, `package.json`

## Big changes go to a branch

The 134-file rebuild (`6f06762`) and the 30-file teaching pass (`c027fca`) are on `feat/fullstack-interview-drills`, not `main`. The rebuild was pushed with a PR link instead of being merged straight into `main`.

Why this matters even on a solo project:

- **`main` stays shippable.** If the rebuild had a fatal flaw, `main` still had working JS Drill. `git switch main` is the rollback.
- **A PR is a review surface.** It shows the whole diff in one place, gives a place to comment, and runs CI if there is any. Reviewing 134 files in a terminal is hard. Reviewing them in a PR with a file tree is merely tedious.
- **The PR description records the decision.** Six months later, "why did we delete the admin UI?" has an answer attached to the change that did it.
- **It's the habit that scales.** On a team, pushing a rewrite directly to `main` is how you break everyone's afternoon. Practise the team habit when you're alone.

## Commit messages as documentation

Read the full message: `git show -s 6f06762`. It has sections:

```
Rebuild Reps as a full-stack interview upskilling app

<one paragraph: what and why>

Data model          - problems -> items … categories -> tracks …
Curriculum          (229 items, 50 modules, 59 concepts) …
Question kinds      …
App                 …
Fixes found while verifying
                    - code exercises passing a function as test input …
                    - level unlocking gated on FSRS stability …
Adds scripts/check-content.ts …
Verified: typecheck, lint (including React 19 purity rules), 229-item
content validation, a 42-assertion end-to-end suite against a live
server, an 8-assertion level-progression test, and a clean production
build of 18 routes.
```

Good commit messages answer three questions: **what changed, why, and how do you know it works**. The "Verified:" line is the one juniors usually leave out, and it's the one reviewers value most. It states which checks were run, so the reviewer knows what's left to check.

One commit for 134 files is a trade-off, not an ideal. The domain rename meant almost nothing compiled halfway through, so splitting it into commits that each build would have taken real effort. When you *can* split, split: a commit that deletes dead code, then one that adds the new model, then one that adds content. When you can't, make the message carry the structure.

## Identity and environment

The first commit attempt on this machine failed because git had no user configured. The fix set the identity **locally**, for this repository only, to match the existing commits:

```bash
git config user.name  "elirc"
git config user.email "elirc@users.noreply.github.com"
```

Details that matter:

- **Local, not `--global`.** Don't change machine-wide config to fix one repository. It may belong to someone else, or to another identity you use.
- **Match the history.** `git log --format='%an <%ae>'` shows every earlier commit as `elirc <elirc@users.noreply.github.com>`. A different author on the new commits would break attribution, and on GitHub it might link to nobody.
- **The noreply address** is GitHub's privacy-preserving email. It keeps a personal address out of public history.

The CRLF warnings (`LF will be replaced by CRLF`) on every Windows commit are git's line-ending conversion. They're harmless here, but the lasting fix is a `.gitattributes` (`* text=auto eol=lf`) so every contributor's checkout is the same. Otherwise a teammate on macOS eventually sees a diff where every line changed.

## What never goes in the repository

`.gitignore` covers the categories:

```gitignore
/node_modules          # dependencies: reproducible from package-lock.json
/.next/  /out/  /build # build output: reproducible from source
.env*                  # secrets and machine-specific config
*.pem                  # private keys
*.db  *.db-wal  *.db-shm
reps.db  reps.db-wal  reps.db-shm   # the learner's progress
*.tsbuildinfo  next-env.d.ts        # generated
```

The rule underneath all of it: **commit what can't be regenerated and isn't private. Ignore everything else.**

`reps.db` is ignored for two reasons. It's **personal data** (a learner's full attempt history) and it's **machine state** (it changes on every answer, so committing it would mean endless merge conflicts). The content that seeds it *is* committed, in `src/content/**`, and `npm run db:seed` rebuilds everything except personal progress. Note the belt-and-braces: `*.db` already covers `reps.db`, and the second explicit block documents *why*. The WAL files (`-wal`, `-shm`) are listed too, because SQLite in WAL mode (`journal_mode = WAL` in `src/lib/db/index.ts`) keeps recent writes in them. Committing `reps.db` without them would give you a corrupt or stale copy.

## A committed secret is rotated, not scrubbed

Reps has no secrets today: no API keys, no auth, local SQLite. You'll work on projects that do, and this is the rule to know before it happens:

**If a secret is committed, treat it as leaked. Rotate it first. Clean the history second, if at all.**

Why scrubbing isn't enough:

- The moment it was **pushed**, it may have been cloned, forked, cached by CI, indexed by a secret scanner, or copied by a bot that scrapes public commits for keys. Bots do this within minutes.
- Rewriting history (`git filter-repo`, BFG) changes *your* copy of the repo and the remote's branches. It doesn't reach anyone else's clone, and old commits can stay reachable through caches, PR refs or forks.
- Force-pushing rewritten history breaks every collaborator's local branches, which makes the incident worse.

The order of operations:

1. **Revoke or rotate** the credential at its provider. Now the leaked value is worthless.
2. **Check** the provider's access logs for use between the leak and the rotation.
3. **Remove** it from the current code, move it to an environment variable, and make sure `.env*` is ignored (it is, here).
4. *Optionally* rewrite history, as housekeeping, not as the fix.
5. **Prevent** recurrence: a pre-commit secret scanner, and push protection on the host.

A junior's instinct is to hide the mistake quickly. A senior's instinct is to make the mistake harmless, then fix the process.

## Shipping checklist for this repo

Before pushing a branch or opening a PR:

```bash
npm run check          # typecheck + lint + content linter
npm run db:seed        # content seeds cleanly into an existing DB (migrations work)
npm run build          # production build, route count as expected
git status             # nothing unintended staged: no reps.db, no scratch scripts
git diff --stat main...  # the change is the size you think it is
```

Then write the commit message with what, why and verified. Push to a feature branch and open the PR.

Note the `git status` line. At the time of writing, `scripts/_audit.ts` is an untracked scratch script. Either commit it on purpose, with a name and a `package.json` script, or leave it out on purpose. Don't sweep it in with `git add -A`.

## Try it yourself

1. Run `git log --format='%h %an <%ae> %ad %s' --date=short` and check every commit has the same identity. Then run `git config --show-origin user.email` and see where the value comes from.
2. Run `git check-ignore -v reps.db reps.db-wal .env.local` and read which `.gitignore` line matches each.
3. Rewrite `c027fca`'s message (don't amend, just write it out) as three separate commits that would each build. What would each "Verified:" line say?
4. Write the runbook for "I just pushed a `.env` with a database password to a public repo", in order, with who you'd tell.

> **Junior vs senior**
>
> **Junior:** commits the rewrite straight to `main` with the message "big update". Sets `--global` git config to whatever makes the error go away. Force-pushes to "delete" a leaked key and moves on.
>
> **Senior:** uses a feature branch and a PR, with a structured message that ends in "Verified:". Sets a local identity that matches history. Ignores anything that can be regenerated or is private. Rotates a leaked secret before touching history, then adds a scanner so it can't happen again.
