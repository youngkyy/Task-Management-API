// Centralized Fetch API Wrapper for TaskFlow Backend
const API_BASE_URL = '/api/v1';

const TaskFlowAPI = {
    // Auth Token Management
    getToken() {
        return localStorage.getItem('tf_token');
    },

    setToken(token) {
        localStorage.setItem('tf_token', token);
    },

    clearToken() {
        localStorage.removeItem('tf_token');
    },

    isAuthenticated() {
        return !!this.getToken();
    },

    // HTTP Request Handler
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        
        // Prepare Headers
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);

            // Handle 204 No Content
            if (response.status === 204) {
                return null;
            }

            const data = await response.json();

            if (!response.ok) {
                // If unauthorized (invalid/expired token), auto-logout
                if (response.status === 401) {
                    this.clearToken();
                    // Dispatch custom event to notify main app
                    window.dispatchEvent(new Event('auth-failed'));
                }
                
                const errorMessage = data.detail || 'An unexpected error occurred';
                throw new Error(errorMessage);
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error.message);
            throw error;
        }
    },

    // --- Endpoints ---

    // 1. Authentication
    async register(email, password, fullName) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, full_name: fullName })
        });
    },

    async login(email, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        if (response && response.access_token) {
            this.setToken(response.access_token);
        }
        return response;
    },

    // 2. Users
    async getProfile() {
        return this.request('/users/me');
    },

    async getUsers(skip = 0, limit = 100) {
        return this.request(`/users/?skip=${skip}&limit=${limit}`);
    },

    async updateUserRole(userId, role) {
        return this.request(`/users/${userId}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role })
        });
    },

    // 3. Tasks
    async getTasks({ status, priority, assigneeId, search, skip = 0, limit = 10 } = {}) {
        let params = new URLSearchParams({ skip, limit });
        if (status) params.append('status', status);
        if (priority) params.append('priority', priority);
        if (assigneeId) params.append('assignee_id', assigneeId);
        if (search) params.append('search', search);

        return this.request(`/tasks/?${params.toString()}`);
    },

    async getTask(taskId) {
        return this.request(`/tasks/${taskId}`);
    },

    async createTask(taskData) {
        return this.request('/tasks/', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
    },

    async updateTask(taskId, taskData) {
        return this.request(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(taskData)
        });
    },

    async deleteTask(taskId) {
        return this.request(`/tasks/${taskId}`, {
            method: 'DELETE'
        });
    }
};
