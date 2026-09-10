import { defineTrack, mod, mcq, multi, tf, out, short } from "../builder";

export default defineTrack({
  slug: "testing",
  name: "Testing",
  tagline: "Proving it works, and keeping it working",
  description:
    "What to test and at which level, unit testing in JS/TS and .NET, testing React components the way users use them, and the mocking questions that come up.",
  icon: "✓",
  color: "#14b8a6",
  modules: [
    mod("test-strategy", {
      title: "What to Test, and Where",
      level: 1,
      summary: "The pyramid, and testing behaviour rather than implementation.",
      brief: `**The testing pyramid** — many fast unit tests, fewer integration tests, a handful of end-to-end tests:

- **Unit** — one function or class in isolation. Milliseconds. Pinpoints the failure exactly.
- **Integration** — several pieces together: an API endpoint hitting a real test database. Catches wiring, config, SQL and serialisation problems units cannot.
- **End-to-end** — a real browser driving the real app. Highest confidence, slowest, flakiest, hardest to debug.

The shape matters because cost and feedback speed vary by orders of magnitude. An "ice-cream cone" — mostly E2E — gives slow, flaky suites people learn to ignore.

**Test behaviour, not implementation.** Assert on what the code *does*, not how. A test that asserts "\`calculateTotal\` called \`applyDiscount\` once" breaks the moment you refactor, even though nothing is broken. A test asserting "a 10% discount on £100 returns £90" survives any refactor and still catches real bugs.

**Coverage is a diagnostic, not a target.** 100% coverage with no meaningful assertions proves nothing; the useful question is "does this test fail when I break the behaviour?"

**Arrange–Act–Assert**, one logical assertion per test, and a name that states the expected behaviour: \`returns_zero_when_cart_is_empty\`.`,
      items: [
        mcq("test-strat-pyramid", {
          q: "Why not just write end-to-end tests, if they give the most confidence?",
          why: "Because of **speed, reliability and diagnosis**. E2E tests take seconds to minutes each, so a large suite becomes a 40-minute pipeline nobody wants to run. They are flaky — timing, network, animations — and a flaky suite trains the team to re-run rather than investigate, which is how real failures get ignored.\n\nAnd when one fails you learn 'checkout is broken', not *which* of the fifty involved units is wrong. A unit test failure names the function.\n\nThe balance: enough E2E to cover the critical user journeys (sign up, check out), integration tests for the wiring, and units for the logic and edge cases.",
          c: ["testing"],
          d: 2,
          choices: [
            {
              t: "They are slow, flaky, and tell you something broke without telling you what",
              ok: true,
              why: "Correct — hence a few for critical journeys only.",
            },
            { t: "They cannot test business logic", why: "They can — just slowly and imprecisely." },
            { t: "They require a production environment", why: "They run against a test environment." },
            { t: "They are less accurate than unit tests", why: "They are more realistic; the cost is speed and precision." },
          ],
        }),
        mcq("test-strat-behaviour", {
          q: "Which test is more valuable?",
          code: `// A
expect(applyDiscountSpy).toHaveBeenCalledTimes(1);

// B
expect(calculateTotal([{ price: 100 }], "SAVE10")).toBe(90);`,
          why: "**B.** It asserts the observable behaviour: given this input, produce this output. It survives any refactor of the internals and still fails if the discount logic breaks.\n\nA asserts an implementation detail. Rename `applyDiscount`, inline it, or restructure the calculation and the test fails even though the behaviour is perfect — a false alarm. Worse, A would still pass if `applyDiscount` were called with completely wrong arguments, so it does not even verify correctness.\n\nTests coupled to implementation make refactoring expensive, which is precisely backwards: good tests should make you *more* willing to change code.",
          tip: "'Test behaviour, not implementation' is the phrase, and this is the concrete example.",
          c: ["testing"],
          d: 2,
          choices: [
            { t: "B — it asserts observable behaviour and survives refactoring", ok: true, why: "Correct." },
            { t: "A — verifying the collaboration is more thorough", why: "It breaks on refactors and does not verify the result." },
            { t: "They are equally valuable", why: "Only one still passes after an internal refactor." },
            { t: "A, because spies are faster", why: "Speed is not the differentiator here." },
          ],
        }),
        multi("test-strat-good", {
          q: "Which make a test suite worth having?",
          why: "Deterministic tests (no dependence on real time, random values, network or execution order) mean a red build is always a real signal. Test names that state the expected behaviour make a failure report readable without opening the file. Tests that fail when you deliberately break the code are the only proof they work — the actual definition of value. And independence means any test can run alone or in any order.\n\nWhat is harmful: chasing a coverage percentage, which produces assertion-free tests that execute lines without checking anything; and asserting on private internals, which couples the suite to implementation.",
          c: ["testing"],
          d: 2,
          choices: [
            { t: "Deterministic — no reliance on real time, randomness, network or order", ok: true },
            { t: "Names that state the expected behaviour", ok: true },
            { t: "They actually fail when the behaviour is broken", ok: true },
            { t: "Each test runs independently, in any order", ok: true },
            { t: "100% line coverage as the goal", why: "Coverage without assertions proves nothing." },
            { t: "Assertions on private methods and internal state", why: "Couples tests to implementation." },
          ],
        }),
        tf("test-strat-coverage", {
          q: "High code coverage guarantees the code is well tested.",
          answer: false,
          why: "No. Coverage measures which lines **executed** during the test run, not whether anything meaningful was **asserted**. A test that calls every function and asserts nothing reports 100% coverage and catches zero bugs.\n\nIt is useful as a *diagnostic*: an uncovered branch is definitively untested, and that is worth knowing. It is harmful as a *target*, because teams reach the number by writing shallow tests rather than valuable ones — Goodhart's law in miniature.\n\nThe question that actually matters is mutation-testing's question: if I deliberately break this behaviour, does a test fail?",
          c: ["testing"],
          d: 2,
        }),
      ],
    }),

    mod("test-unit", {
      title: "Unit Testing JS, TS & .NET",
      level: 2,
      summary: "Jest/Vitest and xUnit, plus what to mock and what not to.",
      brief: `**JavaScript/TypeScript** — Vitest (Vite projects) or Jest. Same shape:

\`\`\`js
describe("calculateTotal", () => {
  it("applies a 10% discount", () => {
    expect(calculateTotal([{ price: 100 }], "SAVE10")).toBe(90);
  });
});
\`\`\`

\`toBe\` is \`Object.is\` (reference equality); **\`toEqual\` is structural** — for objects and arrays you almost always want \`toEqual\`.

**.NET** — xUnit is the current default. \`[Fact]\` for a single case, \`[Theory]\` with \`[InlineData]\` for parameterised cases. Moq or NSubstitute for test doubles, FluentAssertions for readable assertions.

\`\`\`csharp
[Theory]
[InlineData(100, "SAVE10", 90)]
[InlineData(100, null, 100)]
public void Applies_discount(decimal price, string? code, decimal expected) =>
    Assert.Equal(expected, Calculate(price, code));
\`\`\`

**What to mock**: things that are slow, non-deterministic, or outside your control — HTTP calls, the clock, random numbers, email, payment providers.

**What not to mock**: the thing under test, or simple value objects. Over-mocking produces a test that verifies your mocks agree with each other while the real integration is broken.

**Injecting the clock** — \`IClock\`/\`Date.now\` passed in rather than called directly — is what makes date logic testable, and it is a common interview follow-up.`,
      items: [
        mcq("test-unit-toequal", {
          q: "Why does this fail?",
          code: `expect({ id: 1, name: "Ada" }).toBe({ id: 1, name: "Ada" });`,
          why: "`toBe` uses `Object.is` — **reference** equality. Two object literals with identical contents are still two different objects, so it fails.\n\nUse `toEqual` for **structural** (deep) comparison. The related distinction: `toEqual` ignores `undefined` properties, while `toStrictEqual` does not and also checks the class/prototype — useful when the difference between `{a: 1}` and `{a: 1, b: undefined}` matters.\n\nThis is the same reference-vs-value distinction behind React's re-render checks and `memo` — the same idea appearing in a different place.",
          c: ["testing", "equality"],
          d: 1,
          choices: [
            { t: "`toBe` compares references — use `toEqual` for deep equality", ok: true, why: "Correct." },
            { t: "The property order differs", why: "`toEqual` is order-independent for object keys." },
            { t: "Objects cannot be compared in Jest", why: "They can, with the right matcher." },
            { t: "It needs `await`", why: "Nothing asynchronous is involved." },
          ],
        }),
        multi("test-unit-mock", {
          q: "Which dependencies should a unit test replace with a test double?",
          why: "Mock what is **slow, non-deterministic, or out of your control**: HTTP calls to third parties, the system clock, random number generation, email and payment providers, and (for a pure unit test) the database.\n\nDo not mock the class under test — that is testing your mock. Do not mock simple value objects or pure functions; they are fast and deterministic, and mocking them adds setup while removing real verification.\n\nThe clock is the one people miss. Code calling `DateTime.Now` or `Date.now()` directly cannot be tested for 'what happens at month end' without changing the machine clock. Injecting an `IClock` makes it trivial — and it is a frequent follow-up question.",
          c: ["mocking", "testing"],
          d: 2,
          choices: [
            { t: "An HTTP call to a third-party API", ok: true },
            { t: "The system clock", ok: true },
            { t: "Random number generation", ok: true },
            { t: "An email or payment provider", ok: true },
            { t: "The class under test", why: "Then you are testing the mock." },
            { t: "A pure function that formats a string", why: "Fast and deterministic — use the real one." },
          ],
        }),
        out("test-unit-async", {
          q: "This test always passes, even when the code is broken. Why?",
          code: `it("fetches the user", () => {
  getUser(1).then(user => {
    expect(user.name).toBe("Ada");
  });
});`,
          why: "The test function returns **before the promise resolves**. The runner sees a synchronous function that completed without throwing and reports a pass; the assertion runs later, in a different tick, where the failure is unattached to any test — often surfacing as a confusing unhandled rejection or nothing at all.\n\nFix by returning the promise or using async/await:\n\n```js\nit(\"fetches the user\", async () => {\n  const user = await getUser(1);\n  expect(user.name).toBe(\"Ada\");\n});\n```\n\nA test that can never fail is worse than no test, because it produces false confidence. The habit that catches this: deliberately break the code once and confirm the test goes red.",
          tip: "'Always-green tests' are a favourite topic — this is the most common cause.",
          c: ["testing", "async-await"],
          d: 3,
          choices: [
            {
              t: "The test returns before the promise settles — return it or use async/await",
              ok: true,
              why: "Correct: the assertion runs after the test finished.",
            },
            { t: "`expect` does not work inside `.then`", why: "It works — it just runs too late." },
            { t: "Jest needs `done` for every test", why: "Returning the promise or awaiting is the modern approach." },
            { t: "`toBe` cannot compare strings", why: "It compares strings fine." },
          ],
        }),
        mcq("test-unit-theory", {
          q: "In xUnit, which attribute runs one test method against several input sets?",
          why: "`[Theory]` with `[InlineData(...)]` — one method, many cases, each reported as a separate test so you can see exactly which input failed.\n\n```csharp\n[Theory]\n[InlineData(0, 0)]\n[InlineData(5, 25)]\npublic void Squares(int input, int expected) =>\n    Assert.Equal(expected, Square(input));\n```\n\n`[Fact]` is a single case with no parameters. For data that cannot be a compile-time constant — objects, decimals in some cases — use `[MemberData]` or `[ClassData]`.\n\nThe equivalent in Vitest/Jest is `it.each`.",
          c: ["testing"],
          d: 1,
          choices: [
            { t: "`[Theory]` with `[InlineData]`", ok: true, why: "Correct — each case reports separately." },
            { t: "`[Fact]` with an array parameter", why: "`[Fact]` takes no parameters." },
            { t: "`[TestCase]`", why: "That is NUnit's attribute." },
            { t: "`[Repeat]`", why: "No such xUnit attribute." },
          ],
        }),
      ],
    }),

    mod("test-react", {
      title: "Testing React & APIs",
      level: 3,
      summary: "Query the way a user would, and integration-test the endpoint.",
      brief: `**React Testing Library**'s guiding principle: *the more your tests resemble the way your software is used, the more confidence they give*. So query the DOM the way a user perceives it, not by implementation details.

**Query priority:**
1. \`getByRole\` — \`getByRole("button", { name: /save/i })\`. Best: it is what assistive technology sees, so it also nudges you toward accessible markup.
2. \`getByLabelText\` — form fields.
3. \`getByText\` — non-interactive content.
4. \`getByTestId\` — last resort.

**\`getBy\` vs \`queryBy\` vs \`findBy\`:**
- \`getBy\` — throws if not found (use when it should exist).
- \`queryBy\` — returns null (the **only** correct way to assert absence).
- \`findBy\` — returns a promise, retries (for anything appearing after an async update).

Interact with \`userEvent\`, not \`fireEvent\` — it simulates the real sequence of events a user produces (focus, keydown, keypress, input).

**Do not test**: internal state, that a hook was called, or exact class names. **Do test**: what renders for given props, what happens on interaction, and the loading/error/empty states.

**API integration tests** hit a real endpoint against a real test database — that is where you catch wiring, serialisation, SQL and status-code errors that unit tests structurally cannot.`,
      items: [
        mcq("test-react-query", {
          q: "Which query should you prefer for a submit button?",
          why: "`getByRole(\"button\", { name: /submit/i })` — it finds the element by its **accessible role and name**, which is exactly how a screen reader (and therefore a user relying on one) perceives it. If the query cannot find it, that is often a real accessibility problem rather than a test problem, so the test doubles as an a11y check.\n\n`getByTestId` works but couples the test to an attribute that exists only for testing, so it verifies nothing about what users experience. `container.querySelector(\".btn-primary\")` breaks on any CSS refactor.\n\nThe priority order is role → label → text → test id, with test id as a genuine last resort.",
          c: ["testing"],
          d: 2,
          choices: [
            { t: '`getByRole("button", { name: /submit/i })`', ok: true, why: "Correct — matches how users and assistive tech perceive it." },
            { t: '`getByTestId("submit-btn")`', why: "Works, but tests an attribute users never encounter." },
            { t: '`container.querySelector(".btn-primary")`', why: "Couples the test to styling." },
            { t: "`wrapper.find('Button')` by component name", why: "Enzyme-style; tests structure rather than behaviour." },
          ],
        }),
        mcq("test-react-findby", {
          q: "A list renders after a fetch resolves. Which query?",
          why: "`findByText` (or `findByRole`) — it returns a promise and **retries** until the element appears or a timeout expires, which is exactly what you need for content that arrives after an async state update.\n\n`getByText` throws immediately, because at first render the data has not arrived. `queryByText` returns `null` — correct for asserting something is *absent*, useless for waiting.\n\nRemember to `await`:\n\n```js\nexpect(await screen.findByText(\"Ada\")).toBeInTheDocument();\n```\n\nAnd if you see an `act(...)` warning, it usually means a state update happened outside what the test awaited — the fix is to await the right query rather than wrapping things in `act` manually.",
          c: ["testing", "server-state"],
          d: 2,
          choices: [
            { t: "`await screen.findByText(...)` — it retries until it appears", ok: true, why: "Correct for async content." },
            { t: "`getByText` — it waits automatically", why: "It throws immediately if not present." },
            { t: "`queryByText` — it returns null until it appears", why: "It does not retry; it is for asserting absence." },
            { t: "`getByText` inside `setTimeout`", why: "Fragile and slow — that is what `findBy` replaces." },
          ],
        }),
        multi("test-react-what", {
          q: "Which are appropriate things to assert in a React component test?",
          why: "Assert what the **user can observe**: the rendered output for given props, what happens after an interaction, that the loading/error/empty states render correctly, and that a callback prop fired with the expected arguments (that is part of the component's contract with its parent).\n\nDo not assert on internal state values or that a specific hook ran — those are implementation details that change under refactoring while the behaviour is identical. Exact CSS class names are similarly brittle; assert on visible text or an accessible role instead.",
          c: ["testing", "component-design"],
          d: 2,
          choices: [
            { t: "What renders for a given set of props", ok: true },
            { t: "What happens after a click or typing", ok: true },
            { t: "That loading, error and empty states render correctly", ok: true },
            { t: "That a callback prop was called with the right arguments", ok: true },
            { t: "The value of a `useState` variable", why: "Internal detail — assert the rendered result instead." },
            { t: "That the component has the class `btn-primary`", why: "Breaks on any styling change." },
          ],
        }),
        short("test-react-strategy", {
          q: "*\"You're adding a new feature to a CRUD app. What do you test, and at what level?\"*",
          why: "A practical judgement question. The best answers are proportional — not 'test everything', and not 'the happy path is fine'.",
          model:
            "I'd think about it in layers rather than trying to test everything everywhere.\n\nThe business logic — pricing rules, validation, whatever the feature actually decides — goes in unit tests. They're fast, they cover the edge cases cheaply, and when one fails I know exactly which function is wrong. This is where I'd put the bulk of the cases.\n\nThe API endpoint gets an integration test against a real test database. That's where the things unit tests structurally can't catch live: wrong status codes, serialisation problems, a query that works in isolation but not against real schema constraints, and whether the authorisation check is actually wired up. I'd specifically test that another user *can't* access the resource, because that's the check that gets forgotten.\n\nOn the front end, a component test for the interactive parts using Testing Library — including the loading, error and empty states, since those are the ones that ship broken most often. I'd query by role rather than test id so the test also exercises accessibility.\n\nThen one end-to-end test for the critical path only — the journey that would be a genuine incident if it broke. Not every variation, because that's where suites become slow and flaky.\n\nAnd I'd keep it proportional to risk. A payment flow gets thorough coverage; an internal admin screen used by three people doesn't need the same investment.",
          points: [
            "Business logic → unit tests, where the edge cases are cheap",
            "Endpoint → integration test with a real test database",
            "Explicitly test the authorisation denial case",
            "Component tests for interaction plus loading/error/empty states",
            "One E2E for the critical journey only",
            "Scale the investment to the risk",
          ],
          c: ["testing", "mocking"],
          d: 3,
          secs: 180,
        }),
      ],
    }),
  ],
});
