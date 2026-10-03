import {
  AudienceDefinition,
  AudienceMember,
  AudienceResult,
  Evidence,
} from "./types";
import { EventRepository } from "./repository";

export function evaluateAudience(
  definition: AudienceDefinition,
  repository: EventRepository,
): AudienceResult {
  const end = new Date(definition.asOf);
  const members: AudienceMember[] = [];
  for (const anonymousId of repository.getAnonymousIds()) {
    const evidence: Evidence[] = [];
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
