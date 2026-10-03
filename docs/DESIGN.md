# Design notes

## Data model

SQLite stores only anonymous event facts: `events(id, anonymous_id, event_type, occurred_at)`. Event type is constrained at the request boundary to the five supported values. A small `metadata` table stores the demo seed version, keeping initialization idempotent without relying on row counts.

## Evaluation architecture

Express owns transport and error formatting. Zod validates input at the boundary. `evaluateAudience` accepts a plain audience definition and an `EventRepository`, so business behavior is testable without Express. The repository uses parameterized SQL and returns counts rather than raw events. Every condition must pass (`AND` semantics), and evidence records the observed count plus requested rule.

## Time semantics

Each condition is evaluated in the half-open-on-the-left interval `(asOf - withinDays, asOf]`. An event exactly at `asOf` is included; one exactly at the calculated start is excluded. `asOf` is required because previews should be reproducible and reviewable; the server clock is never consulted for membership.

## Database and indexing

SQLite is appropriate for this local, small-data assignment: durable persistence with no infrastructure overhead. The composite index `(event_type, occurred_at, anonymous_id)` matches the primary event filtering dimensions and leaves a clear path for larger datasets. For substantially higher volume, the repository could move to a managed analytical store or pre-aggregated daily counts without changing the evaluator contract.

## Product trade-offs

The evaluator scans known anonymous IDs and performs one count query per condition and member. That is intentionally readable and correct for the seeded dataset. At scale, counts could be pre-aggregated by anonymous ID, event type, and time bucket, or evaluation could become asynchronous with cached audience results. None of that complexity is justified here.
