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

  async getAttemptAnalysis(attemptId) {
    return this.request(`/attempts/${attemptId}/analysis`);
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

  async getJobStreamTicket(jobId) {
    return this.request(`/jobs/${jobId}/stream-ticket`, {
      method: 'POST'
    });
  }

  // Roadmap & Days API
  async getRoadmap(workspaceId) {
    return this.request(`/workspaces/${workspaceId}/roadmap`);
  }

  async generateRoadmap(workspaceId, settings) {
    return this.request(`/workspaces/${workspaceId}/roadmap`, {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }

  async regenerateRoadmap(roadmapId, settings) {
    return this.request(`/roadmaps/${roadmapId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ settings })
    });
  }

  async reorderDays(roadmapId, dayIds) {
    return this.request(`/roadmaps/${roadmapId}/days/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ dayIds })
    });
  }

  async getDay(dayId) {
    return this.request(`/days/${dayId}`);
  }

  async updateDayStatus(dayId, status) {
    return this.request(`/days/${dayId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  // Day Notes API (Phase 5)
  async getDayNotes(dayId, isSync = false) {
    return this.request(`/days/${dayId}/notes${isSync ? '?sync=true' : ''}`);
  }

  async regenerateDayNotes(dayId, isSync = false) {
    return this.request(`/days/${dayId}/notes/regenerate${isSync ? '?sync=true' : ''}`, {
      method: 'POST'
    });
  }

  async markNotesRead(dayId) {
    return this.request(`/days/${dayId}/notes/read`, {
      method: 'POST'
    });
  }

  // Curated Resources API (Phase 6)
  async getDayResources(dayId, isSync = false) {
    return this.request(`/days/${dayId}/resources${isSync ? '?sync=true' : ''}`);
  }

  async regenerateDayResources(dayId, isSync = false) {
    return this.request(`/days/${dayId}/resources/regenerate${isSync ? '?sync=true' : ''}`, {
      method: 'POST'
    });
  }

  async saveResourceFeedback(resourceId, feedback = {}) {
    return this.request(`/resources/${resourceId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(feedback)
    });
  }

  // Day CBT Diagnostic Test API (Phase 7)
  async getDayTest(dayId, isSync = false) {
    return this.request(`/days/${dayId}/test${isSync ? '?sync=true' : ''}`, {
      method: 'POST'
    });
  }

  async getWorkspaceTests(workspaceId) {
    return this.request(`/workspaces/${workspaceId}/tests`);
  }

  async getWorkspaceMastery(workspaceId) {
    return this.request(`/workspaces/${workspaceId}/mastery`);
  }

  async getRoadmapChanges(roadmapId) {
    return this.request(`/roadmaps/${roadmapId}/changes`);
  }

  async generateFinalMock(roadmapId) {
    return this.request(`/roadmaps/${roadmapId}/final-mock`, {
      method: 'POST'
    });
  }

  // AI Tutor Chat API (Phase 9)
  async createChatSession(workspaceId, payload = {}) {
    return this.request(`/workspaces/${workspaceId}/chat/sessions`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getChatSessions(workspaceId) {
    return this.request(`/workspaces/${workspaceId}/chat/sessions`);
  }

  async getChatMessages(sessionId) {
    return this.request(`/chat/sessions/${sessionId}/messages`);
  }

  async deleteChatSession(sessionId) {
    return this.request(`/chat/sessions/${sessionId}`, {
      method: 'DELETE'
    });
  }

  async streamChatMessage(sessionId, message, { onMeta, onChunk, onDone, onError, signal } = {}) {
    try {
      const response = await fetch(`${API_BASE}/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {})
        },
        body: JSON.stringify({ message }),
        signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Stream failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventBlock of events) {
          if (!eventBlock.trim() || eventBlock.startsWith(':')) continue;

          let eventType = 'message';
          let dataStr = '';

          const lines = eventBlock.split('\n');
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataStr += line.slice(5).trim();
            }
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (eventType === 'meta') {
              if (onMeta) onMeta(data);
            } else if (eventType === 'chunk') {
              if (onChunk) onChunk(data.text);
            } else if (eventType === 'done') {
              if (onDone) onDone(data);
            } else if (eventType === 'error') {
              if (onError) onError(new Error(data.error || 'Chat stream error'));
            }
          } catch (jsonErr) {
            console.warn('Failed to parse SSE data:', dataStr);
          }
        }
      }
    } catch (err) {
      if (onError) onError(err);
      else throw err;
    }
  }
}

export const api = new ApiService();
export default api;
