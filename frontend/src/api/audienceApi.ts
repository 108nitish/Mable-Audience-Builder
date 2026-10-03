export type EventType = 'page_view' | 'product_view' | 'add_to_cart' | 'checkout_started' | 'purchase'
export type Operator = 'at_least' | 'exactly'
export type Condition = { eventType: EventType; operator: Operator; count: number; withinDays: number }
export type AudienceDefinition = { name: string; asOf: string; conditions: Condition[] }
export type Evidence = { eventType: EventType; observedCount: number; operator: Operator; requestedCount: number }
export type AudienceResult = { name: string; asOf: string; total: number; members: { anonymousId: string; evidence: Evidence[] }[] }
export async function previewAudience(definition: AudienceDefinition): Promise<AudienceResult> { const response = await fetch('/api/v1/audiences/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(definition) }); if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.error?.message ?? 'Unable to load the audience preview') }; return response.json() }
