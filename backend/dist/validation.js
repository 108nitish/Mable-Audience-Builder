"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.audienceSchema = void 0;
exports.issuesFromZod = issuesFromZod;
const zod_1 = require("zod");
const types_1 = require("./types");
exports.audienceSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(120),
    asOf: zod_1.z.string().datetime({ offset: true }),
    conditions: zod_1.z.array(zod_1.z.object({
        eventType: zod_1.z.enum(types_1.EVENT_TYPES), operator: zod_1.z.enum(types_1.OPERATORS),
        count: zod_1.z.number().int().min(0).max(100000), withinDays: zod_1.z.number().int().min(0).max(3650),
    })).min(1).max(20),
});
function issuesFromZod(error) { return error.issues.map((issue) => ({ field: issue.path.join('.') || 'request', message: issue.message })); }
