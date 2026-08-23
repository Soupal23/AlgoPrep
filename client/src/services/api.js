const API_BASE = '/api';

class ApiService {
  constructor() {
    this.accessToken = localStorage.getItem('algoprep_access_token');
    this.refreshToken = localStorage.getItem('algoprep_refresh_token');
  }

  setTokens(access, refresh) {
    this.accessToken = access;
    localStorage.setItem('algoprep_access_token', access);
    if (refresh) {
      this.refreshToken = refresh;
      localStorage.setItem('algoprep_refresh_token', refresh);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('algoprep_access_token');
    localStorage.removeItem('algoprep_refresh_token');
    localStorage.removeItem('algoprep_user');
  }

  getStoredUser() {
    const raw = localStorage.getItem('algoprep_user');
    return raw ? JSON.parse(raw) : null;
  }

  setStoredUser(user) {
    localStorage.setItem('algoprep_user', JSON.stringify(user));
  }

  async request(endpoint, options = {}) {
    const headers = {
      ...(options.headers || {})
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401 && this.refreshToken && endpoint !== '/auth/login' && endpoint !== '/auth/signup') {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken })
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          this.setTokens(data.accessToken);
          headers['Authorization'] = `Bearer ${data.accessToken}`;
          response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
          });
        } else {
          this.clearTokens();
          window.location.href = '/login';
        }
      } catch (err) {
        this.clearTokens();
        window.location.href = '/login';
      }
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Auth API
  async signup(name, email, password) {
    const res = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    this.setTokens(res.accessToken, res.refreshToken);
    this.setStoredUser(res.user);
    return res.user;
  }

  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setTokens(res.accessToken, res.refreshToken);
    this.setStoredUser(res.user);
    return res.user;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    } finally {
      this.clearTokens();
    }
  }

  // Tests API
  async getTests() {
    return this.request('/tests');
  }

  async getTestById(id) {
    return this.request(`/tests/${id}`);
  }

  async startTest(testId) {
    const query = window.location.search.includes('retake=true') ? '?retake=true' : '';
    return this.request(`/tests/${testId}/start${query}`, {
      method: 'POST'
    });
  }

  // Attempts API
  async saveProgress(attemptId, payload) {
    return this.request(`/attempts/${attemptId}/progress`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async submitAttempt(attemptId, payload) {
    return this.request(`/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getAttemptById(attemptId) {
    return this.request(`/attempts/${attemptId}`);
  }

  async getAttemptReview(attemptId) {
    return this.request(`/attempts/${attemptId}/review`);
  }

  async getAIRevisionPlan(attemptId) {
    return this.request(`/attempts/${attemptId}/ai-revision`);
  }

  async getUserAttempts() {
    return this.request('/attempts/user/my-attempts');
  }

  // Leaderboard API
  async getLeaderboard(testId = '', page = 1, limit = 10) {
    const query = new URLSearchParams();
    if (testId) query.append('testId', testId);
    query.append('page', page.toString());
    query.append('limit', limit.toString());
    return this.request(`/leaderboard?${query.toString()}`);
  }

  // AI Syllabus generator
  async generateAITest(formData) {
    return this.request('/ai/generate', {
      method: 'POST',
      body: formData
    });
  }
}

export const api = new ApiService();
