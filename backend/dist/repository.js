"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventRepository = void 0;
exports.createDatabase = createDatabase;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
class EventRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    getAnonymousIds() { return this.db.prepare('SELECT DISTINCT anonymous_id AS anonymousId FROM events ORDER BY anonymous_id').all().map((row) => row.anonymousId); }
    countEvents(anonymousId, eventType, startExclusive, endInclusive) {
        const row = this.db.prepare('SELECT COUNT(*) AS count FROM events WHERE anonymous_id = ? AND event_type = ? AND occurred_at > ? AND occurred_at <= ?').get(anonymousId, eventType, startExclusive, endInclusive);
        return row.count;
    }
}
exports.EventRepository = EventRepository;
function createDatabase(path) {
    const db = new better_sqlite3_1.default(path);
    db.pragma('journal_mode = WAL');
    db.exec(`CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, anonymous_id TEXT NOT NULL, event_type TEXT NOT NULL, occurred_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS idx_events_type_time_user ON events(event_type, occurred_at, anonymous_id); CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
    const seeded = db.prepare('SELECT value FROM metadata WHERE key = ?').get('demo_seed_version');
    if (!seeded) {
        const events = [
            [1, 'anon_001', 'product_view', '2026-09-25T10:00:00.000Z'], [2, 'anon_001', 'product_view', '2026-09-27T10:00:00.000Z'], [3, 'anon_001', 'product_view', '2026-09-28T10:00:00.000Z'],
            [4, 'anon_002', 'product_view', '2026-09-28T10:00:00.000Z'],
            [5, 'anon_003', 'product_view', '2026-09-26T10:00:00.000Z'], [6, 'anon_003', 'product_view', '2026-09-27T10:00:00.000Z'], [7, 'anon_003', 'purchase', '2026-09-28T12:00:00.000Z'],
            [8, 'anon_004', 'product_view', '2026-09-10T10:00:00.000Z'], [9, 'anon_004', 'product_view', '2026-09-11T10:00:00.000Z'], [10, 'anon_004', 'product_view', '2026-09-12T10:00:00.000Z'],
            [11, 'anon_005', 'product_view', '2026-09-22T00:00:00.000Z'],
        ];
        const insert = db.prepare('INSERT OR IGNORE INTO events (id, anonymous_id, event_type, occurred_at) VALUES (?, ?, ?, ?)');
        const transaction = db.transaction(() => { for (const event of events)
            insert.run(...event); db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)').run('demo_seed_version', '1'); });
        transaction();
    }
    return db;
}
