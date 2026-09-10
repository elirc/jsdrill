import { sqliteTable, text, integer, real, primaryKey, index } from "drizzle-orm/sqlite-core";

// ─── Tracks (technologies: JavaScript, React, .NET, …) ───
export const tracks = sqliteTable("tracks", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default(""),
  color: text("color").notNull().default("#6366f1"),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ─── Modules (a teachable unit inside a track, at one level) ───
export const modules = sqliteTable(
  "modules",
  {
    id: text("id").primaryKey(),
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    level: integer("level").notNull().default(1),
    summary: text("summary").notNull().default(""),
    brief: text("brief").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("modules_track_idx").on(t.trackId, t.level, t.sortOrder)]
);

// ─── Concepts (cross-cutting tags: closures, DI, N+1, CORS, …) ───
export const concepts = sqliteTable("concepts", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  explanation: text("explanation").notNull().default(""),
});

// ─── Items (a single drill of any kind) ───
export const items = sqliteTable(
  "items",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    moduleId: text("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    level: integer("level").notNull().default(1),
    prompt: text("prompt").notNull(),
    code: text("code"),
    lang: text("lang"),
    payload: text("payload").notNull().default("{}"), // JSON, shape depends on kind
    explanation: text("explanation").notNull().default(""),
    interviewTip: text("interview_tip"),
    estSeconds: integer("est_seconds").notNull().default(45),
    difficulty: integer("difficulty").notNull().default(1),
    authorId: text("author_id"), // null = built-in curriculum
    isPublished: integer("is_published", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("items_module_idx").on(t.moduleId),
    index("items_track_level_idx").on(t.trackId, t.level),
  ]
);

// ─── Item ↔ Concept (many-to-many) ───
export const itemConcepts = sqliteTable(
  "item_concepts",
  {
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    conceptId: text("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.conceptId] })]
);

// ─── Users ───
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  /** Items per day. */
  dailyGoal: integer("daily_goal").notNull().default(20),
  streakCount: integer("streak_count").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveDate: text("last_active_date"),
  /** Free-text goal, e.g. "junior full-stack .NET + React". */
  targetRole: text("target_role").notNull().default(""),
  settings: text("settings").notNull().default("{}"), // JSON
  createdAt: text("created_at").notNull(),
});

// ─── Attempts ───
export const attempts = sqliteTable(
  "attempts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    /** The learner's submission, JSON-encoded `Response`. */
    response: text("response").notNull().default("{}"),
    correct: integer("correct", { mode: "boolean" }).notNull().default(false),
    score: real("score").notNull().default(0),
    timeSpent: integer("time_spent").notNull().default(0), // seconds
    /** "mixed" | "track" | "module" | "level" | "weak" | "interview" */
    mode: text("mode").notNull().default("mixed"),
    /** FSRS rating that resulted from this attempt. */
    rating: integer("rating").notNull().default(3),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("attempts_user_idx").on(t.userId, t.createdAt),
    index("attempts_item_idx").on(t.userId, t.itemId),
  ]
);

// ─── FSRS cards (one per user × item) ───
export const userCards = sqliteTable(
  "user_cards",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    stability: real("stability").notNull().default(0),
    difficulty: real("difficulty").notNull().default(0),
    due: text("due").notNull(),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    state: integer("state").notNull().default(0), // 0=New 1=Learning 2=Review 3=Relearning
    lastReview: text("last_review"),
    /** Running tallies so accuracy never needs a full attempts scan. */
    correctCount: integer("correct_count").notNull().default(0),
    totalCount: integer("total_count").notNull().default(0),
  },
  (t) => [
    index("cards_user_due_idx").on(t.userId, t.due),
    index("cards_user_item_idx").on(t.userId, t.itemId),
  ]
);

// ─── Per-track level progress ───
export const userTrackProgress = sqliteTable(
  "user_track_progress",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    trackId: text("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    currentLevel: integer("current_level").notNull().default(1),
    levelUnlockedAt: text("level_unlocked_at").notNull(),
    /** Set when the learner opts a track into their plan. */
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [index("track_progress_user_idx").on(t.userId, t.trackId)]
);

// ─── Bookmarks ("revisit before the interview") ───
export const bookmarks = sqliteTable(
  "bookmarks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    note: text("note").notNull().default(""),
    createdAt: text("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.itemId] })]
);

// ─── Interview mode runs ───
export const interviewRuns = sqliteTable("interview_runs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  /** JSON `InterviewScore`. */
  score: text("score").notNull().default("{}"),
  total: integer("total").notNull().default(0),
  correct: integer("correct").notNull().default(0),
  seconds: integer("seconds").notNull().default(0),
  createdAt: text("created_at").notNull(),
});
