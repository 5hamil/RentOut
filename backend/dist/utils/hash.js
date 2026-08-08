"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashToken = exports.generateSecureToken = exports.comparePassword = exports.hashPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const SALT_ROUNDS = 12;
/** Hash a plain-text password for storage. */
const hashPassword = (password) => bcryptjs_1.default.hash(password, SALT_ROUNDS);
exports.hashPassword = hashPassword;
/** Compare a plain-text password against a stored hash. */
const comparePassword = (password, hash) => bcryptjs_1.default.compare(password, hash);
exports.comparePassword = comparePassword;
/** Generate a cryptographically-secure random hex token (for email links). */
const generateSecureToken = () => crypto_1.default.randomBytes(32).toString('hex');
exports.generateSecureToken = generateSecureToken;
/** SHA-256 hash a token before storing in the database. */
const hashToken = (token) => crypto_1.default.createHash('sha256').update(token).digest('hex');
exports.hashToken = hashToken;
