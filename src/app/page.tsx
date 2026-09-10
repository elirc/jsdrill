import Link from "next/link";
import { TRACKS, contentStats } from "@/content";
import { LEVEL_META, LEVELS } from "@/types";

export default function Home() {
  const stats = contentStats();

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Nav ─── */}
      <nav className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="h-7 w-7 rounded-lg flex items-center justify-center text-[13px] font-bold"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              R
            </span>
            <span className="font-semibold text-[15px]" style={{ color: "var(--text)" }}>
              Reps
            </span>
          </div>
          <Link
            href="/app"
            className="px-4 py-1.5 rounded-lg text-[13.5px] font-medium"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Open the app
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <main className="flex-1">
        <section className="max-w-3xl mx-auto px-4 pt-20 pb-16 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] mb-6"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            Beginner → mid-level, one rep at a time
          </div>

          <h1
            className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]"
            style={{ color: "var(--text)" }}
          >
            The interview questions
            <br />
            you&apos;ll actually be asked
          </h1>

          <p
            className="text-[16px] mt-6 max-w-xl mx-auto leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            Not algorithm puzzles. The real stuff: why your effect loops forever, what a scoped
            service does inside a singleton, which status code that endpoint should return, and how
            you&apos;d find an N+1 query. Spaced repetition makes it stick.
          </p>

          <div className="flex items-center justify-center gap-3 mt-9">
            <Link
              href="/app"
              className="px-6 py-3 rounded-lg font-medium text-[15px]"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Start drilling →
            </Link>
            <Link
              href="/app/path"
              className="px-6 py-3 rounded-lg font-medium text-[15px] border"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border-strong)",
                color: "var(--text)",
              }}
            >
              See the roadmap
            </Link>
          </div>

          <div
            className="flex items-center justify-center gap-6 mt-10 text-[13px]"
            style={{ color: "var(--text-faint)" }}
          >
            <span>
              <strong style={{ color: "var(--text)" }}>{stats.items}</strong> questions
            </span>
            <span>
              <strong style={{ color: "var(--text)" }}>{stats.modules}</strong> modules
            </span>
            <span>
              <strong style={{ color: "var(--text)" }}>{stats.tracks}</strong> tracks
            </span>
          </div>
        </section>

        {/* ─── Tracks ─── */}
        <section
          className="border-y py-14"
          style={{ borderColor: "var(--border)", background: "var(--bg-raised)" }}
        >
          <div className="max-w-5xl mx-auto px-4">
            <h2
              className="text-center text-[13px] uppercase tracking-wider mb-8"
              style={{ color: "var(--text-faint)" }}
            >
              The stack you&apos;re hired for
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {TRACKS.map((track) => (
                <Link key={track.slug} href={`/app/path/${track.slug}`}>
                  <div
                    className="rounded-xl border p-4 h-full transition-transform hover:-translate-y-0.5"
                    style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                  >
                    <span
                      className="inline-flex h-8 w-8 rounded-lg items-center justify-center text-[12px] font-bold mb-2.5"
                      style={{
                        background: `color-mix(in srgb, ${track.color} 16%, transparent)`,
                        color: track.color,
                      }}
                    >
                      {track.icon}
                    </span>
                    <div className="text-[13.5px] font-medium" style={{ color: "var(--text)" }}>
                      {track.name}
                    </div>
                    <div
                      className="text-[11.5px] mt-1 leading-snug"
                      style={{ color: "var(--text-faint)" }}
                    >
                      {track.tagline}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Levels ─── */}
        <section className="max-w-5xl mx-auto px-4 py-16">
          <h2
            className="text-2xl font-semibold tracking-tight text-center"
            style={{ color: "var(--text)" }}
          >
            Four levels, ten tracks
          </h2>
          <p
            className="text-[14.5px] mt-3 text-center max-w-lg mx-auto"
            style={{ color: "var(--text-muted)" }}
          >
            Levels unlock as you demonstrate retention — not as you click through.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-10">
            {LEVELS.map((level) => (
              <div
                key={level}
                className="rounded-xl border p-5"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div
                  className="text-[11px] font-bold px-1.5 py-0.5 rounded w-fit"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  {LEVEL_META[level].short}
                </div>
                <div className="text-[15px] font-medium mt-3" style={{ color: "var(--text)" }}>
                  {LEVEL_META[level].name}
                </div>
                <p
                  className="text-[13px] mt-2 leading-relaxed"
                  style={{ color: "var(--text-muted)" }}
                >
                  {LEVEL_META[level].blurb}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── How it works ─── */}
        <section
          className="border-t py-16"
          style={{ borderColor: "var(--border)", background: "var(--bg-raised)" }}
        >
          <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
            <Feature
              title="Eight question types"
              body="Multiple choice, select-all, predict-the-output, fill-the-blank, ordering, true/false, write-the-code, and explain-it-out-loud. Recognition and recall are different skills — an interview tests both."
            />
            <Feature
              title="Spaced repetition"
              body="FSRS schedules each question for the moment you're about to forget it. Get one wrong and it comes back tomorrow; get it right repeatedly and it drifts months out."
            />
            <Feature
              title="Every answer teaches"
              body="No question just says 'wrong'. Each one explains the mechanism, why the distractors are tempting, and what an interviewer is listening for."
            />
          </div>
        </section>
      </main>

      <footer className="border-t py-8" style={{ borderColor: "var(--border)" }}>
        <div
          className="max-w-5xl mx-auto px-4 text-center text-[12.5px]"
          style={{ color: "var(--text-faint)" }}
        >
          Reps — a local-first study tool. Your progress stays on your machine.
        </div>
      </footer>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-[15px] font-medium" style={{ color: "var(--text)" }}>
        {title}
      </h3>
      <p className="text-[13.5px] mt-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {body}
      </p>
    </div>
  );
}
