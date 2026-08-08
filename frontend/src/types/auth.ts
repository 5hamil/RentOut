export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  profileImage: string | null;
  avgRating: number | null;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected' | 'permanently_blocked';
  resubmissionCount: number;
  isAdmin: boolean;
  role?: 'USER' | 'ADMIN';
  tosAcceptedAt: string | null;
  tosVersion: string | null;
  createdAt: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  tosAccepted: boolean;
  tosVersion: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ApiError {
  field?: string;
  message: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  message: string;
}

export interface ValidationErrorResponse {
  message: string;
  errors: ApiError[];
}
