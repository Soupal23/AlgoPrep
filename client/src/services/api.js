const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.accessToken = localStorage.getItem('algoprep_access_token');
    this.refreshToken = localStorage.getItem('algoprep_refresh_token');
    this.user = this.getStoredUser();
  }

  setTokens(accessToken, refreshToken) {
    if (accessToken) {
      this.accessToken = accessToken;
      localStorage.setItem('algoprep_access_token', accessToken);
    }
    if (refreshToken) {
      this.refreshToken = refreshToken;
      localStorage.setItem('algoprep_refresh_token', refreshToken);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    localStorage.removeItem('algoprep_access_token');
    localStorage.removeItem('algoprep_refresh_token');
    localStorage.removeItem('algoprep_user');
  }

  getStoredUser() {
    const userStr = localStorage.getItem('algoprep_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  }

  setStoredUser(user) {
    this.user = user;
    if (user) {
      localStorage.setItem('algoprep_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('algoprep_user');
    }
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

    // Handle token expiration & automatic refresh
    if (response.status === 401 && this.refreshToken && !endpoint.includes('/auth/')) {
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
          window.location.href = '/';
        }
      } catch (err) {
        this.clearTokens();
        window.location.href = '/';
      }
    }

    const text = await response.text();
    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (err) {
        if (!response.ok) {
          throw new Error(`Server connection error (${response.status}): Could not connect to backend server.`);
        }
      }
    }

    if (!response.ok) {
      if (response.status === 429) {
        const headerRetry = Number.parseInt(response.headers.get('Retry-After') || '', 10);
        const retryAfterSeconds = Number.isFinite(data.retryAfterSeconds)
          ? data.retryAfterSeconds
          : Number.isFinite(headerRetry)
            ? headerRetry
            : null;
        const waitText = retryAfterSeconds ? ` Please wait ${retryAfterSeconds} seconds.` : ' Please wait a moment.';
        const rateErr = new Error(`You're doing that too fast.${waitText}`);
        rateErr.status = 429;
        rateErr.retryAfterSeconds = retryAfterSeconds;
        rateErr.serverMessage = data.error;
        throw rateErr;
      }

      const err = new Error(data.error || `Request failed with status ${response.status}`);
      err.status = response.status;
      throw err;
    }

    return data;
  }

  // Auth API
  async signup(name, email, password) {
    const payload = { name, email, password };
    const res = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
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

  // User Profile API
  async getProfile() {
    return this.request('/users/profile');
  }

  async updateProfile(payload) {
    const res = await this.request('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    if (res.user) {
      this.setStoredUser(res.user);
    }
    return res;
  }

  async uploadAvatar(formData) {
    const res = await this.request('/users/avatar', {
      method: 'POST',
      body: formData
    });
    if (res.user) {
      this.setStoredUser(res.user);
    }
    return res;
  }

  // Tests API
  async getTests() {
    return this.request('/tests');
  }

  async getTestById(id) {
    return this.request(`/tests/${id}`);
  }

  async deleteTest(id) {
    return this.request(`/tests/${id}`, {
      method: 'DELETE'
    });
  }

  async startTest(testId) {
    const query = window.location.search.includes('retake=true') ? '?retake=true' : '';
    return this.request(`/tests/${testId}/start${query}`, {
      method: 'POST'
    });
  }

  // Admin User Moderation API
  async getAdminUsers(params = {}) {
    const query = new URLSearchParams();
    if (params.role) query.append('role', params.role);
    if (params.isActive !== undefined) query.append('isActive', params.isActive.toString());
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/admin/users${qStr}`);
  }

  async updateUserStatus(id, isActive) {
    return this.request(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive })
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

  async regenerateAIRevisionPlan(attemptId) {
    return this.request(`/attempts/${attemptId}/ai-revision/regenerate`, {
      method: 'POST'
    });
  }

  async getUserAttempts() {
    return this.request('/attempts/user/my-attempts');
  }

  // AI Syllabus generator / Quick Quiz
  async generateAITest(formData) {
    return this.request('/ai/generate', {
      method: 'POST',
      body: formData
    });
  }

  // Workspaces API
  async getWorkspaces() {
    return this.request('/workspaces');
  }

  async createWorkspace(data) {
    return this.request('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getWorkspaceById(id) {
    return this.request(`/workspaces/${id}`);
  }

  async updateWorkspace(id, data) {
    return this.request(`/workspaces/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteWorkspace(id) {
    return this.request(`/workspaces/${id}`, {
      method: 'DELETE'
    });
  }

  async uploadMaterials(workspaceId, formData) {
    return this.request(`/workspaces/${workspaceId}/materials`, {
      method: 'POST',
      body: formData
    });
  }

  async getMaterials(workspaceId) {
    return this.request(`/workspaces/${workspaceId}/materials`);
  }

  async deleteMaterial(workspaceId, materialId) {
    return this.request(`/workspaces/${workspaceId}/materials/${materialId}`, {
      method: 'DELETE'
    });
  }

  async searchWorkspace(workspaceId, query, k = 6) {
    return this.request(`/workspaces/${workspaceId}/search`, {
      method: 'POST',
      body: JSON.stringify({ query, k })
    });
  }

  // Jobs API
  async getJob(jobId) {
    return this.request(`/jobs/${jobId}`);
  }
}

export const api = new ApiService();
export default api;
