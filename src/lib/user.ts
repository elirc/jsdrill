/**
 * Reps is single-user today: every row belongs to this id. It lives in
 * one module so the day accounts arrive there is exactly one thing to
 * replace (with a session lookup), not a string scattered across routes.
 */
export const DEFAULT_USER_ID = "default-user";
