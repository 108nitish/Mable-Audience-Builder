import express from "express";
import { createDatabase, EventRepository } from "./repository";
import { evaluateAudience } from "./evaluator";
import { audienceSchema, issuesFromZod } from "./validation";

const app = express();
app.use(express.json({ limit: "32kb" }));
const db = createDatabase(process.env.DATABASE_PATH ?? "/data/mable.sqlite");
const repository = new EventRepository(db);
console.info("[mable] Database initialized; demo dataset verified");

app.get("/health", (_request, response) => response.json({ status: "ok" }));
app.post("/v1/audiences/preview", (request, response) => {
  const parsed = audienceSchema.safeParse(request.body);
  if (!parsed.success)
    return response
      .status(400)
      .json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid audience definition",
          details: issuesFromZod(parsed.error),
        },
      });
  try {
    console.info("[mable] Audience preview requested");
    const result = evaluateAudience(parsed.data, repository);
    console.info(`[mable] Audience preview completed: ${result.total} members`);
    return response.json(result);
  } catch {
    console.error("[mable] Audience evaluation failed");
    return response
      .status(500)
      .json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to evaluate audience",
        },
      });
  }
});
app.use((_request, response) =>
  response
    .status(404)
    .json({ error: { code: "NOT_FOUND", message: "Route not found" } }),
);

const port = Number(process.env.PORT ?? 3000);
if (process.env.NODE_ENV !== "test")
  app.listen(port, "0.0.0.0", () =>
    console.info(`[mable] Backend listening on port ${port}`),
  );
export { app, db };
