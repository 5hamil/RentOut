import {
  AuthResponse,
  LoginPayload,
  SignupPayload,
  ValidationErrorResponse,
} from '@/types/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

let csrfToken: string | null = null;

export const fetchCsrfToken = async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/csrf-token`, { 
      credentials: 'include',
      cache: 'no-store' 
    });
    const data = await res.json();
    if (data.csrfToken) {
      console.log('Successfully fetched CSRF token');
      csrfToken = data.csrfToken;
    } else {
      console.error('CSRF token missing in response', data);
    }
  } catch (err) {
    console.error('Failed to fetch CSRF token', err);
  }
};

class ApiError extends Error {
  status: number;
  errors?: { field?: string; message: string }[];

  constructor(message: string, status: number, errors?: { field?: string; message: string }[]) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const isFormData = fetchOptions.body instanceof FormData;
  
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(fetchOptions.method?.toUpperCase() || '')) {
    if (!csrfToken) await fetchCsrfToken();
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    } else {
      throw new Error('Could not fetch CSRF token. Please refresh the page and try again.');
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
    credentials: 'include', // send cookies (refresh token)
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errData = data as ValidationErrorResponse;
    throw new ApiError(errData.message || 'Request failed', res.status, errData.errors);
  }

  return data as T;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  signup: (payload: SignupPayload) =>
    request<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginPayload) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: (token?: string) =>
    request<{ message: string }>('/api/auth/logout', {
      method: 'POST',
      token,
    }),

  refresh: () =>
    request<{ accessToken: string }>('/api/auth/refresh', {
      method: 'POST',
    }),

  me: (token: string) =>
    request<{ user: AuthResponse['user'] }>('/api/auth/me', {
      method: 'GET',
      token,
    }),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
};

export { ApiError };
