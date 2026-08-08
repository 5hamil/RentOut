"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCsrfToken = exports.csrfProtection = void 0;
const crypto_1 = __importDefault(require("crypto"));
const csrfProtection = (req, res, next) => {
    // Allow safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }
    // Check header and cookie
    const csrfHeader = req.headers['x-csrf-token'];
    const csrfCookie = req.cookies['csrfToken'];
    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
        res.status(403).json({ message: 'CSRF token missing or invalid' });
        return;
    }
    next();
};
exports.csrfProtection = csrfProtection;
const generateCsrfToken = (req, res) => {
    const token = crypto_1.default.randomBytes(32).toString('hex');
    res.cookie('csrfToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });
    res.json({ csrfToken: token });
};
exports.generateCsrfToken = generateCsrfToken;
