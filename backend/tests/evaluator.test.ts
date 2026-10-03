import { describe, expect, it, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { EventRepository } from "../src/repository";
import { evaluateAudience } from "../src/evaluator";
import { audienceSchema } from "../src/validation";

const definition = (conditions: unknown[]) => ({
  name: "Test",
  asOf: "2026-09-29T00:00:00.000Z",
  conditions,
});
const condition = (
  eventType: string,
  operator: string,
  count: number,
  withinDays = 7,
) => ({ eventType, operator, count, withinDays });
function repo(events: [string, string, string][]) {
  const db = new Database(":memory:");
  db.exec(
    "CREATE TABLE events (id INTEGER PRIMARY KEY, anonymous_id TEXT, event_type TEXT, occurred_at TEXT)",
  );
  const insert = db.prepare(
    "INSERT INTO events (anonymous_id,event_type,occurred_at) VALUES (?,?,?)",
  );
  events.forEach((event) => insert.run(...event));
  return new EventRepository(db);
}
const views = (count: number, id = "anon_001") =>
  Array.from(
    { length: count },
    (_, index) =>
      [
        id,
        "product_view",
        `2026-09-${String(22 + index).padStart(2, "0")}T00:00:00.000Z`,
      ] as [string, string, string],
  );

describe("audience evaluator", () => {
  it("handles at_least success and failure", () => {
    expect(
      evaluateAudience(
        definition([condition("product_view", "at_least", 2)]),
        repo(views(3)),
      ).total,
    ).toBe(1);
    expect(
      evaluateAudience(
        definition([condition("product_view", "at_least", 2)]),
        repo(views(1)),
      ).total,
    ).toBe(0);
  });
  it("handles exactly zero and failure", () => {
    expect(
      evaluateAudience(
        definition([condition("purchase", "exactly", 0)]),
        repo(views(2)),
      ).total,
    ).toBe(1);
    expect(
      evaluateAudience(
        definition([condition("purchase", "exactly", 0)]),
        repo([
          ...views(2),
          ["anon_001", "purchase", "2026-09-28T00:00:00.000Z"],
        ]),
      ).total,
    ).toBe(0);
  });
  it("uses AND semantics", () => {
    expect(
      evaluateAudience(
        definition([
          condition("product_view", "at_least", 2),
          condition("purchase", "exactly", 0),
        ]),
        repo([
          ...views(3),
          ["anon_001", "purchase", "2026-09-28T00:00:00.000Z"],
        ]),
      ).total,
    ).toBe(0);
  });
  it("ignores outside-window events and uses (start, asOf] boundary", () => {
    const result = evaluateAudience(
      definition([condition("product_view", "exactly", 1, 7)]),
      repo([
        ["anon_001", "product_view", "2026-09-22T00:00:00.001Z"],
        ["anon_002", "product_view", "2026-09-22T00:00:00.000Z"],
        ["anon_003", "product_view", "2026-09-21T23:59:59.999Z"],
      ]),
    );
    expect(result.members.map((member) => member.anonymousId)).toEqual([
      "anon_001",
    ]);
  });
  it("is reproducible", () => {
    const result = evaluateAudience(
      definition([condition("product_view", "at_least", 2)]),
      repo(views(3)),
    );
    expect(result).toEqual(
      evaluateAudience(
        definition([condition("product_view", "at_least", 2)]),
        repo(views(3)),
      ),
    );
  });
});

describe("request validation", () => {
  it.each([
    condition("unknown", "at_least", 1),
    condition("product_view", "never", 1),
    condition("product_view", "at_least", -1),
    condition("product_view", "at_least", 1, -1),
  ])("rejects invalid condition %j", (invalid) =>
    expect(audienceSchema.safeParse(definition([invalid])).success).toBe(false),
  );
  it("rejects malformed requests", () =>
    expect(audienceSchema.safeParse({}).success).toBe(false));
});
