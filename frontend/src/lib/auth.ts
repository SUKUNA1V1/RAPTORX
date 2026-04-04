export type UserRole = 'admin' | 'guest';

export interface SessionUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
}

const STORAGE_KEY = 'raptorx_session';

export const getSession = (): SessionUser | null => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as SessionUser;
    if (parsed?.role === 'admin' && parsed?.username) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

export const isAdmin = (): boolean => getSession()?.role === 'admin';

export const loginAsAdmin = async (username: string, password: string): Promise<boolean> => {
  try {
    // Call backend login endpoint
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username, password }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        id: data.id,
        username: data.email,
        email: data.email,
        role: 'admin',
      } satisfies SessionUser),
    );
    return true;
  } catch (error) {
    console.error('Login failed:', error);
    return false;
  }
};

export const logout = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};