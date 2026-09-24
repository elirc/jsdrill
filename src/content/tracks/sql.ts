import { defineTrack, mod, mcq, multi, tf, out, blank, short } from "../builder";

export default defineTrack({
  slug: "sql",
  name: "Databases & SQL",
  tagline: "Where the data actually lives",
  description:
    "Querying, joins and aggregation, schema design, transactions and the indexing questions that come up whenever you claim backend experience.",
  icon: "▤",
  color: "#f97316",
  modules: [
    mod("sql-query", {
      title: "Querying Fundamentals",
      level: 1,
      summary: "Logical execution order, NULL, and WHERE vs HAVING.",
      keyIdeas: [
        "Logical order: FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT.",
        "`WHERE` filters rows before grouping; `HAVING` filters groups after — aggregates go in HAVING.",
        "SELECT aliases are not visible in WHERE (it runs earlier) but are in ORDER BY.",
        "NULL is unknown: `NULL = NULL` is not true; use `IS NULL`. Aggregates skip NULLs; `COUNT(*)` does not.",
        "`NOT IN (subquery)` returns zero rows if the subquery contains a single NULL — prefer `NOT EXISTS`.",
      ],
      brief: `SQL is **declarative**: you describe the result, the engine decides how to produce it.

**Logical execution order** — not the order you write it, and it explains most beginner errors:

\`FROM\` → \`JOIN\` → \`WHERE\` → \`GROUP BY\` → \`HAVING\` → \`SELECT\` → \`ORDER BY\` → \`LIMIT\`

Because \`SELECT\` runs *after* \`WHERE\`, you cannot use a column alias defined in \`SELECT\` inside \`WHERE\`. You *can* use it in \`ORDER BY\`, which runs later.

**\`WHERE\` filters rows; \`HAVING\` filters groups.** \`WHERE\` before grouping, \`HAVING\` after — so aggregate conditions like \`COUNT(*) > 5\` must be in \`HAVING\`.

**NULL is not a value, it is "unknown".** Every comparison with it yields unknown:

- \`NULL = NULL\` → not true. Use \`IS NULL\`.
- \`COUNT(*)\` counts rows; \`COUNT(col)\` skips NULLs.
- Aggregates like \`SUM\` and \`AVG\` ignore NULLs — so \`AVG\` over a column with NULLs is not the same as dividing by the row count.
- \`NOT IN (subquery)\` returns **no rows** if the subquery contains a single NULL. This one genuinely bites people.`,
      items: [
        mcq("sql-q-having", {
          q: "Find customers with more than 5 orders. Where does `COUNT(*) > 5` go?",
          why: "In **`HAVING`**. `WHERE` is evaluated before rows are grouped, so aggregates do not exist yet and referencing `COUNT(*)` there is a syntax error. `HAVING` runs after `GROUP BY` and filters the resulting groups.\n\n```sql\nSELECT customer_id, COUNT(*) AS order_count\nFROM orders\nGROUP BY customer_id\nHAVING COUNT(*) > 5;\n```\n\nA useful nuance: put non-aggregate conditions in `WHERE` rather than `HAVING` even when both work, because filtering rows *before* grouping means the engine groups less data.",
          c: ["sql-basics"],
          d: 1,
          choices: [
            { t: "`HAVING` — it filters groups after aggregation", ok: true, why: "Correct." },
            { t: "`WHERE` — it filters before grouping", why: "Aggregates do not exist at that stage." },
            { t: "Either works identically", why: "`WHERE` with an aggregate is a syntax error." },
            { t: "In the `SELECT` clause with a `CASE`", why: "That computes a value; it does not filter rows out." },
          ],
        }),
        out("sql-q-null", {
          q: "The `orders` table has 100 rows; 30 have a NULL `discount`. What does each return?",
          code: `SELECT COUNT(*), COUNT(discount), SUM(discount) FROM orders;`,
          lang: "sql",
          why: "`COUNT(*)` = **100** — it counts rows regardless of content. `COUNT(discount)` = **70** — it counts non-NULL values only. `SUM(discount)` ignores NULLs and sums the 70 real values (returning NULL only if *every* value is NULL).\n\nThe practical trap is `AVG`: `AVG(discount)` divides by 70, not 100. If a NULL discount logically means zero, you get a materially wrong average — use `AVG(COALESCE(discount, 0))` when that is the intent. Knowing that NULL means *unknown* rather than *zero* is the whole lesson.",
          tip: "The `NOT IN (…NULL…)` returning zero rows trap is a great follow-up to volunteer.",
          c: ["sql-basics"],
          d: 2,
          choices: [
            { t: "100, 70, and the sum of the 70 non-NULL values", ok: true, why: "Correct — aggregates skip NULLs; `COUNT(*)` does not." },
            { t: "100, 100, and the sum of all rows treating NULL as 0", why: "NULL is never treated as 0 by aggregates." },
            { t: "70, 70, and the sum of 70 values", why: "`COUNT(*)` counts every row." },
            { t: "100, 70, and NULL", why: "`SUM` returns NULL only if all values are NULL." },
          ],
        }),
        mcq("sql-q-alias", {
          q: "Why does this fail?",
          code: `SELECT price * quantity AS total
FROM order_items
WHERE total > 100;`,
          lang: "sql",
          why: "`WHERE` is evaluated **before** `SELECT`, so the alias `total` does not exist yet.\n\nOptions: repeat the expression (`WHERE price * quantity > 100`), or wrap it in a subquery or CTE and filter the outer query. `ORDER BY total` *does* work, because `ORDER BY` runs after `SELECT` — which is exactly the evidence that the ordering rule is real and not arbitrary.\n\nRemembering the logical order — FROM, JOIN, WHERE, GROUP BY, HAVING, SELECT, ORDER BY — explains this and several other confusing errors.",
          c: ["sql-basics"],
          d: 2,
          choices: [
            { t: "`WHERE` runs before `SELECT`, so the alias is not defined yet", ok: true, why: "Correct — repeat the expression or use a CTE." },
            { t: "Aliases require double quotes", why: "Quoting is unrelated to the evaluation order." },
            { t: "You cannot multiply columns in `SELECT`", why: "You can." },
            { t: "`total` is a reserved word", why: "It is not the issue here." },
          ],
        }),
        multi("sql-q-null-rules", {
          q: "Which statements about NULL are correct?",
          why: "NULL means *unknown*, so `NULL = NULL` is not true — you must use `IS NULL`. `COUNT(col)` skips NULLs while `COUNT(*)` does not. `NOT IN` with a subquery containing any NULL returns **no rows at all**, because the comparison evaluates to unknown for every row — a genuinely surprising, silent bug. And `COALESCE(col, 0)` is the standard way to substitute a default.\n\nWhat is wrong: NULL is not an empty string (a NULL name and `''` are different), and a `UNIQUE` constraint permits multiple NULLs in most databases, since two unknowns are not provably equal.",
          c: ["sql-basics"],
          d: 3,
          choices: [
            { t: "`NULL = NULL` is not true — use `IS NULL`", ok: true },
            { t: "`COUNT(col)` excludes NULLs; `COUNT(*)` does not", ok: true },
            { t: "`NOT IN` against a subquery containing a NULL returns no rows", ok: true },
            { t: "`COALESCE(col, 0)` substitutes a default for NULL", ok: true },
            { t: "NULL and an empty string are equivalent", why: "They are distinct values." },
            { t: "A UNIQUE column allows only one NULL", why: "Most databases allow many — two unknowns are not equal." },
          ],
        }),
        mcq("sql-q-delete-truncate", {
          q: "Which correctly contrasts `DELETE`, `TRUNCATE` and `DROP`?",
          why: "**`DELETE` removes rows, `TRUNCATE` removes all rows at once, `DROP` removes the table itself.**\n\n`DELETE FROM orders WHERE ...` works row by row: it accepts a `WHERE` clause, logs each row, fires `DELETE` triggers, and leaves identity counters alone. It is the only one of the three for removing *some* rows.\n\n`TRUNCATE TABLE orders` empties the whole table by deallocating its data pages, which makes it much faster on large tables and lighter on the log. It takes no `WHERE`, does not fire row triggers, and in SQL Server resets the identity seed. It is also blocked when another table references this one with a foreign key.\n\n`DROP TABLE orders` removes the rows *and* the definition — columns, indexes, constraints, permissions.\n\nA common misconception is that `TRUNCATE` can never be rolled back. In SQL Server and PostgreSQL it can, inside an explicit transaction; in MySQL and Oracle it commits implicitly. Say 'it depends on the database' rather than guessing.",
          tip: "Naming the rollback nuance per database is what separates a careful answer from a memorised one.",
          c: ["sql-basics", "transactions"],
          d: 2,
          choices: [
            {
              t: "`DELETE` removes chosen rows and fires triggers; `TRUNCATE` empties the table fast without a `WHERE`; `DROP` removes the table definition too",
              ok: true,
              why: "Correct — rows, all rows, table.",
            },
            {
              t: "`TRUNCATE` accepts a `WHERE` clause and is simply a faster `DELETE`",
              why: "`TRUNCATE` always empties the whole table.",
            },
            {
              t: "`DROP` removes the rows but keeps the table structure for reuse",
              why: "That describes `TRUNCATE`. `DROP` removes the structure as well.",
            },
            {
              t: "`TRUNCATE` can never be rolled back in any database",
              why: "SQL Server and PostgreSQL can roll it back inside a transaction; MySQL and Oracle commit implicitly.",
            },
          ],
        }),
      ],
    }),

    mod("sql-joins", {
      title: "Joins & Aggregation",
      level: 2,
      summary: "INNER vs LEFT, and the WHERE clause that quietly undoes your LEFT JOIN.",
      keyIdeas: [
        "INNER keeps matches only; LEFT keeps every left row with NULLs for no match.",
        "A WHERE condition on the right table of a LEFT JOIN turns it back into an INNER JOIN — put it in ON.",
        "Anti-join for 'has none': LEFT JOIN … WHERE right.id IS NULL, or NOT EXISTS.",
        "Count a right-table column (`COUNT(o.id)`) to get 0 for unmatched rows; `COUNT(*)` gives 1.",
        "Every non-aggregated SELECT column must be in GROUP BY; GROUP BY does not sort.",
      ],
      brief: `| Join | Keeps |
|---|---|
| \`INNER\` | Only rows matching on both sides |
| \`LEFT\` | Every left row; NULLs where no right match |
| \`RIGHT\` | Every right row (rare — usually rewritten as LEFT) |
| \`FULL OUTER\` | Everything from both sides |
| \`CROSS\` | Every combination (Cartesian product) |

**The classic trap**: filtering a LEFT-joined table in \`WHERE\` turns it back into an INNER JOIN.

\`\`\`sql
-- BROKEN: drops customers with no orders, because NULL <> 'shipped'
SELECT c.name, o.id
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.status = 'shipped';

-- CORRECT: the condition belongs in ON
LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'shipped';
\`\`\`

The rule: conditions on the **right** table of a LEFT JOIN go in \`ON\`. Conditions on the left table go in \`WHERE\`.

**Finding rows with no match** — the anti-join:

\`\`\`sql
SELECT c.* FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;
\`\`\`

**\`GROUP BY\`** requires every non-aggregated \`SELECT\` column to appear in it (Postgres and SQL Server enforce this; MySQL historically did not, which produced arbitrary results).`,
      items: [
        mcq("sql-join-leftwhere", {
          q: "Why does this return no customers who have never ordered?",
          code: `SELECT c.name, COUNT(o.id)
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.created_at > '2024-01-01'
GROUP BY c.name;`,
          lang: "sql",
          why: "The `WHERE` clause runs **after** the join. For a customer with no orders, every `o.*` column is NULL, and `NULL > '2024-01-01'` is unknown — so the row is filtered out. The LEFT JOIN is effectively converted to an INNER JOIN.\n\nMove the condition into the `ON`:\n\n```sql\nLEFT JOIN orders o\n  ON o.customer_id = c.id\n AND o.created_at > '2024-01-01'\n```\n\nNow non-matching orders are excluded during the join while the customer row survives with a count of 0. This is one of the most common SQL bugs in real reporting queries.",
          tip: "The rule to state: right-table conditions go in ON, left-table conditions go in WHERE.",
          c: ["joins", "sql-basics"],
          d: 3,
          choices: [
            {
              t: "`WHERE` runs after the join, and NULL fails the comparison — move it into `ON`",
              ok: true,
              why: "Correct: this silently turns LEFT into INNER.",
            },
            { t: "`LEFT JOIN` never includes unmatched rows", why: "It does — that is its purpose." },
            { t: "`COUNT` excludes customers with zero orders", why: "`COUNT(o.id)` would correctly return 0 if the row survived." },
            { t: "`GROUP BY c.name` drops the NULL rows", why: "Grouping does not filter." },
          ],
        }),
        blank("sql-join-antijoin", {
          q: "Find customers who have never placed an order.",
          template: `SELECT c.*
FROM customers c
{{1}} JOIN orders o ON o.customer_id = c.id
WHERE o.id {{2}} NULL;`,
          answers: [["LEFT", "left"], ["IS", "is"]],
          hints: ["The join that keeps every left-hand row", "The NULL comparison operator"],
          why: "The **anti-join** pattern: LEFT JOIN keeps every customer, and `WHERE o.id IS NULL` retains only those where no order matched.\n\n`NOT EXISTS` is an equally idiomatic alternative and often reads better:\n\n```sql\nWHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)\n```\n\n`NOT IN` also works but is dangerous — a single NULL in the subquery's result makes it return **zero rows**. Preferring `NOT EXISTS` over `NOT IN` for exactly that reason is a good detail to mention.",
          c: ["joins"],
          d: 2,
          secs: 65,
        }),
        mcq("sql-join-inner-vs-left", {
          q: "A dashboard shows order counts per customer and quietly omits customers with zero orders. Which join is in use?",
          why: "An `INNER JOIN` — it only keeps rows that match on both sides, so a customer with no orders has nothing to match and disappears entirely.\n\nUse a `LEFT JOIN` from `customers` so every customer survives, with `COUNT(o.id)` (not `COUNT(*)`) returning 0 for them. `COUNT(*)` would count the single NULL-filled joined row as 1, which is a subtle and easy mistake — counting a specific column from the right table is what gives the correct zero.",
          c: ["joins"],
          d: 2,
          choices: [
            { t: "INNER JOIN — switch to LEFT JOIN and use `COUNT(o.id)`", ok: true, why: "Correct, including the COUNT detail." },
            { t: "LEFT JOIN — it needs a `HAVING` clause", why: "A LEFT JOIN would already include them." },
            { t: "CROSS JOIN", why: "That would produce far too many rows, not too few." },
            { t: "FULL OUTER JOIN", why: "That keeps everything from both sides." },
          ],
        }),
        multi("sql-join-groupby", {
          q: "Which are true about `GROUP BY`?",
          why: "Every non-aggregated column in `SELECT` must appear in `GROUP BY` — Postgres and SQL Server enforce this, and MySQL's historic `ONLY_FULL_GROUP_BY`-off behaviour returned arbitrary values from the group, which is a silent correctness bug rather than a convenience.\n\nYou can group by several columns to form composite groups, and `HAVING` filters the resulting groups. Filtering with `WHERE` **before** grouping is a genuine optimisation, since fewer rows are grouped.\n\nWhat is false: `GROUP BY` does not guarantee ordering (add `ORDER BY` if you need it), and aggregates cannot be referenced in `WHERE`.",
          c: ["sql-basics"],
          d: 2,
          choices: [
            { t: "Non-aggregated SELECT columns must appear in GROUP BY", ok: true },
            { t: "You can group by multiple columns to form composite groups", ok: true },
            { t: "HAVING filters groups after aggregation", ok: true },
            { t: "Filtering in WHERE before grouping reduces the work done", ok: true },
            { t: "GROUP BY guarantees the result is sorted by those columns", why: "Ordering is only guaranteed by ORDER BY." },
            { t: "Aggregates can be used in WHERE", why: "They must go in HAVING." },
          ],
        }),
        mcq("sql-join-union-all", {
          q: "You combine this year's and last year's order tables, which cannot contain the same order twice. `UNION` or `UNION ALL`?",
          why: "**`UNION ALL`.** `UNION` removes duplicate rows from the combined result, which forces the database to sort or hash the whole output to find them. `UNION ALL` simply appends one result to the other.\n\nWhen the inputs cannot overlap — as here — the de-duplication is pure cost with no effect on the result, and on large sets that cost is significant. Worse, if the rows *could* legitimately repeat (two identical line items, say), `UNION` would silently discard real data.\n\nSo the rule of thumb: default to `UNION ALL`, and use `UNION` only when you specifically want duplicates removed. Both require the same number of columns with compatible types, and the column names come from the first `SELECT`.\n\nNot to be confused with joins: `UNION` stacks rows vertically; a `JOIN` combines columns side by side.",
          tip: "Stating 'UNION ALL by default, UNION only when you want de-duplication' shows you think about cost.",
          c: ["sql-basics", "performance"],
          d: 1,
          choices: [
            {
              t: "`UNION ALL` — it skips the costly de-duplication, which cannot change the result here",
              ok: true,
              why: "Correct — no overlap, so removing duplicates is wasted work.",
            },
            {
              t: "`UNION` — it is always faster because it produces fewer rows",
              why: "Finding duplicates requires a sort or hash over everything; it is the slower of the two.",
            },
            {
              t: "`UNION`, because `UNION ALL` requires the tables to have identical names",
              why: "Both only require matching column count and compatible types.",
            },
            {
              t: "Either — they are synonyms",
              why: "`UNION` removes duplicate rows; `UNION ALL` keeps every row.",
            },
          ],
        }),
      ],
    }),

    mod("sql-design", {
      title: "Schema Design & Transactions",
      level: 3,
      summary: "Keys, normalisation, and ACID with the isolation levels.",
      keyIdeas: [
        "Primary keys identify; foreign keys enforce relationships — and usually do not create an index for you.",
        "Many-to-many needs a junction table with a composite key; relationship facts live there.",
        "Normalise to 3NF by default; denormalise deliberately for a measured read path with a plan to keep it consistent.",
        "ACID: a transfer's debit and credit must commit together or not at all.",
        "Isolation levels trade anomalies for concurrency: Read Committed is the common default; Serializable is strictest.",
      ],
      brief: `**Keys**: a **primary key** uniquely identifies a row. A **foreign key** references another table's primary key and lets the database *enforce* the relationship — orphaned rows become impossible rather than merely discouraged.

**Normalisation** removes duplicated facts so one change updates one row:
- **1NF** — atomic values, no repeating groups (no comma-separated lists in a column).
- **2NF** — no partial dependency on part of a composite key.
- **3NF** — no non-key column depending on another non-key column.

In practice "3NF unless measurement says otherwise" is the working answer. Denormalise **deliberately**, for a specific read path, accepting the update cost.

**Relationships**: one-to-many via a foreign key on the many side; many-to-many via a **junction table** (\`student_courses\` with both foreign keys as a composite primary key).

**Transactions — ACID**: Atomic, Consistent, Isolated, Durable. The classic example is a transfer: debit and credit must both happen or neither.

**Isolation levels**, from weakest, each preventing one more anomaly:

| Level | Prevents |
|---|---|
| Read Uncommitted | nothing (dirty reads possible) |
| Read Committed | dirty reads |
| Repeatable Read | + non-repeatable reads |
| Serializable | + phantom reads |

Stronger isolation means more locking and less concurrency. Read Committed is the common default.`,
      items: [
        mcq("sql-des-manytomany", {
          q: "Students enrol in many courses; courses have many students. How do you model it?",
          why: "A **junction (join) table** — `enrolments(student_id, course_id)` — with a composite primary key on both columns and a foreign key to each side. That is the only relational way to express many-to-many.\n\nIt also gives you somewhere to put facts *about the relationship*: `enrolled_at`, `grade`, `status`. Those belong to the pairing, not to either entity, and having nowhere to put them is the tell that someone has modelled it wrong.\n\nA comma-separated `course_ids` column violates 1NF: you cannot index it, join on it, or enforce referential integrity, and querying 'who is in course 7' becomes a string search.",
          c: ["schema-design"],
          d: 2,
          choices: [
            {
              t: "A junction table with both foreign keys as a composite primary key",
              ok: true,
              why: "Correct — and it holds relationship attributes too.",
            },
            { t: "A comma-separated `course_ids` column on students", why: "Violates 1NF; unindexable and unenforceable." },
            { t: "A `course_id` foreign key on students", why: "That only models one course per student." },
            { t: "Duplicate the student row once per course", why: "Duplicates every student fact — an update anomaly." },
          ],
        }),
        mcq("sql-des-transaction", {
          q: "A transfer debits one account and credits another. Why must it be a transaction?",
          why: "**Atomicity.** Without a transaction, a crash, exception or constraint violation between the two statements leaves money debited and never credited — permanently lost, with no error visible to anyone. A transaction guarantees both statements commit or neither does.\n\nThe other properties matter here too: **isolation** stops a concurrent reader seeing the half-completed state, and **durability** ensures a committed transfer survives a power loss.\n\nThe follow-up interviewers often ask is about concurrency — two simultaneous withdrawals both reading a balance of 100 and both succeeding. That needs an appropriate isolation level or explicit locking (`SELECT ... FOR UPDATE`), not just a transaction.",
          c: ["transactions"],
          d: 2,
          choices: [
            {
              t: "Atomicity — a failure between the statements would otherwise lose money permanently",
              ok: true,
              why: "Correct, and isolation prevents readers seeing the half state.",
            },
            { t: "For performance — transactions batch the writes", why: "A side effect at best; correctness is the reason." },
            { t: "To avoid a deadlock", why: "Transactions can cause deadlocks, not prevent them." },
            { t: "It is not required if both statements are in one query", why: "Multi-statement work still needs a transaction boundary." },
          ],
        }),
        multi("sql-des-fk", {
          q: "What does declaring a foreign key actually give you?",
          why: "The database **enforces** referential integrity: you cannot insert an order for a customer that does not exist, and you cannot delete a customer that still has orders unless you specify `ON DELETE CASCADE` or `SET NULL`. It also documents the relationship for anyone reading the schema or using a diagramming tool, and query planners use the constraint for optimisation.\n\nWhat it does **not** do: create an index automatically. In most databases (MySQL/InnoDB is the exception) the foreign key column is *not* indexed, so joins and cascading deletes scan. Adding that index yourself is a genuinely valuable habit — and a good answer to volunteer.",
          tip: "'Foreign keys don't create an index in Postgres or SQL Server' is a detail that lands well.",
          c: ["schema-design", "indexing"],
          d: 3,
          choices: [
            { t: "The database rejects rows referencing a non-existent parent", ok: true },
            { t: "Deletes of a referenced parent are blocked or cascaded per your rule", ok: true },
            { t: "It documents the relationship for tooling and readers", ok: true },
            { t: "It creates an index on the foreign key column automatically", why: "Postgres and SQL Server do not — add it yourself." },
            { t: "It improves join performance on its own", why: "Only indirectly, and only if you add the index." },
          ],
        }),
        tf("sql-des-denorm", {
          q: "Denormalising a schema is always a mistake.",
          answer: false,
          why: "It is a **trade-off**, not a mistake. Normalise by default — one fact in one place means one update — but denormalise deliberately when a measured read path demands it: a cached `order_count` on a customer row, or a stored `total` on an order so historical prices survive a later price change.\n\nThe cost is that duplicated data can drift, so you need a maintenance strategy (a trigger, an application-level update, or a scheduled reconciliation). The wrong version is *accidental* denormalisation — the same fact in three tables because nobody designed it.\n\nAnswering with 'it depends on the read/write ratio, and here's how I'd keep it consistent' is far stronger than a rule.",
          c: ["schema-design", "performance"],
          d: 3,
        }),
        multi("sql-des-pk-unique", {
          q: "Which statements about primary keys and unique constraints are correct?",
          why: "Correct: a table has **at most one primary key**, but can have **many unique constraints**; primary key columns **cannot be NULL**; and both are enforced with a unique index behind the scenes.\n\nThe primary key is *the* identity of a row — what foreign keys point at. A unique constraint expresses any other business rule about uniqueness: an email address, an SKU, a `(tenant_id, slug)` pair. A common design is a surrogate primary key (`id`) plus a unique constraint on the natural key.\n\nUnique constraints **can** include NULL columns, and how many NULLs are allowed varies by database: SQL Server allows only one NULL in a unique column, while PostgreSQL by default treats NULLs as distinct and allows many. In SQL Server the primary key also becomes the **clustered index** by default, unless you say otherwise or the table already has one.",
          tip: "The NULL-handling difference between SQL Server and PostgreSQL is a detail interviewers love.",
          c: ["schema-design", "indexing"],
          d: 2,
          choices: [
            { t: "A table can have one primary key but several unique constraints", ok: true },
            { t: "Primary key columns cannot contain NULL", ok: true },
            { t: "Both are enforced using a unique index", ok: true },
            { t: "A unique constraint column can never contain NULL", why: "NULLs are allowed; how many depends on the database." },
            { t: "Only a primary key can be referenced by a foreign key", why: "A foreign key may reference any unique key, though the primary key is the usual target." },
          ],
        }),
      ],
    }),

    mod("sql-perf", {
      title: "Indexes & Query Performance",
      level: 4,
      summary: "The main lever, its costs, and how to defeat it by accident.",
      keyIdeas: [
        "Index the columns you filter, join and sort on; every index costs writes and storage.",
        "A function on an indexed column (`YEAR(created_at)`) is non-sargable — rewrite as a range on the bare column.",
        "Composite indexes follow the leftmost-prefix rule: `(a, b)` serves `a` and `a, b`, never `b` alone.",
        "`LIKE 'x%'` uses an index; `LIKE '%x'` cannot.",
        "Read `EXPLAIN ANALYZE` — a scan where you expected a seek, or estimates far from actuals, points at the cause.",
      ],
      brief: `An index is a sorted structure (usually a B-tree) that turns a full table scan into a targeted seek. It is the single biggest lever on read performance.

**Index what you filter, join and sort on** — the columns in \`WHERE\`, \`JOIN ... ON\` and \`ORDER BY\`.

**The costs are real:**
- Every \`INSERT\`, \`UPDATE\` and \`DELETE\` must maintain every index on the table.
- Indexes consume storage and memory.
- Redundant indexes slow writes for no read benefit.

**Composite indexes are order-sensitive.** An index on \`(last_name, first_name)\` serves \`WHERE last_name = ?\` and \`WHERE last_name = ? AND first_name = ?\`, but **not** \`WHERE first_name = ?\` alone — the leftmost-prefix rule.

**How to accidentally disable an index:**

\`\`\`sql
WHERE YEAR(created_at) = 2024        -- function on the column: no index
WHERE created_at >= '2024-01-01'     -- sargable: index used
      AND created_at <  '2025-01-01'

WHERE name LIKE '%smith'             -- leading wildcard: no index
WHERE name LIKE 'smith%'             -- prefix: index used
\`\`\`

Wrapping an indexed column in a function makes the predicate **non-sargable** and forces a scan.

**\`EXPLAIN\`** (or \`EXPLAIN ANALYZE\`) shows the plan the engine chose. "Seq Scan"/"Table Scan" on a large table where you expected a seek is the signal to investigate.`,
      items: [
        mcq("sql-perf-sargable", {
          q: "There is an index on `created_at`, but this query still scans the table. Why?",
          code: `SELECT * FROM orders WHERE YEAR(created_at) = 2024;`,
          lang: "sql",
          why: "The index stores raw `created_at` values, not `YEAR(created_at)`. Wrapping the column in a function means the engine must compute it for **every row** before comparing, so the sorted index is useless — the predicate is **non-sargable**.\n\nRewrite it as a range over the bare column:\n\n```sql\nWHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'\n```\n\nNow the index gives a direct range seek. The general rule: **keep the indexed column bare on one side of the comparison**. The same applies to `UPPER(email) = ?` (use a case-insensitive collation or a computed index) and `col + 0 = ?`.",
          tip: "'Sargable' is the term. Using it, and giving the rewrite, is a strong backend signal.",
          c: ["indexing", "performance"],
          d: 3,
          choices: [
            {
              t: "The function makes it non-sargable — rewrite as a range on the bare column",
              ok: true,
              why: "Correct: the index stores the column, not the function of it.",
            },
            { t: "The index is on the wrong data type", why: "The type is fine; the expression is the problem." },
            { t: "`SELECT *` prevents index use", why: "It can force a lookup, but the scan here is caused by the predicate." },
            { t: "Date columns cannot be indexed effectively", why: "They index very well for range queries." },
          ],
        }),
        mcq("sql-perf-composite", {
          q: "There is an index on `(last_name, first_name)`. Which query cannot use it?",
          why: "**`WHERE first_name = 'Ada'` alone.** A composite index is sorted by its first column, then the second within it — like a phone book ordered by surname then forename. You can find every 'Lovelace', and 'Lovelace, Ada' quickly, but finding every 'Ada' regardless of surname means reading the whole book.\n\nThis is the **leftmost-prefix rule**: an index on `(a, b, c)` serves queries filtering on `a`, on `a, b`, or on `a, b, c` — never on `b` or `c` alone.\n\nTo support first-name-only lookups you need a separate index on `first_name`. (Some engines can do an 'index skip scan' when the leading column has very few distinct values, but that is an optimisation, not something to rely on.)",
          c: ["indexing"],
          d: 3,
          choices: [
            { t: "`WHERE first_name = 'Ada'`", ok: true, why: "Correct — it skips the leading column." },
            { t: "`WHERE last_name = 'Lovelace'`", why: "Uses the leading column — fully supported." },
            { t: "`WHERE last_name = 'Lovelace' AND first_name = 'Ada'`", why: "The ideal case for this index." },
            { t: "`ORDER BY last_name, first_name`", why: "Matches the index order — it can be served directly." },
          ],
        }),
        multi("sql-perf-costs", {
          q: "What are the real costs of adding an index?",
          why: "Every write must update every index on the table, so write throughput drops as index count rises. Indexes consume storage and compete for buffer-pool memory. Redundant indexes — one on `(a)` when `(a, b)` already exists — cost writes and give nothing back. And creating an index on a large table can lock it, which is why production usually needs `CREATE INDEX CONCURRENTLY` or an equivalent.\n\nWhat is *not* a cost: reads do not get slower (the planner simply ignores unhelpful indexes), and indexes do not change query results.",
          c: ["indexing", "performance"],
          d: 3,
          choices: [
            { t: "Every INSERT/UPDATE/DELETE must maintain it", ok: true },
            { t: "Storage and memory consumption", ok: true },
            { t: "Redundant indexes cost writes with no read benefit", ok: true },
            { t: "Creating one on a large table can lock it", ok: true },
            { t: "Reads become slower", why: "The planner ignores indexes that do not help." },
            { t: "Query results can change", why: "Indexes never affect correctness." },
          ],
        }),
        short("sql-perf-explain-slow", {
          q: "*\"A report query that took 200ms now takes 40 seconds. Walk me through diagnosing it.\"*",
          why: "An open diagnostic question. Interviewers want a method — and specifically that you look at the plan rather than guessing at indexes.",
          model:
            "First I'd ask what changed, because 200ms to 40 seconds is usually a threshold being crossed rather than a gradual slide — data volume growing past the point where the planner switches strategy, a new join added, or a recent schema change.\n\nThen I'd run `EXPLAIN ANALYZE` and read the actual plan. I'm looking for a sequential scan on a large table where I expected an index seek, a nested loop over far more rows than expected, or a big gap between the estimated and actual row counts — that gap usually means stale statistics, and updating them can fix the problem on its own.\n\nThe common causes I'd check in order: a missing index on a filter or join column; a predicate that's been made non-sargable by wrapping a column in a function, which silently disables an index that does exist; an unbounded result set that's simply got bigger; and an N+1 pattern if this is coming through an ORM rather than raw SQL.\n\nThen I'd fix the most likely cause and re-run `EXPLAIN ANALYZE` to confirm the plan actually changed — adding an index doesn't guarantee the planner uses it. I'd also check the write impact before adding an index to a hot table, and if this is a heavy reporting query on a production database, I'd ask whether it should be running against a read replica instead of competing with live traffic.",
          points: [
            "Ask what changed — data volume, schema, or the query itself",
            "Read EXPLAIN ANALYZE; look for scans and estimate-vs-actual gaps",
            "Stale statistics are a common and cheap fix",
            "Check for non-sargable predicates disabling an existing index",
            "Confirm the plan changed after the fix",
            "Weigh write cost; consider a read replica for reporting",
          ],
          c: ["indexing", "performance"],
          d: 3,
          secs: 180,
        }),
        mcq("sql-perf-clustered", {
          q: "In SQL Server, what is the difference between a clustered and a non-clustered index?",
          why: "A **clustered index is the table**: the rows themselves are stored in a B-tree ordered by the clustered key, so there can be only **one** per table. A **non-clustered index** is a separate B-tree holding the indexed columns plus a pointer to the full row — in a clustered table, that pointer is the clustered key. You can have many.\n\nThat pointer explains a classic performance issue: if a query uses a non-clustered index but needs columns it does not contain, SQL Server performs a **key lookup** into the clustered index for every matching row. For a handful of rows that is cheap; for thousands it can be slower than scanning. The fix is a **covering index**, adding the extra columns with `INCLUDE (...)` so the query is answered from the index alone.\n\nGood clustered keys are narrow, unique, stable and ever-increasing (an `int` identity is the textbook case), because every non-clustered index carries a copy of that key. A random GUID as the clustered key causes page splits and fragmentation on insert.\n\nThe primary key is clustered by default (when no clustered index exists yet), but the two are separate choices — you can declare `PRIMARY KEY NONCLUSTERED`.",
          tip: "Mention key lookups and `INCLUDE` — it turns a definition into a tuning answer.",
          c: ["indexing", "performance"],
          d: 2,
          choices: [
            {
              t: "The clustered index stores the rows themselves in key order (one per table); non-clustered indexes are separate structures pointing to the rows",
              ok: true,
              why: "Correct — and the pointer is why key lookups exist.",
            },
            {
              t: "Clustered indexes are stored on several servers in a cluster",
              why: "'Clustered' refers to how rows are physically ordered, not to server clusters.",
            },
            {
              t: "A table can have several clustered indexes, one per frequently filtered column",
              why: "The rows can only be stored in one order, so there is at most one.",
            },
            {
              t: "Non-clustered indexes are always faster because they are smaller",
              why: "Not when the query needs other columns — each match then costs a key lookup.",
            },
          ],
        }),
      ],
    }),
  ],
});
