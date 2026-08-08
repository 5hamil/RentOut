// Application-wide constants
// Update CURRENT_TOS_VERSION whenever the Terms of Service, Privacy Policy,
// or Damage Policy changes. Users must re-accept if the version changes.
export const CURRENT_TOS_VERSION = '1.0.0';

export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
export const REFRESH_TOKEN_EXPIRY_JWT = '7d';
export const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour in ms

export const COOKIE_NAME_REFRESH = 'pr_refresh_token';
