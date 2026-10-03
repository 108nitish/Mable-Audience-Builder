import { FormEvent, useState, useCallback } from "react";
import {
  Sparkles,
  ChevronRight,
  Plus,
  Trash2,
  Users,
  Check,
  RotateCcw,
  ShieldCheck,
  Layers,
  Copy,
  CheckCheck,
  Calendar,
  Clock,
  ArrowRight,
  SearchX,
  AlertCircle,
  Info,
  Filter,
} from "lucide-react";
import {
  AudienceDefinition,
  AudienceResult,
  Condition,
  EventType,
  Operator,
  previewAudience,
  AudienceApiError,
  ApiErrorDetail,
} from "./api/audienceApi";
import "./styles.css";

const EVENT_OPTIONS: { value: EventType; label: string; description: string }[] = [
  { value: "product_view", label: "Product view", description: "User viewed a product detail page" },
  { value: "purchase", label: "Purchase", description: "User completed a transaction" },
  { value: "add_to_cart", label: "Add to cart", description: "User added an item to cart" },
  { value: "checkout_started", label: "Checkout started", description: "User initiated checkout" },
  { value: "page_view", label: "Page view", description: "User visited any store page" },
];

const OPERATOR_OPTIONS: { value: Operator; label: string; symbol: string }[] = [
  { value: "at_least", label: "At least", symbol: "≥" },
  { value: "exactly", label: "Exactly", symbol: "=" },
];

const PRESETS: { name: string; description: string; definition: AudienceDefinition }[] = [
  {
    name: "Viewed but not purchased (7d)",
    description: "Matches anon_001 (Default demo target)",
    definition: {
      name: "Viewed but not purchased",
      asOf: "2026-09-29T00:00:00.000Z",
      conditions: [
        { eventType: "product_view", operator: "at_least", count: 2, withinDays: 7 },
        { eventType: "purchase", operator: "exactly", count: 0, withinDays: 7 },
      ],
    },
  },
  {
    name: "Recent purchasers (7d)",
    description: "Matches anon_003 who purchased on Sep 28",
    definition: {
      name: "Recent purchasers",
      asOf: "2026-09-29T00:00:00.000Z",
      conditions: [
        { eventType: "purchase", operator: "at_least", count: 1, withinDays: 7 },
      ],
    },
  },
  {
    name: "Historical window test (30d)",
    description: "Captures anon_004 with events from Sep 10-12",
    definition: {
      name: "30-day product explorers",
      asOf: "2026-09-29T00:00:00.000Z",
      conditions: [
        { eventType: "product_view", operator: "at_least", count: 2, withinDays: 30 },
      ],
    },
  },
  {
    name: "Strict zero matches test",
    description: "Demonstrates empty state (no users match)",
    definition: {
      name: "High frequency purchasers",
      asOf: "2026-09-29T00:00:00.000Z",
      conditions: [
        { eventType: "purchase", operator: "at_least", count: 5, withinDays: 7 },
      ],
    },
  },
];

function formatUtcDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return dateStr;
  }
}

function calculateWindow(asOfStr: string, withinDays: number): { start: string; end: string } {
  try {
    const end = new Date(asOfStr);
    const start = new Date(end.getTime() - withinDays * 24 * 60 * 60 * 1000);
    const opts: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      hour12: false,
    };
    return {
      start: `${start.toLocaleDateString("en-US", opts)} UTC`,
      end: `${end.toLocaleDateString("en-US", opts)} UTC`,
    };
  } catch {
    return { start: "Window start", end: "asOf" };
  }
}

export default function App() {
  const [definition, setDefinition] = useState<AudienceDefinition>(() => ({
    ...PRESETS[0].definition,
    conditions: PRESETS[0].definition.conditions.map((c) => ({ ...c })),
  }));

  const [result, setResult] = useState<AudienceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorDetail[]>([]);
  const [formError, setFormError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const updateCondition = (index: number, patch: Partial<Condition>) => {
    setDefinition((curr) => ({
      ...curr,
      conditions: curr.conditions.map((cond, i) => (i === index ? { ...cond, ...patch } : cond)),
    }));
  };

  const addCondition = () => {
    setDefinition((curr) => ({
      ...curr,
      conditions: [
        ...curr.conditions,
        { eventType: "product_view", operator: "at_least", count: 1, withinDays: 7 },
      ],
    }));
  };

  const removeCondition = (index: number) => {
    if (definition.conditions.length <= 1) return;
    setDefinition((curr) => ({
      ...curr,
      conditions: curr.conditions.filter((_, i) => i !== index),
    }));
  };

  const loadPreset = (preset: (typeof PRESETS)[number]) => {
    setDefinition({
      ...preset.definition,
      conditions: preset.definition.conditions.map((c) => ({ ...c })),
    });
    setFormError("");
    setError(null);
    setErrorDetails([]);
  };

  const copyToClipboard = useCallback((text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedId(text);
        setTimeout(() => setCopiedId(null), 1800);
      });
    }
  }, []);

  const handleFormSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();

    const trimmedName = definition.name.trim();
    if (!trimmedName) {
      setFormError("Audience name is required and cannot be empty.");
      return;
    }
    if (definition.conditions.length === 0) {
      setFormError("At least one condition is required to evaluate an audience.");
      return;
    }

    for (let i = 0; i < definition.conditions.length; i++) {
      const cond = definition.conditions[i];
      if (cond.count < 0 || !Number.isInteger(cond.count)) {
        setFormError(`Condition #${i + 1}: Count must be an integer 0 or greater.`);
        return;
      }
      if (cond.withinDays <= 0 || !Number.isInteger(cond.withinDays)) {
        setFormError(`Condition #${i + 1}: Lookback window must be an integer greater than 0 days.`);
        return;
      }
    }

    setFormError("");
    setError(null);
    setErrorDetails([]);
    setLoading(true);

    try {
      const evaluated = await previewAudience(definition);
      setResult(evaluated);
    } catch (err: unknown) {
      if (err instanceof AudienceApiError) {
        setError(err.message);
        setErrorDetails(err.details ?? []);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected network error occurred while communicating with the backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Sparkles size={16} strokeWidth={2.5} />
          </div>
          <span className="brand-title">Mable</span>
          <span className="brand-divider" aria-hidden="true" />
          <span className="product-title">Audience Builder</span>
        </div>

        <div className="topbar-actions">
          <div className="env-badge" title="Deterministic SQLite synthetic dataset">
            <span className="status-dot" aria-hidden="true" />
            <span className="env-text">Demo Environment · Synthetic SQLite</span>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="main-content">
        {/* Page Hero */}
        <section className="hero-section">
          <div className="hero-text">
            <div className="hero-eyebrow">
              <span className="badge-tag">ENGINEERING EVALUATION</span>
              <span>BEHAVIORAL ENGINE</span>
            </div>
            <h1>Define and preview audiences</h1>
            <p className="hero-lede">
              Compose deterministic behavioral rules evaluated against synthetic anonymous customer events.
              Backend-owned evaluation with reproducible time windows.
            </p>
          </div>

          <div className="info-callout">
            <Info size={16} className="callout-icon" />
            <div className="callout-content">
              <strong>Evaluation Anchor: <code>{definition.asOf}</code></strong>
              <p>
                Calculations use half-open intervals <code>(asOf - withinDays, asOf]</code>.
                The server clock is never consulted.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Presets Carousel / Buttons */}
        <section className="presets-bar" aria-label="Pre-configured test audiences">
          <span className="presets-label">
            <Filter size={13} /> Quick Presets:
          </span>
          <div className="presets-list">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className={`preset-chip ${definition.name === preset.definition.name ? "active" : ""}`}
                onClick={() => loadPreset(preset)}
                title={preset.description}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </section>

        {/* Audience Definition Builder Card */}
        <form onSubmit={handleFormSubmit} className="builder-card" noValidate>
          <div className="card-header">
            <div>
              <div className="step-tag">STEP 01</div>
              <h2 className="card-title">Audience definition</h2>
              <p className="card-subtitle">
                Configure your target parameters and behavioral qualification criteria.
              </p>
            </div>
            <div className="rule-counter">
              <Layers size={14} />
              <span>{definition.conditions.length} {definition.conditions.length === 1 ? "rule" : "rules"}</span>
            </div>
          </div>

          {/* Audience Name Field */}
          <div className="field-group">
            <div className="field-label-row">
              <label htmlFor="audience-name" className="field-label">
                Audience name <span className="required-star">*</span>
              </label>
              <span className="char-count">{definition.name.length} / 120</span>
            </div>
            <input
              id="audience-name"
              type="text"
              className={`text-input ${formError && !definition.name.trim() ? "input-error" : ""}`}
              placeholder="e.g., Viewed but not purchased"
              value={definition.name}
              maxLength={120}
              onChange={(e) => setDefinition({ ...definition, name: e.target.value })}
            />
            <p className="field-hint">A clear identifier for the audience segment preview.</p>
          </div>

          {/* Form-level validation error */}
          {formError && (
            <div className="validation-alert" role="alert">
              <AlertCircle size={15} />
              <span>{formError}</span>
            </div>
          )}

          {/* Conditions Section */}
          <div className="conditions-section">
            <div className="conditions-header">
              <div>
                <h3 className="section-title">Behavioral Conditions</h3>
                <p className="section-hint">
                  <strong>Strict AND semantics</strong> — Every condition must pass for an anonymous user to be included.
                </p>
              </div>
              <button
                type="button"
                className="secondary-btn add-rule-btn"
                onClick={addCondition}
              >
                <Plus size={15} /> Add condition
              </button>
            </div>

            {/* List of Condition Cards with AND Connectors */}
            <div className="conditions-list">
              {definition.conditions.map((cond, index) => {
                const windowTimes = calculateWindow(definition.asOf, cond.withinDays);
                const isOnlyCondition = definition.conditions.length <= 1;

                return (
                  <div key={index} className="condition-item">
                    {/* Visual AND connector between condition cards */}
                    {index > 0 && (
                      <div className="and-connector" aria-hidden="true">
                        <span className="connector-line" />
                        <span className="and-pill">AND</span>
                        <span className="connector-line" />
                      </div>
                    )}

                    <div className="condition-card">
                      <div className="condition-card-header">
                        <div className="condition-card-title">
                          <span className="condition-index-badge">#{index + 1}</span>
                          <span className="condition-summary-text">
                            <strong>{EVENT_OPTIONS.find((e) => e.value === cond.eventType)?.label}</strong>
                            {" is "}
                            <code>{cond.operator === "at_least" ? "≥" : "="} {cond.count}</code>
                            {" in previous "}
                            <code>{cond.withinDays} days</code>
                          </span>
                        </div>

                        <button
                          type="button"
                          className="icon-btn delete-btn"
                          aria-label={`Remove condition ${index + 1}`}
                          disabled={isOnlyCondition}
                          title={isOnlyCondition ? "At least one condition is required" : "Delete condition"}
                          onClick={() => removeCondition(index)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Controls Grid */}
                      <div className="condition-inputs-grid">
                        {/* Event Selector */}
                        <div className="input-control">
                          <label htmlFor={`cond-${index}-event`} className="control-label">
                            Event type
                          </label>
                          <select
                            id={`cond-${index}-event`}
                            className="select-input"
                            value={cond.eventType}
                            onChange={(e) => updateCondition(index, { eventType: e.target.value as EventType })}
                          >
                            {EVENT_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label} ({opt.value})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Operator Selector */}
                        <div className="input-control">
                          <label htmlFor={`cond-${index}-operator`} className="control-label">
                            Operator
                          </label>
                          <select
                            id={`cond-${index}-operator`}
                            className="select-input"
                            value={cond.operator}
                            onChange={(e) => updateCondition(index, { operator: e.target.value as Operator })}
                          >
                            {OPERATOR_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label} ({opt.symbol})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Count Input */}
                        <div className="input-control">
                          <label htmlFor={`cond-${index}-count`} className="control-label">
                            Threshold count
                          </label>
                          <input
                            id={`cond-${index}-count`}
                            type="number"
                            min="0"
                            step="1"
                            className="number-input"
                            value={cond.count}
                            onChange={(e) => updateCondition(index, { count: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                          />
                        </div>

                        {/* Within Days Input */}
                        <div className="input-control">
                          <label htmlFor={`cond-${index}-window`} className="control-label">
                            Lookback window
                          </label>
                          <div className="unit-input-wrapper">
                            <input
                              id={`cond-${index}-window`}
                              type="number"
                              min="1"
                              step="1"
                              className="number-input with-unit"
                              value={cond.withinDays}
                              onChange={(e) => updateCondition(index, { withinDays: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            />
                            <span className="unit-label">days</span>
                          </div>
                        </div>
                      </div>

                      {/* Window Time Interval Display */}
                      <div className="condition-window-bar">
                        <Clock size={12} className="window-icon" />
                        <span className="window-text">
                          Evaluated window: <strong>({windowTimes.start}</strong> to <strong>{windowTimes.end}]</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="form-action-bar">
            <div className="form-guarantee">
              <ShieldCheck size={16} className="guarantee-icon" />
              <span>Zero PII. Operates strictly over anonymous synthetic IDs.</span>
            </div>

            <div className="action-buttons-group">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => loadPreset(PRESETS[0])}
                disabled={loading}
              >
                Reset to default
              </button>
              <button
                type="submit"
                className="primary-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    <span>Evaluating audience…</span>
                  </>
                ) : (
                  <>
                    <span>Preview audience</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Results Section */}
        <section className="results-section" aria-live="polite">
          <div className="results-header">
            <div>
              <div className="step-tag">STEP 02</div>
              <h2 className="section-title">Audience preview results</h2>
            </div>

            {result && !loading && (
              <div className="result-metric-badge">
                <span className="metric-number">{result.total}</span>
                <span className="metric-label">{result.total === 1 ? "user matched" : "users matched"}</span>
              </div>
            )}
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="results-card loading-skeleton-card" aria-label="Evaluating audience">
              <div className="skeleton-bar title-skeleton" />
              <div className="skeleton-member-card">
                <div className="skeleton-avatar" />
                <div className="skeleton-text-group">
                  <div className="skeleton-bar id-skeleton" />
                  <div className="skeleton-bar pill-skeleton" />
                </div>
              </div>
              <div className="skeleton-member-card">
                <div className="skeleton-avatar" />
                <div className="skeleton-text-group">
                  <div className="skeleton-bar id-skeleton" />
                  <div className="skeleton-bar pill-skeleton" />
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="state-card error-card" role="alert">
              <div className="state-card-icon error-icon-bg">
                <AlertCircle size={22} />
              </div>
              <div className="state-card-body">
                <h3>Evaluation request failed</h3>
                <p className="error-primary-message">{error}</p>
                {errorDetails.length > 0 && (
                  <ul className="error-details-list">
                    {errorDetails.map((detail, idx) => (
                      <li key={idx}>
                        <code>{detail.field}</code>: {detail.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="state-card-action">
                <button
                  type="button"
                  className="secondary-btn retry-btn"
                  onClick={() => handleFormSubmit()}
                >
                  <RotateCcw size={15} /> Try again
                </button>
              </div>
            </div>
          )}

          {/* Initial Idle State */}
          {!loading && !error && !result && (
            <div className="state-card idle-card">
              <div className="state-card-icon idle-icon-bg">
                <Users size={22} />
              </div>
              <div className="state-card-body">
                <h3>Audience ready to preview</h3>
                <p>
                  Click <strong>&quot;Preview audience&quot;</strong> above to execute the evaluation logic against the SQLite event store.
                </p>
              </div>
            </div>
          )}

          {/* Zero Results / Empty State */}
          {!loading && !error && result && result.total === 0 && (
            <div className="state-card empty-card">
              <div className="state-card-icon empty-icon-bg">
                <SearchX size={22} />
              </div>
              <div className="state-card-body">
                <h3>No matching users found</h3>
                <p>
                  No anonymous profiles in the synthetic dataset met all {definition.conditions.length} conditions within the specified lookback windows.
                </p>
                <p className="empty-suggestion">
                  Try relaxing operator thresholds (e.g. lowering counts) or extending the time window.
                </p>
              </div>
            </div>
          )}

          {/* Populated Match Results */}
          {!loading && !error && result && result.total > 0 && (
            <div className="results-card">
              {/* Meta Header */}
              <div className="results-meta-bar">
                <div className="meta-left">
                  <span className="meta-heading">Matching Anonymous Profiles</span>
                  <span className="meta-sub">
                    Showing <strong>{result.members.length}</strong> qualified {result.members.length === 1 ? "member" : "members"}
                  </span>
                </div>
                <div className="meta-right">
                  <Calendar size={13} />
                  <span>Anchor Date: {formatUtcDate(result.asOf)}</span>
                </div>
              </div>

              {/* Members List */}
              <div className="members-grid">
                {result.members.map((member) => (
                  <div key={member.anonymousId} className="member-card">
                    {/* Member Header */}
                    <div className="member-header">
                      <div className="member-identity">
                        <div className="member-avatar" aria-hidden="true">
                          {member.anonymousId.replace("anon_", "")}
                        </div>
                        <div className="member-id-wrapper">
                          <span className="member-id-text">{member.anonymousId}</span>
                          <button
                            type="button"
                            className="copy-btn"
                            title="Copy Anonymous ID"
                            aria-label={`Copy ID ${member.anonymousId}`}
                            onClick={() => copyToClipboard(member.anonymousId)}
                          >
                            {copiedId === member.anonymousId ? (
                              <CheckCheck size={13} className="copied-icon" />
                            ) : (
                              <Copy size={13} />
                            )}
                            <span className="copy-label">
                              {copiedId === member.anonymousId ? "Copied" : "Copy"}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="qualification-badge">
                        <Check size={13} />
                        <span>All rules passed</span>
                      </div>
                    </div>

                    {/* Member Evidence Table / Details */}
                    <div className="evidence-section">
                      <div className="evidence-title">EVALUATION EVIDENCE</div>
                      <div className="evidence-cards-container">
                        {member.evidence.map((ev, i) => {
                          const eventObj = EVENT_OPTIONS.find((e) => e.value === ev.eventType);
                          const sym = ev.operator === "at_least" ? "≥" : "=";
                          const passed =
                            ev.operator === "at_least"
                              ? ev.observedCount >= ev.requestedCount
                              : ev.observedCount === ev.requestedCount;

                          return (
                            <div key={i} className="evidence-row-card">
                              <div className="evidence-event-col">
                                <span className="evidence-event-name">
                                  {eventObj?.label ?? ev.eventType}
                                </span>
                                <span className="evidence-event-slug">{ev.eventType}</span>
                              </div>

                              <div className="evidence-stats-col">
                                <div className="stat-item">
                                  <span className="stat-label">Requirement</span>
                                  <span className="stat-val">{sym} {ev.requestedCount}</span>
                                </div>
                                <div className="stat-item highlight">
                                  <span className="stat-label">Observed in Window</span>
                                  <span className="stat-val observed">{ev.observedCount}</span>
                                </div>
                              </div>

                              <div className="evidence-status-col">
                                <span className={`status-pill ${passed ? "pass" : "fail"}`}>
                                  <Check size={12} />
                                  <span>{passed ? "Pass" : "Fail"}</span>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-left">
            <span className="footer-brand">Mable Audience Builder</span>
            <span className="footer-sep">·</span>
            <span>Deterministic Customer Segmentation</span>
          </div>
          <div className="footer-right">
            <span>Architecture: Browser → Nginx (/api) → Express API → SQLite</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
