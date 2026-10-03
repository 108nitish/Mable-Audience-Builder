"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateAudience = evaluateAudience;
function evaluateAudience(definition, repository) {
  const end = new Date(definition.asOf);
  const members = [];
  for (const anonymousId of repository.getAnonymousIds()) {
    const evidence = [];
    const matches = definition.conditions.every((condition) => {
      const start = new Date(
        end.getTime() - condition.withinDays * 24 * 60 * 60 * 1000,
      );
      const observedCount = repository.countEvents(
        anonymousId,
        condition.eventType,
        start.toISOString(),
        end.toISOString(),
      );
      evidence.push({
        eventType: condition.eventType,
        observedCount,
        operator: condition.operator,
        requestedCount: condition.count,
      });
      return condition.operator === "at_least"
        ? observedCount >= condition.count
        : observedCount === condition.count;
    });
    if (matches) members.push({ anonymousId, evidence });
  }
  return {
    name: definition.name,
    asOf: definition.asOf,
    total: members.length,
    members,
  };
}
