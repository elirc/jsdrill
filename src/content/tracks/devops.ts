import { defineTrack, mod, mcq, multi, tf, blank, order, short } from "../builder";

export default defineTrack({
  slug: "devops",
  name: "Git, Build & Deploy",
  tagline: "The daily workflow nobody teaches you",
  description:
    "Git day to day, branching and pull requests, package management and build tooling, and what happens between merging and running in production.",
  icon: "⑂",
  color: "#64748b",
  modules: [
    mod("git-daily", {
      title: "Git Day to Day",
      level: 1,
      summary: "The commands you'll run hourly, and how to undo things safely.",
      keyIdeas: [
        "Three places: working directory → staging (`add`) → repository (`commit`).",
        "`revert` adds a commit that undoes another — safe on shared history. `reset` rewrites history — local only.",
        "`reset --soft` keeps changes staged, `reset` (mixed) keeps them unstaged, `reset --hard` deletes them.",
        "`reflog` finds commits after a bad reset; anything committed is usually recoverable.",
        "`--amend` and `push --force-with-lease` only on your own unpushed or unshared branches.",
      ],
      brief: `Git has three places a change can be: the **working directory** (your files), the **staging area / index** (\`git add\`), and the **repository** (\`git commit\`).

\`\`\`bash
git status                 # what's changed, what's staged
git add -p                 # stage selectively, hunk by hunk
git commit -m "..."        # record the staged snapshot
git log --oneline --graph  # history
git diff                   # unstaged changes
git diff --staged          # staged changes
\`\`\`

**Undoing things** — the table worth memorising, because the words are confusingly similar:

| Goal | Command |
|---|---|
| Unstage a file, keep changes | \`git restore --staged <file>\` |
| Discard local changes to a file | \`git restore <file>\` ⚠️ destructive |
| Undo the last commit, keep changes staged | \`git reset --soft HEAD~1\` |
| Undo the last commit, keep changes unstaged | \`git reset HEAD~1\` |
| Undo the last commit and **delete** the changes | \`git reset --hard HEAD~1\` ⚠️ |
| Undo a commit that is already pushed | \`git revert <sha>\` ✅ safe |

**\`revert\` vs \`reset\`** is the interview question. \`reset\` rewrites history — fine locally, destructive on a shared branch. \`revert\` creates a *new* commit that undoes an old one, so history is preserved and nobody else's clone breaks. **On anything pushed and shared, use \`revert\`.**

\`git stash\` parks work in progress; \`git reflog\` is the safety net that finds "lost" commits after a bad reset.`,
      items: [
        mcq("git-revert-reset", {
          q: "You pushed a bad commit to `main` and others have pulled it. How do you undo it?",
          why: "**`git revert <sha>`** — it creates a *new* commit that applies the inverse changes. History stays intact, so everyone's clone continues to work and a normal `git pull` picks up the fix.\n\n`git reset --hard` followed by a force push rewrites shared history. Everyone else's branch now diverges from the remote; their next pull produces conflicts or silently re-introduces the commit you removed, and anyone who branched from it is stranded.\n\nThe rule: **never rewrite history that has been pushed and shared**. Locally, before pushing, `reset` and `rebase` are perfectly fine and often preferable for tidying up.",
          tip: "Almost guaranteed to come up. State the rule, not just the command.",
          c: ["git"],
          d: 2,
          choices: [
            { t: "`git revert <sha>` — a new commit undoing it, history preserved", ok: true, why: "Correct and safe for shared branches." },
            { t: "`git reset --hard HEAD~1` then force push", why: "Rewrites shared history and breaks everyone's clone." },
            { t: "Delete the branch and recreate it", why: "Same problem, more disruption." },
            { t: "`git checkout HEAD~1`", why: "Just moves you to a detached HEAD; nothing is undone." },
          ],
        }),
        mcq("git-reset-modes", {
          q: "You committed too early and want the changes back as uncommitted edits, with the commit gone.",
          why: "`git reset --soft HEAD~1` removes the commit and leaves the changes **staged**, ready to re-commit — ideal for splitting or amending a message.\n\n`git reset HEAD~1` (mixed, the default) leaves them **unstaged** in your working directory. `git reset --hard HEAD~1` removes the commit **and discards the changes entirely** — the destructive one people run by accident.\n\nIf you do run `--hard` by mistake, `git reflog` usually saves you: it records where HEAD has been, so you can find the lost commit's sha and `git reset --hard <sha>` back to it. Knowing about reflog is a genuinely useful thing to mention.",
          c: ["git"],
          d: 2,
          choices: [
            { t: "`git reset --soft HEAD~1` (staged) or `git reset HEAD~1` (unstaged)", ok: true, why: "Correct — both keep the changes." },
            { t: "`git reset --hard HEAD~1`", why: "Deletes the changes as well as the commit." },
            { t: "`git revert HEAD`", why: "Adds an undo commit rather than removing the original." },
            { t: "`git clean -fd`", why: "Removes untracked files — unrelated and destructive." },
          ],
        }),
        multi("git-safe", {
          q: "Which Git operations can lose work if used carelessly?",
          why: "Destructive: `git reset --hard` (discards commits and working changes), `git checkout -- <file>` / `git restore <file>` (overwrites local edits), `git clean -fd` (deletes untracked files, including ones never committed), and `push --force` (overwrites the remote — prefer `--force-with-lease`, which refuses if someone else has pushed since you last fetched).\n\nSafe: `git fetch` only updates remote-tracking refs and never touches your working directory, and `git stash` parks changes retrievably.\n\nThe general reassurance: anything **committed** is usually recoverable via `reflog`. Anything never committed generally is not — which is the argument for committing early and often on your own branch.",
          c: ["git"],
          d: 3,
          choices: [
            { t: "`git reset --hard`", ok: true },
            { t: "`git checkout -- <file>` / `git restore <file>`", ok: true },
            { t: "`git clean -fd`", ok: true },
            { t: "`git push --force`", ok: true },
            { t: "`git fetch`", why: "Only updates remote-tracking refs; your work is untouched." },
            { t: "`git stash`", why: "Parks changes and they can be restored." },
          ],
        }),
        blank("git-amend", {
          q: "Fix a typo in the message of your most recent, unpushed commit.",
          template: `git commit --{{1}} -m "correct message"`,
          answers: [["amend"]],
          hints: ["The flag that rewrites the last commit"],
          why: "`--amend` replaces the previous commit with a new one — new message, and any currently staged changes folded in. It is a history rewrite, which is why it is only safe **before pushing**.\n\nIf you have already pushed and are on your own feature branch, `--force-with-lease` is the acceptable way to update it: unlike plain `--force`, it refuses if someone else has pushed to that branch since you last fetched, so you cannot silently overwrite a colleague's work.\n\nAmending a shared branch like `main` is the thing never to do.",
          c: ["git"],
          d: 2,
        }),
      ],
    }),

    mod("git-collab", {
      title: "Branching, PRs & Merge vs Rebase",
      level: 2,
      summary: "How a team actually works, and resolving conflicts without fear.",
      keyIdeas: [
        "Rebase your own feature branch to stay current; merge to integrate; never rebase shared history.",
        "Conflicts are just edits Git could not make — resolve to the correct final state, `add`, continue.",
        "Small single-purpose PRs with a 'why' description; CI green before review; self-review the diff first.",
        "A committed secret stays in history — rotate it immediately; scrubbing history is cleanup, not the fix.",
        "`.gitignore` build output, `node_modules`, `bin/`, `obj/`, `.env`.",
      ],
      brief: `**Feature branch workflow**, in practice:

\`\`\`bash
git switch main && git pull
git switch -c feat/order-filters
# ... work, commit ...
git push -u origin feat/order-filters
# open a PR, get review, merge
\`\`\`

**Merge vs rebase:**

- \`git merge main\` — creates a merge commit. History shows exactly what happened, including the branching. Safe on shared branches.
- \`git rebase main\` — replays your commits on top of the latest \`main\`. Linear, readable history, but it **rewrites your commits** (new shas).

The widely-used rule: **rebase your own local feature branch to keep it current; merge to integrate into a shared branch.** Never rebase a branch other people have based work on.

**Conflicts** happen when two branches change the same lines. Git marks them with \`<<<<<<<\`, \`=======\`, \`>>>>>>>\`. Resolve by editing to the correct final state — often neither side verbatim — then \`git add\` and continue. There is nothing magic about them; they are just an edit Git could not make for you.

**Good PRs** are small, single-purpose, and have a description explaining *why* — the diff already shows *what*. A 2,000-line PR gets rubber-stamped, which defeats the point of review.

**\`.gitignore\`**: \`node_modules\`, \`bin/\`, \`obj/\`, \`.env\`, build output. Never commit secrets — history keeps them even after deletion, so a leaked key must be **rotated**, not just removed.`,
      items: [
        mcq("git-merge-rebase", {
          q: "When is rebasing the wrong choice?",
          why: "When the branch is **shared**. Rebase rewrites commits with new shas, so anyone who has pulled that branch now has a divergent history — their next pull produces confusing conflicts or duplicated commits, and anyone who branched off it is stranded.\n\nThe workable convention: **rebase your own feature branch** onto the latest `main` to keep it current and produce a clean linear history, but **merge** when integrating into `main`. Never rebase `main` itself or any branch colleagues are working on.\n\nSome teams avoid rebase entirely for simplicity and lose only history tidiness. Both positions are defensible — having a reason is what matters.",
          tip: "'Don't rebase shared history' is the rule; explaining *why* the shas change is the depth.",
          c: ["git"],
          d: 3,
          choices: [
            {
              t: "When others have based work on that branch — rebasing rewrites shas and diverges their history",
              ok: true,
              why: "Correct.",
            },
            { t: "When the branch has more than one commit", why: "Rebasing multiple commits is routine." },
            { t: "When there are conflicts", why: "Both merge and rebase surface conflicts." },
            { t: "Never — rebase is always safer than merge", why: "It is more dangerous precisely on shared branches." },
          ],
        }),
        order("git-pr-flow", {
          q: "Order a typical feature branch workflow.",
          steps: [
            "Switch to main and pull the latest changes",
            "Create a feature branch from main",
            "Commit work in small, focused commits",
            "Rebase or merge the latest main into the branch to stay current",
            "Push the branch and open a pull request",
            "Address review feedback with follow-up commits",
            "Merge into main once approved and CI passes",
            "Delete the merged branch",
          ],
          why: "The details that matter: **pull before branching**, so you start from current code rather than yesterday's. **Update from `main` while working** on anything long-lived, so conflicts surface in small pieces rather than one enormous one at the end. And **CI must pass before merging**, not after — a red `main` blocks everyone.\n\nDeleting the merged branch keeps the branch list navigable; the commits live on in `main`, so nothing is lost.",
          c: ["git", "deployment"],
          d: 2,
          secs: 90,
        }),
        multi("git-pr-quality", {
          q: "What makes a pull request easy to review?",
          why: "Small and single-purpose — a reviewer can hold 200 lines in their head, not 2,000. A description explaining **why**, since the diff already shows what. Passing CI before requesting review, so the reviewer is not the one to discover the build is broken. And self-review first — reading your own diff catches debug logging, commented-out code and stray files remarkably often.\n\nWhat makes review harder: mixing a refactor with a behaviour change, so nobody can tell which line caused which effect; and bundling unrelated fixes because they happened to be in the same area.",
          c: ["git"],
          d: 2,
          choices: [
            { t: "Small and focused on a single change", ok: true },
            { t: "A description explaining why, not just what", ok: true },
            { t: "CI passing before review is requested", ok: true },
            { t: "Self-reviewing the diff first", ok: true },
            { t: "Combining a refactor with a behaviour change to save time", why: "Makes it impossible to attribute effects to changes." },
            { t: "Bundling unrelated fixes into one PR", why: "Forces reviewers to context-switch repeatedly." },
          ],
        }),
        tf("git-secret-removed", {
          q: "Deleting a committed API key in a later commit removes it from the repository.",
          answer: false,
          why: "It does not. Git stores the full history, so the key remains in the earlier commit and anyone with the repository — or a fork, a clone, or a CI cache — can retrieve it with `git log -p`.\n\nThe **only** correct response is to **rotate the secret** immediately: revoke the old key and issue a new one. Assume it is compromised the moment it is pushed, particularly on a public repository, where automated scrapers find keys within minutes.\n\nYou can scrub history with `git filter-repo` or BFG, but that rewrites every commit and requires everyone to re-clone — and it still does not help if anyone has already pulled. Rotation is the real fix; history rewriting is cleanup.",
          tip: "Answering 'rotate it, immediately' rather than 'rewrite history' is the security-literate response.",
          c: ["git", "security"],
          d: 2,
        }),
      ],
    }),

    mod("deploy-build", {
      title: "Packages, Builds & Environments",
      level: 3,
      summary: "Semver, lockfiles, and what a build actually produces.",
      keyIdeas: [
        "Semver: major breaks, minor adds, patch fixes. `^1.2.3` allows 1.x.x; `~1.2.3` allows 1.2.x.",
        "Commit the lockfile for applications; `npm ci` installs exactly from it and fails on mismatch.",
        "Runtime imports go in `dependencies`; build/test tooling in `devDependencies`.",
        "`NEXT_PUBLIC_`/`VITE_` values ship in the bundle — anyone can read them. Proxy real secrets through your server.",
        "Vite and esbuild strip types without checking them — run `tsc` in the build to fail on type errors.",
      ],
      brief: `**Semantic versioning** — \`MAJOR.MINOR.PATCH\`:
- **MAJOR** — breaking change
- **MINOR** — backwards-compatible feature
- **PATCH** — backwards-compatible fix

Range syntax in \`package.json\`: \`^1.2.3\` allows any \`1.x.x\` (minor and patch), \`~1.2.3\` allows \`1.2.x\` (patch only), \`1.2.3\` is exact.

**The lockfile** (\`package-lock.json\`, \`yarn.lock\`) records the exact resolved version of every package including transitive dependencies. **Commit it for applications** — it is what makes an install reproducible. \`npm ci\` installs strictly from the lockfile and fails if \`package.json\` disagrees; use it in CI. \`npm install\` may *update* the lockfile, which is not what you want mid-pipeline.

**\`dependencies\` vs \`devDependencies\`**: anything imported by runtime code is a dependency. Build tools, test runners, TypeScript and linters are dev. Getting this wrong produces the classic "works locally, \`MODULE_NOT_FOUND\` in production".

**What a front-end build does**: transpiles modern syntax and TypeScript, bundles modules, tree-shakes unused exports, minifies, hashes filenames for cache busting, and generates source maps.

**Environment variables in the browser are public.** Anything inlined at build time (\`NEXT_PUBLIC_*\`, \`VITE_*\`) ships in the bundle and is readable by anyone. Server-side secrets must never appear in a client build.`,
      items: [
        mcq("deploy-ci-install", {
          q: "Why does CI use `npm ci` rather than `npm install`?",
          why: "`npm ci` installs **exactly** what the lockfile specifies, deletes `node_modules` first for a clean slate, and **fails** if `package.json` and the lockfile disagree. That makes builds reproducible and catches an out-of-date lockfile as a pipeline error rather than a silent drift.\n\n`npm install` may resolve new versions within your semver ranges and *rewrite* the lockfile. In CI that means today's build can differ from yesterday's with no code change — the 'works on my machine, breaks in CI' class of problem, in reverse.\n\nIt is also faster, since it skips the resolution step entirely.",
          c: ["packages", "deployment"],
          d: 2,
          choices: [
            {
              t: "It installs exactly from the lockfile and fails on mismatch — reproducible builds",
              ok: true,
              why: "Correct, and faster too.",
            },
            { t: "It installs only production dependencies", why: "That is `--omit=dev`, a separate flag." },
            { t: "It updates packages to their latest versions", why: "The opposite — it pins to the lockfile." },
            { t: "There is no difference", why: "The reproducibility guarantee differs substantially." },
          ],
        }),
        mcq("deploy-env-public", {
          q: "Is it safe to put an API secret in `NEXT_PUBLIC_API_SECRET`?",
          why: "**No.** The `NEXT_PUBLIC_` prefix (and Vite's `VITE_`) explicitly means 'inline this into the client bundle'. The value ships in the JavaScript served to every visitor, and anyone can read it by opening DevTools or the source file. The same applies to any value your build inlines.\n\nThose prefixes are for genuinely public values: a public API base URL, a publishable Stripe key, an analytics site id.\n\nA real secret must stay server-side. If the browser needs data that requires a secret, proxy it: the browser calls *your* server, and your server — which alone holds the key — calls the third party.",
          tip: "'If the browser can use it, the user can read it' is the principle.",
          c: ["security", "config", "tooling"],
          d: 2,
          choices: [
            {
              t: "No — that prefix inlines it into the client bundle for anyone to read",
              ok: true,
              why: "Correct: proxy through your own server instead.",
            },
            { t: "Yes — it is encrypted during the build", why: "Nothing encrypts it; it is plain text in the bundle." },
            { t: "Yes, provided the site uses HTTPS", why: "HTTPS protects transit, not the contents of the bundle." },
            { t: "Yes, as long as it is not logged", why: "It is visible in the served JavaScript regardless." },
          ],
        }),
        multi("deploy-semver", {
          q: "Which statements about versioning and dependencies are correct?",
          why: "`^1.2.3` permits any `1.x.x`, so a minor release is installed automatically on a fresh resolve. `~1.2.3` is narrower — patch only. Applications should commit the lockfile for reproducibility, while **libraries** generally do not, since consumers resolve their own dependency tree.\n\nWhat is wrong: a major version bump signals a **breaking** change, so it is precisely the one requiring care; and semver is a convention maintainers follow by agreement, not a technical guarantee — plenty of packages break compatibility in a minor release, which is why the lockfile matters.",
          c: ["packages"],
          d: 3,
          choices: [
            { t: "`^1.2.3` allows any 1.x.x release", ok: true },
            { t: "`~1.2.3` allows patch releases only", ok: true },
            { t: "Applications should commit the lockfile", ok: true },
            { t: "Libraries usually do not commit a lockfile", ok: true },
            { t: "A major bump is always safe to take automatically", why: "Major means breaking by definition." },
            { t: "Semver is enforced by npm", why: "It is a convention, not a technical guarantee." },
          ],
        }),
        blank("deploy-scripts", {
          q: "Add a script so `npm run build` compiles TypeScript and bundles the app.",
          template: `{
  "scripts": {
    "dev": "vite",
    "{{1}}": "tsc && vite build",
    "test": "{{2}}"
  }
}`,
          answers: [["build"], ["vitest", "vitest run", "jest"]],
          hints: ["The conventional production build script name", "A JS test runner command"],
          why: "`package.json` scripts are the project's public interface — `dev`, `build`, `test`, `start` are conventional enough that any developer (and most CI templates) can pick up the repository and know what to run.\n\n`tsc && vite build` runs the type check first and short-circuits on failure, so a type error fails the build rather than producing a bundle that compiles but is wrong. Note that Vite and esbuild **strip** types without checking them, so without a separate `tsc` step type errors would not fail the build at all — a genuinely surprising fact worth knowing.",
          c: ["tooling", "packages"],
          d: 2,
        }),
      ],
    }),

    mod("deploy-ship", {
      title: "Deploying & Debugging Production",
      level: 4,
      summary: "CI/CD, migrations, rollbacks and diagnosing what you can't reproduce.",
      keyIdeas: [
        "Pipeline: install → lint → typecheck → test → build → deploy → smoke test. Tests gate, always.",
        "Build once and promote the same artefact; configure per environment from outside.",
        "Schema changes must work with the previously deployed version: expand, dual-write, backfill, contract later.",
        "Restore service first (roll back), diagnose second. Rollback must be routine and rehearsed.",
        "Debug production from logs with correlation ids and error tracking; then reproduce with a failing test.",
      ],
      brief: `**A CI/CD pipeline**, roughly: install → lint → type-check → test → build → deploy → smoke test.

**Build once, promote the same artefact.** Rebuilding per environment means the thing you tested is not the thing you shipped. Configuration comes from the environment, not from a rebuild.

**Database migrations in a deploy** are the hard part, because the database cannot be rolled back as easily as code. The safe approach is **expand/contract**:

1. **Expand** — add the new column as nullable. Old and new code both work.
2. Deploy code that writes to both, then backfill.
3. **Contract** — once no running version needs it, drop the old column, in a *later* release.

Never combine a destructive schema change with the deploy that needs it. If the deploy rolls back, the old code meets a schema it does not understand.

**Rollback** must be a routine, boring operation. If your only recovery is "fix forward and hope", the pipeline is not finished.

**Deployment strategies**: rolling (replace instances gradually), blue/green (two environments, switch traffic), canary (a small percentage first, watch the metrics).

**Debugging production** — you cannot attach a debugger, so you need: structured logs with correlation ids, error tracking (Sentry), metrics (latency, error rate, throughput), and health checks. "It works locally" is where the investigation *starts*: the difference is usually data volume, configuration, concurrency, or environment.`,
      items: [
        mcq("deploy-migration", {
          q: "You're renaming a heavily-used database column. How do you deploy it without downtime?",
          why: "**Expand/contract**, across multiple releases. Add the new column (nullable) so both old and new code work. Deploy code that writes to both and reads the new one, falling back to the old. Backfill existing rows. Then, in a **later** release once nothing reads it, drop the old column.\n\nA single migration that renames the column breaks every instance still running the old code during a rolling deploy — and if you need to roll back, the old code meets a schema it does not recognise. Taking the site down works but is exactly what zero-downtime deployment exists to avoid.\n\nThe underlying principle: **schema changes must be backwards-compatible with the previously deployed version**, because for a period both are running.",
          tip: "Naming 'expand/contract' and 'backwards-compatible with the previous version' is a strong senior signal.",
          c: ["deployment", "schema-design"],
          d: 3,
          choices: [
            {
              t: "Expand/contract — add the new column, dual-write, backfill, drop the old one in a later release",
              ok: true,
              why: "Correct: every intermediate state works with both code versions.",
            },
            { t: "One migration that renames it, deployed with the code", why: "Breaks instances still running the old version." },
            { t: "Take the site down, migrate, bring it back", why: "Works, but is the downtime you were avoiding." },
            { t: "Rename in code only and map it in the ORM forever", why: "Defers the problem and adds permanent complexity." },
          ],
        }),
        multi("deploy-pipeline", {
          q: "Which belong in a CI pipeline for a full-stack app?",
          why: "Lint and type-check catch cheap problems before the expensive steps. The test suite must **fail the build** — tests that run but do not gate anything are decoration. Building the production artefact in CI verifies it actually builds, and a smoke test after deploy confirms the thing is genuinely serving traffic rather than merely reporting 'deployed'.\n\nWhat does not belong: skipping tests to ship faster (that is the pipeline's entire purpose), and deploying straight to production on every commit *without* automated verification — continuous deployment is fine, but only when the pipeline can actually catch failures.",
          c: ["deployment", "testing"],
          d: 2,
          choices: [
            { t: "Lint and type-check before the expensive steps", ok: true },
            { t: "Run the test suite and fail the build on failure", ok: true },
            { t: "Build the production artefact to verify it builds", ok: true },
            { t: "Smoke test after deploying", ok: true },
            { t: "Skip tests when a release is urgent", why: "Urgent releases are when you need them most." },
            { t: "Deploy to production on every commit with no verification", why: "Continuous deployment still requires gates." },
          ],
        }),
        mcq("deploy-debug", {
          q: "A bug appears only in production. It cannot be reproduced locally. Where do you start?",
          why: "**Logs and error tracking**, filtered to that request. A correlation id lets you follow one user's request across services and see exactly where it diverged, and an error tracker gives you the stack trace with the real input.\n\nThe usual causes, in roughly descending order: **data** (production has volumes, encodings and edge-case records your seed data does not), **configuration** (a different connection string, feature flag or environment variable), **concurrency** (a race that only appears under real load), and **environment** (different runtime version, timezone, or filesystem case-sensitivity).\n\nThe habit to describe: once you find the cause, write a **failing test that reproduces it** before fixing — that both confirms the diagnosis and prevents a regression.",
          c: ["logging", "deployment", "error-handling"],
          d: 3,
          choices: [
            {
              t: "Logs and error tracking for that request, then check data, config, concurrency and environment differences",
              ok: true,
              why: "Correct — and reproduce with a failing test before fixing.",
            },
            { t: "Add `console.log` statements and redeploy repeatedly", why: "Slow, and it should not take a deploy to see what happened." },
            { t: "Restart the servers and see whether it recurs", why: "Hides the symptom without finding the cause." },
            { t: "Roll back and close the ticket", why: "Rollback is right for mitigation, but the bug is still there." },
          ],
        }),
        tf("deploy-rollback", {
          q: "If a deploy causes a production incident, the right first move is usually to diagnose and fix forward.",
          answer: false,
          why: "The first move is to **restore service** — normally by rolling back — and diagnose afterwards. Every minute spent debugging under pressure is a minute of user-facing failure, and pressure is when mistakes get made.\n\nRoll back, confirm the system is healthy, then investigate calmly with the logs and the artefact you removed.\n\nThe exception is when rollback is not possible or would be worse — typically because a database migration cannot be reversed, which is exactly the argument for backwards-compatible migrations. If your process makes rollback frightening, that is the thing to fix.",
          tip: "'Mitigate first, diagnose second' is the standard incident-response instinct interviewers listen for.",
          c: ["deployment"],
          d: 3,
        }),
        short("deploy-explain-pipeline", {
          q: "*\"Describe how you'd get a change from your laptop into production.\"*",
          why: "A broad question that reveals whether you have shipped anything real. The strong answer covers verification, promotion and recovery.",
          model:
            "I'd work on a feature branch off an up-to-date main, in small commits, and open a pull request when it's ready. CI runs on the PR: lint, type-check, unit and integration tests, and a production build — so I know it compiles and passes before anyone reviews it.\n\nAfter review and approval it merges to main, and that triggers the deployment pipeline. The important principle is **build once and promote the same artefact** — the container image or bundle that ran in staging is the exact one that goes to production. If you rebuild per environment, the thing you tested isn't the thing you shipped.\n\nIf there's a database migration, I'd check it's backwards-compatible with the currently-running version, because during a rolling deploy both versions are live at once. Anything destructive gets split across releases: add the new column, dual-write, backfill, and drop the old one later.\n\nAfter deploying I'd want an automated smoke test hitting a couple of key endpoints, and I'd watch error rate and latency for a few minutes. For a risky change I'd prefer a canary — a small percentage of traffic first — so a problem affects a few users rather than everyone.\n\nAnd I'd make sure rollback is a one-click, boring operation before I need it. If the only recovery plan is fixing forward under pressure, that's the actual risk.",
          points: [
            "Feature branch → PR → CI gates (lint, types, tests, build) before review",
            "Build once, promote the same artefact through environments",
            "Migrations backwards-compatible with the running version; expand/contract",
            "Smoke test and watch error rate/latency after deploy",
            "Canary or staged rollout for risky changes",
            "Rollback must be routine and rehearsed",
          ],
          c: ["deployment", "testing", "git"],
          d: 3,
          secs: 190,
        }),
      ],
    }),
  ],
});
