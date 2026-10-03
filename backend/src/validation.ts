import { z } from "zod";
import { EVENT_TYPES, OPERATORS } from "./types";

export const audienceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  asOf: z.string().datetime({ offset: true }),
  conditions: z
    .array(
      z.object({
        eventType: z.enum(EVENT_TYPES),
        operator: z.enum(OPERATORS),
        count: z.number().int().min(0).max(100000),
        withinDays: z.number().int().min(1).max(3650),
      }),
    )
    .min(1)
    .max(20),
});
export type ValidationIssue = { field: string; message: string };
export function issuesFromZod(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "request",
    message: issue.message,
  }));
}
