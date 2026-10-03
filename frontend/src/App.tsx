import { FormEvent, useState } from "react";
import {
  Check,
  ChevronRight,
  CircleHelp,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import {
  AudienceDefinition,
  AudienceResult,
  Condition,
  EventType,
  Operator,
  previewAudience,
} from "./api/audienceApi";
import "./styles.css";

const eventLabels: Record<EventType, string> = {
  page_view: "Page view",
  product_view: "Product view",
  add_to_cart: "Add to cart",
  checkout_started: "Checkout started",
  purchase: "Purchase",
};
const initialConditions: Condition[] = [
  { eventType: "product_view", operator: "at_least", count: 2, withinDays: 7 },
  { eventType: "purchase", operator: "exactly", count: 0, withinDays: 7 },
];
const initialDefinition = (): AudienceDefinition => ({
  name: "Viewed but not purchased",
  asOf: "2026-09-29T00:00:00.000Z",
  conditions: initialConditions.map((condition) => ({ ...condition })),
});

function App() {
  const [definition, setDefinition] = useState(initialDefinition);
  const [result, setResult] = useState<AudienceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const updateCondition = (index: number, patch: Partial<Condition>) =>
    setDefinition((current) => ({
      ...current,
      conditions: current.conditions.map((condition, itemIndex) =>
        itemIndex === index ? { ...condition, ...patch } : condition,
      ),
    }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!definition.name.trim())
      return setFormError("Audience name is required.");
    if (!definition.conditions.length)
      return setFormError("At least one condition is required.");
    setFormError("");
    setError("");
    setLoading(true);
    try {
      setResult(await previewAudience(definition));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load the audience preview",
      );
    } finally {
      setLoading(false);
    }
  };
  const addCondition = () =>
    setDefinition((current) => ({
      ...current,
      conditions: [
        ...current.conditions,
        {
          eventType: "page_view",
          operator: "at_least",
          count: 1,
          withinDays: 7,
        },
      ],
    }));
  const removeCondition = (index: number) =>
    setDefinition((current) => ({
      ...current,
      conditions: current.conditions.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={16} />
          </div>
          <span>Mable</span>
          <span className="brand-divider" />
          <span className="product-name">Audience Builder</span>
        </div>
        <div className="environment">
          <span className="status-dot" /> Synthetic data{" "}
          <ChevronRight size={14} />
        </div>
      </header>
      <main className="main-content">
        <section className="intro">
          <div>
            <p className="eyebrow">Audience workspace</p>
            <h1>Build an audience</h1>
            <p className="lede">
              Define behavioral rules and preview the anonymous users that
              match.
            </p>
          </div>
          <div className="intro-note">
            <CircleHelp size={17} />
            <span>
              Rules use a fixed evaluation date for reliable previews.
            </span>
          </div>
        </section>
        <form onSubmit={submit} className="builder-card">
          <div className="card-heading">
            <div>
              <h2>Audience definition</h2>
              <p>Describe the behavior you want to find.</p>
            </div>
            <span className="step-label">01 / 02</span>
          </div>
          <label className="field-label" htmlFor="audience-name">
            Audience name
          </label>
          <input
            id="audience-name"
            className="text-input"
            value={definition.name}
            onChange={(event) =>
              setDefinition({ ...definition, name: event.target.value })
            }
            maxLength={120}
          />
          {formError && (
            <p className="inline-error" role="alert">
              {formError}
            </p>
          )}
          <div className="conditions-heading">
            <div>
              <h3>Conditions</h3>
              <p>Every condition must match.</p>
            </div>
            <button type="button" className="add-button" onClick={addCondition}>
              <Plus size={16} /> Add condition
            </button>
          </div>
          <div className="condition-list">
            {definition.conditions.map((condition, index) => (
              <div className="condition-row" key={index}>
                <div className="condition-index">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="condition-fields">
                  <label>
                    Event
                    <select
                      value={condition.eventType}
                      onChange={(event) =>
                        updateCondition(index, {
                          eventType: event.target.value as EventType,
                        })
                      }
                    >
                      {Object.entries(eventLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Operator
                    <select
                      value={condition.operator}
                      onChange={(event) =>
                        updateCondition(index, {
                          operator: event.target.value as Operator,
                        })
                      }
                    >
                      <option value="at_least">At least</option>
                      <option value="exactly">Exactly</option>
                    </select>
                  </label>
                  <label>
                    Count
                    <input
                      type="number"
                      min="0"
                      value={condition.count}
                      onChange={(event) =>
                        updateCondition(index, {
                          count: Math.max(0, Number(event.target.value)),
                        })
                      }
                    />
                  </label>
                  <label>
                    Within
                    <input
                      type="number"
                      min="0"
                      value={condition.withinDays}
                      onChange={(event) =>
                        updateCondition(index, {
                          withinDays: Math.max(0, Number(event.target.value)),
                        })
                      }
                    />
                    <span className="input-suffix">days</span>
                  </label>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove condition ${index + 1}`}
                  onClick={() => removeCondition(index)}
                  disabled={definition.conditions.length === 1}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
          <div className="form-footer">
            <p>
              <span className="footer-check">
                <Check size={13} />
              </span>{" "}
              Anonymous events only
            </p>
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Previewing…" : "Preview audience"}
              <ChevronRight size={17} />
            </button>
          </div>
        </form>
        <section className="results-section">
          <div className="results-heading">
            <div>
              <p className="eyebrow">Step 02 / Results</p>
              <h2>Audience preview</h2>
            </div>
            {result && (
              <div className="result-count">
                <strong>{result.total}</strong>
                <span>
                  {result.total === 1 ? "user matched" : "users matched"}
                </span>
              </div>
            )}
          </div>
          {error ? (
            <div className="state-card error-state" role="alert">
              <div className="state-icon">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3>Couldn&apos;t load the audience preview</h3>
                <p>{error}</p>
              </div>
              <button
                className="secondary-button"
                onClick={() => {
                  setError("");
                  void submit({ preventDefault: () => {} } as FormEvent);
                }}
              >
                Try again
              </button>
            </div>
          ) : !result ? (
            <div className="state-card empty-state">
              <div className="state-icon">
                <Users size={21} />
              </div>
              <div>
                <h3>Your preview will appear here</h3>
                <p>
                  Run the audience definition to see matching anonymous users
                  and the evidence behind each match.
                </p>
              </div>
            </div>
          ) : result.total === 0 ? (
            <div className="state-card empty-state">
              <div className="state-icon">
                <Users size={21} />
              </div>
              <div>
                <h3>No users matched</h3>
                <p>
                  Try widening the time window or relaxing one of your
                  conditions.
                </p>
              </div>
            </div>
          ) : (
            <div className="results-card">
              <div className="table-meta">
                <span>Matching anonymous users</span>
                <span>Evaluated Sep 29, 2026</span>
              </div>
              <div className="member-list">
                {result.members.map((member) => (
                  <div className="member-row" key={member.anonymousId}>
                    <div className="member-id">
                      <span className="avatar">
                        {member.anonymousId.slice(-1)}
                      </span>
                      <strong>{member.anonymousId}</strong>
                    </div>
                    <div className="evidence-list">
                      {member.evidence.map((evidence) => (
                        <span
                          className="evidence-pill"
                          key={evidence.eventType}
                        >
                          <b>{eventLabels[evidence.eventType]}</b>
                          <span>{evidence.observedCount} observed</span>
                          <em>
                            {evidence.operator === "at_least" ? "≥" : "="}{" "}
                            {evidence.requestedCount}
                          </em>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
      <footer className="footer">
        <span>Mable Audience Builder</span>
        <span>Deterministic preview · v1</span>
      </footer>
    </div>
  );
}
export default App;
