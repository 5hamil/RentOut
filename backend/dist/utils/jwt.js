"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const constants_1 = require("../constants");
const getAccessSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret)
        throw new Error('JWT_SECRET environment variable is not set');
    return secret;
};
const getRefreshSecret = () => {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
    if (!secret)
        throw new Error('JWT secret environment variable is not set');
    return secret;
};
const generateAccessToken = (userId) => jsonwebtoken_1.default.sign({ sub: userId }, getAccessSecret(), { expiresIn: constants_1.ACCESS_TOKEN_EXPIRY });
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (userId) => jsonwebtoken_1.default.sign({ sub: userId }, getRefreshSecret(), { expiresIn: constants_1.REFRESH_TOKEN_EXPIRY_JWT });
exports.generateRefreshToken = generateRefreshToken;
const verifyAccessToken = (token) => jsonwebtoken_1.default.verify(token, getAccessSecret());
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => jsonwebtoken_1.default.verify(token, getRefreshSecret());
exports.verifyRefreshToken = verifyRefreshToken;
