export type UserRole = 'admin' | 'guest' | 'user';

export interface SessionUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  mfa_enabled?: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface MFALoginResponse {
  mfa_required: true;
  mfa_token: string;
  expires_in: number;
}

const STORAGE_KEY = 'raptorx_session';
const ACCESS_TOKEN_KEY = 'raptorx_access_token';
const REFRESH_TOKEN_KEY = 'raptorx_refresh_token';
const MFA_TOKEN_KEY = 'raptorx_mfa_token';

export const getSession = (): SessionUser | null => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as SessionUser;
    if (parsed?.email && parsed?.id) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

export const getAccessToken = (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY);

export const getRefreshToken = (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY);

export const getMFAToken = (): string | null => localStorage.getItem(MFA_TOKEN_KEY);

export const isAdmin = (): boolean => getSession()?.role === 'admin';

export const isAuthenticated = (): boolean => !!getAccessToken() && !!getSession();

/**
 * Extract error message from API response, handling Pydantic validation errors
 */
const extractErrorMessage = (detail: unknown, defaultMessage: string): string => {
  if (typeof detail === 'string') {
    return detail;
  }
  if (Array.isArray(detail) && detail.length > 0) {
    // Handle Pydantic validation error array
    const firstError = detail[0];
    if (typeof firstError === 'object' && firstError !== null && 'msg' in firstError) {
      return String((firstError as Record<string, unknown>).msg);
    }
  }
  return defaultMessage;
};

export const loginAsAdmin = async (
  email: string,
  pin: string,
): Promise<{ success: boolean; requiresMFA?: boolean; mfaToken?: string; error?: string }> => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pin }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Login failed' }));
      const errorMessage = extractErrorMessage(error.detail, 'Login failed');
      return { success: false, error: errorMessage };
    }

    const data = await response.json();

    // Check if MFA is required
    if (data.mfa_required) {
      localStorage.setItem(MFA_TOKEN_KEY, data.mfa_token);
      return {
        success: false,
        requiresMFA: true,
        mfaToken: data.mfa_token,
      };
    }

    // Store tokens and user session
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        id: data.user.id,
        username: data.user.email,
        email: data.user.email,
        role: data.user.role,
        mfa_enabled: data.user.mfa_enabled,
      } satisfies SessionUser),
    );

    return { success: true };
  } catch (error) {
    console.error('Login failed:', error);
    return { success: false, error: 'Network error' };
  }
};

export const verifyMFA = async (
  totpCode: string,
  backupCode?: string,
): Promise<{ success: boolean; error?: string }> => {
  const mfaToken = getMFAToken();
  if (!mfaToken) {
    return { success: false, error: 'No MFA session found' };
  }

  try {
    const response = await fetch('/api/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mfa_token: mfaToken,
        totp_code: totpCode,
        backup_code: backupCode,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'MFA verification failed' }));
      const errorMessage = extractErrorMessage(error.detail, 'MFA verification failed');
      return { success: false, error: errorMessage };
    }

    const data = await response.json();

    // Store tokens and clear MFA token
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    localStorage.removeItem(MFA_TOKEN_KEY);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        id: data.user.id,
        username: data.user.email,
        email: data.user.email,
        role: data.user.role,
        mfa_enabled: data.user.mfa_enabled,
      } satisfies SessionUser),
    );

    return { success: true };
  } catch (error) {
    console.error('MFA verification failed:', error);
    return { success: false, error: 'Network error' };
  }
};

export const refreshAccessToken = async (): Promise<boolean> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      logout();
      return false;
    }

    const data = await response.json();
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);

    return true;
  } catch (error) {
    console.error('Token refresh failed:', error);
    logout();
    return false;
  }
};

export const logout = async (): Promise<void> => {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    }
  }

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(MFA_TOKEN_KEY);
};