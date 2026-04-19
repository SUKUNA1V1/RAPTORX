import { getAccessToken, refreshAccessToken, logout as logoutUser } from './auth';

interface RequestOptions extends RequestInit {
  retry?: boolean;
}

/**
 * HTTP client with automatic token refresh on 401
 * Handles JWT token management and automatic retry on expiration
 */
export const httpClient = {
  async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const { retry = true, ...fetchOptions } = options;

    // Add authorization header
    const accessToken = getAccessToken();
    if (accessToken) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        'Authorization': `Bearer ${accessToken}`,
      };
    }

    try {
      const response = await fetch(url, fetchOptions);

      // If token expired and we haven't retried yet
      if (response.status === 401 && retry && accessToken) {
        // Try to refresh token
        const refreshed = await refreshAccessToken();
        
        if (refreshed) {
          // Retry request with new token
          return this.request<T>(url, { ...options, retry: false });
        } else {
          // Refresh failed, logout user
          await logoutUser();
          throw new Error('Session expired. Please login again.');
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      console.error(`Request failed: ${url}`, error);
      throw error;
    }
  },

  get<T>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  },

  post<T>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  },
};
