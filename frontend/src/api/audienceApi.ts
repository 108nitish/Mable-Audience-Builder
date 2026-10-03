export type EventType =
  | "page_view"
  | "product_view"
  | "add_to_cart"
  | "checkout_started"
  | "purchase";
export type Operator = "at_least" | "exactly";
export type Condition = {
  eventType: EventType;
  operator: Operator;
  count: number;
  withinDays: number;
};
export type AudienceDefinition = {
  name: string;
  asOf: string;
  conditions: Condition[];
};
export type Evidence = {
  eventType: EventType;
  observedCount: number;
  operator: Operator;
  requestedCount: number;
};
export type AudienceResult = {
  name: string;
  asOf: string;
  total: number;
  members: { anonymousId: string; evidence: Evidence[] }[];
};
export interface ApiErrorDetail {
  field: string;
  message: string;
}

export class AudienceApiError extends Error {
  code: string;
  details?: ApiErrorDetail[];

  constructor(message: string, code = "API_ERROR", details?: ApiErrorDetail[]) {
    super(message);
    this.name = "AudienceApiError";
    this.code = code;
    this.details = details;
  }
}

export async function previewAudience(
  definition: AudienceDefinition,
): Promise<AudienceResult> {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env;
  const baseUrl = (env?.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/v1/audiences/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(definition),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const code = body?.error?.code ?? "API_ERROR";
    const message = body?.error?.message ?? `Request failed with status ${response.status}`;
    const details = body?.error?.details;
    throw new AudienceApiError(message, code, details);
  }
  return response.json();
}

