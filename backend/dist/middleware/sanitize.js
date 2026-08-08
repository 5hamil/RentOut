"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.xssSanitizer = void 0;
const xss_1 = __importDefault(require("xss"));
const xssSanitizer = (req, res, next) => {
    if (req.body)
        req.body = sanitizeObject(req.body);
    if (req.query)
        req.query = sanitizeObject(req.query);
    if (req.params)
        req.params = sanitizeObject(req.params);
    next();
};
exports.xssSanitizer = xssSanitizer;
const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
        return (0, xss_1.default)(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => sanitizeObject(item));
    }
    if (obj !== null && typeof obj === 'object') {
        const sanitizedObj = {};
        for (const key in obj) {
            sanitizedObj[key] = sanitizeObject(obj[key]);
        }
        return sanitizedObj;
    }
    return obj;
};
