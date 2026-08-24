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
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
  }

  // Auth API
  async signup(name, email, password, role) {
    const payload = { name, email, password };
    if (role) payload.role = role;

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

  // Teacher Directory API
  async getTeachers() {
    return this.request('/teachers');
  }

  async getTeacherById(id) {
    return this.request(`/teachers/${id}`);
  }

  // Memberships API
  async joinClass(teacherId) {
    return this.request(`/memberships/join/${teacherId}`, { method: 'POST' });
  }

  async leaveClass(teacherId) {
    return this.request(`/memberships/leave/${teacherId}`, { method: 'DELETE' });
  }

  async getMyTeachers() {
    return this.request('/memberships/my-teachers');
  }

  async getTeacherRoster() {
    return this.request('/memberships/roster');
  }

  async removeStudentFromRoster(studentId) {
    return this.request(`/memberships/roster/${studentId}`, { method: 'DELETE' });
  }

  // Announcements API
  async postAnnouncement(payload) {
    return this.request('/announcements', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getMyAnnouncements() {
    return this.request('/announcements/mine');
  }

  async deleteAnnouncement(id) {
    return this.request(`/announcements/${id}`, { method: 'DELETE' });
  }

  async getStudentAnnouncementsFeed() {
    return this.request('/announcements/feed');
  }

  // Tests API
  async getTests() {
    return this.request('/tests');
  }

  async getTestById(id) {
    return this.request(`/tests/${id}`);
  }

  async createTeacherTest(payload) {
    return this.request('/tests', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async startTest(testId) {
    const query = window.location.search.includes('retake=true') ? '?retake=true' : '';
    return this.request(`/tests/${testId}/start${query}`, {
      method: 'POST'
    });
  }

  // Lectures API
  async postLecture(payload) {
    return this.request('/lectures', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getMyLectures() {
    return this.request('/lectures/mine');
  }

  async deleteLecture(id) {
    return this.request(`/lectures/${id}`, { method: 'DELETE' });
  }

  async getStudentLecturesFeed() {
    return this.request('/lectures/feed');
  }

  async getLectureById(id) {
    return this.request(`/lectures/${id}`);
  }

  // Messages API
  async sendMessage(recipientId, content) {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify({ recipientId, content })
    });
  }

  async getConversations() {
    return this.request('/messages/conversations');
  }

  async getConversationMessages(conversationId, params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);
    if (params.since) query.append('since', params.since);
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/messages/conversations/${conversationId}${qStr}`);
  }

  // Teacher Application API
  async submitTeacherApplication(formData) {
    return this.request('/teacher-applications/apply', {
      method: 'POST',
      body: formData
    });
  }

  async getTeacherApplications(status = '') {
    const qStr = status ? `?status=${status}` : '';
    return this.request(`/admin/teacher-applications${qStr}`);
  }

  async updateTeacherApplicationStatus(id, status) {
    return this.request(`/admin/teacher-applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
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
