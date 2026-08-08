"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COOKIE_NAME_REFRESH = exports.PASSWORD_RESET_EXPIRY_MS = exports.REFRESH_TOKEN_EXPIRY_JWT = exports.REFRESH_TOKEN_EXPIRY_MS = exports.ACCESS_TOKEN_EXPIRY = exports.CURRENT_TOS_VERSION = void 0;
// Application-wide constants
// Update CURRENT_TOS_VERSION whenever the Terms of Service, Privacy Policy,
// or Damage Policy changes. Users must re-accept if the version changes.
exports.CURRENT_TOS_VERSION = '1.0.0';
exports.ACCESS_TOKEN_EXPIRY = '15m';
exports.REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
exports.REFRESH_TOKEN_EXPIRY_JWT = '7d';
exports.PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour in ms
exports.COOKIE_NAME_REFRESH = 'pr_refresh_token';
