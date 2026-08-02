/**
 * PostgreSQL and PostgREST error codes.
 * Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */

// ── PostgreSQL Standard Error Codes ──────────────────────────────────────────

/** Unique constraint violation (e.g., duplicate key on insert) */
export const PG_UNIQUE_VIOLATION = '23505';

/** Foreign key constraint violation */
export const PG_FOREIGN_KEY_VIOLATION = '23503';

/** Not-null constraint violation */
export const PG_NOT_NULL_VIOLATION = '23502';

/** Check constraint violation */
export const PG_CHECK_VIOLATION = '23514';

// ── PostgREST Error Codes ────────────────────────────────────────────────────
// Reference: https://postgrest.org/en/stable/references/errors.html

/** Expected exactly one row but got zero (e.g., .single() with no match) */
export const PGRST_NO_ROWS = 'PGRST116';

/** Expected at most one row but got multiple */
export const PGRST_MULTIPLE_ROWS = 'PGRST109';
