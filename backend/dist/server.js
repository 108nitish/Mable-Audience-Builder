"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const repository_1 = require("./repository");
const evaluator_1 = require("./evaluator");
const validation_1 = require("./validation");
const app = (0, express_1.default)();
exports.app = app;
app.use(express_1.default.json({ limit: '32kb' }));
const db = (0, repository_1.createDatabase)(process.env.DATABASE_PATH ?? '/data/mable.sqlite');
exports.db = db;
const repository = new repository_1.EventRepository(db);
console.info('[mable] Database initialized; demo dataset verified');
app.get('/health', (_request, response) => response.json({ status: 'ok' }));
app.post('/v1/audiences/preview', (request, response) => {
    const parsed = validation_1.audienceSchema.safeParse(request.body);
    if (!parsed.success)
        return response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid audience definition', details: (0, validation_1.issuesFromZod)(parsed.error) } });
    try {
        console.info('[mable] Audience preview requested');
        const result = (0, evaluator_1.evaluateAudience)(parsed.data, repository);
        console.info(`[mable] Audience preview completed: ${result.total} members`);
        return response.json(result);
    }
    catch {
        console.error('[mable] Audience evaluation failed');
        return response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unable to evaluate audience' } });
    }
});
app.use((_request, response) => response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));
const port = Number(process.env.PORT ?? 3000);
if (process.env.NODE_ENV !== 'test')
    app.listen(port, '0.0.0.0', () => console.info(`[mable] Backend listening on port ${port}`));
