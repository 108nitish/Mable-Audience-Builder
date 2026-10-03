import Database from "better-sqlite3";
import { EventRecord, EventType } from "./types";

export class EventRepository {
  constructor(private readonly db: Database.Database) {}
  getAnonymousIds(): string[] {
    return (
      this.db
        .prepare(
          "SELECT DISTINCT anonymous_id AS anonymousId FROM events ORDER BY anonymous_id",
        )
        .all() as { anonymousId: string }[]
    ).map((row) => row.anonymousId);
  }
  countEvents(
    anonymousId: string,
    eventType: EventType,
    startExclusive: string,
    endInclusive: string,
  ): number {
    const row = this.db
      .prepare(
        "SELECT COUNT(*) AS count FROM events WHERE anonymous_id = ? AND event_type = ? AND occurred_at > ? AND occurred_at <= ?",
      )
      .get(anonymousId, eventType, startExclusive, endInclusive) as {
      count: number;
    };
    return row.count;
  }
}

export function createDatabase(path: string): Database.Database {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(
    `CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, anonymous_id TEXT NOT NULL, event_type TEXT NOT NULL, occurred_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS idx_events_type_time_user ON events(event_type, occurred_at, anonymous_id); CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);`,
  );
  const seeded = db
    .prepare("SELECT value FROM metadata WHERE key = ?")
    .get("demo_seed_version");
  if (!seeded) {
    const events = [
      [1, "anon_001", "product_view", "2026-09-25T10:00:00.000Z"],
      [2, "anon_001", "product_view", "2026-09-27T10:00:00.000Z"],
      [3, "anon_001", "product_view", "2026-09-28T10:00:00.000Z"],
      [4, "anon_002", "product_view", "2026-09-28T10:00:00.000Z"],
      [5, "anon_003", "product_view", "2026-09-26T10:00:00.000Z"],
      [6, "anon_003", "product_view", "2026-09-27T10:00:00.000Z"],
      [7, "anon_003", "purchase", "2026-09-28T12:00:00.000Z"],
      [8, "anon_004", "product_view", "2026-09-10T10:00:00.000Z"],
      [9, "anon_004", "product_view", "2026-09-11T10:00:00.000Z"],
      [10, "anon_004", "product_view", "2026-09-12T10:00:00.000Z"],
      [11, "anon_005", "product_view", "2026-09-22T00:00:00.000Z"],
    ] as [number, string, EventType, string][];
    const insert = db.prepare(
      "INSERT OR IGNORE INTO events (id, anonymous_id, event_type, occurred_at) VALUES (?, ?, ?, ?)",
    );
    const transaction = db.transaction(() => {
      for (const event of events) insert.run(...event);
      db.prepare("INSERT INTO metadata (key, value) VALUES (?, ?)").run(
        "demo_seed_version",
        "1",
      );
    });
    transaction();
  }
  return db;
}
