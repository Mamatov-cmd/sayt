// database.js - API client for SQLite3 backend

const API_URL = import.meta.env.VITE_API_URL || '/api';

const request = async (path, options = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
};

// Initialize database (no-op for API)
export const initDatabase = async () => {
  await request('/health');
  return true;
};

// Save database (handled by server)
export const saveDatabase = () => {};

// Database operations via API
export const dbOperations = {
  // Users
  async createUser(user) {
    return request('/users', {
      method: 'POST',
      body: JSON.stringify(user)
    });
  },

  async getUsers() {
    return request('/users');
  },

  async getUserByEmail(email) {
    if (!email) return null;
    return request(`/users/by-email?email=${encodeURIComponent(email)}`);
  },

  async updateUser(userId, updates) {
    return request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async getUserById(userId) {
    return request(`/users/${userId}`);
  },

  async updateUserRole(userId, role, actorId) {
    return request(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role, actor_id: actorId })
    });
  },

  async setUserBanned(userId, banned, actorId) {
    return request(`/users/${userId}/ban`, {
      method: 'PUT',
      body: JSON.stringify({ banned, actor_id: actorId })
    });
  },

  async deleteUser(userId, actorId) {
    const query = actorId ? `?actor_id=${encodeURIComponent(actorId)}` : '';
    return request(`/users/${userId}${query}`, { method: 'DELETE' });
  },

  // Startups
  async createStartup(startup) {
    return request('/startups', {
      method: 'POST',
      body: JSON.stringify(startup)
    });
  },

  async getStartups() {
    return request('/startups');
  },

  async updateStartup(startupId, updates) {
    return request(`/startups/${startupId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async updateStartupStatus(startupId, status, rejectionReason, actorId) {
    return request(`/startups/${startupId}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        status,
        rejection_reason: rejectionReason || null,
        actor_id: actorId
      })
    });
  },

  async deleteStartup(startupId, actorId) {
    const query = actorId ? `?actor_id=${encodeURIComponent(actorId)}` : '';
    return request(`/startups/${startupId}${query}`, { method: 'DELETE' });
  },

  // Join Requests
  async createJoinRequest(requestBody) {
    return request('/join-requests', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  },

  async getJoinRequests() {
    return request('/join-requests?status=pending');
  },

  async updateRequestStatus(requestId, status) {
    return request(`/join-requests/${requestId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  async deleteRequest(requestId) {
    return request(`/join-requests/${requestId}`, { method: 'DELETE' });
  },

  // Notifications
  async createNotification(notification) {
    return request('/notifications', {
      method: 'POST',
      body: JSON.stringify(notification)
    });
  },

  async getNotifications(userId = null) {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return request(`/notifications${query}`);
  },

  async markNotificationAsRead(notificationId) {
    return request(`/notifications/${notificationId}/read`, { method: 'PUT' });
  },

  async markAllNotificationsAsRead(userId) {
    return request(`/notifications/mark-all-read?userId=${encodeURIComponent(userId)}`, { method: 'PUT' });
  },

  // Tasks
  async createTask(task) {
    return request('/tasks', {
      method: 'POST',
      body: JSON.stringify(task)
    });
  },

  async updateTaskStatus(taskId, status) {
    return request(`/tasks/${taskId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  async deleteTask(taskId) {
    return request(`/tasks/${taskId}`, { method: 'DELETE' });
  },

  // Categories
  async getCategories() {
    return request('/categories');
  },

  async createCategory(name, actorId) {
    return request('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, actor_id: actorId })
    });
  },

  async deleteCategory(categoryId, actorId) {
    const query = actorId ? `?actor_id=${encodeURIComponent(actorId)}` : '';
    return request(`/categories/${categoryId}${query}`, { method: 'DELETE' });
  },

  // Stats
  async getStats() {
    return request('/stats');
  },

  // Audit logs
  async getAuditLogs(limit = 50) {
    return request(`/audit-logs?limit=${limit}`);
  }
};

export default dbOperations;
