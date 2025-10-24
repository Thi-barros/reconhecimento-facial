import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api'; // Replace with your backend API URL

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface User {
    id: number;
    name: string;
    email: string;
    created_at: string;
    is_active: boolean;
}

export interface AccessResponse {
    access_granted: boolean;
    user_name?: string | null;
    message: string;
    confidence_score?: number | null;
}

export interface AccessLog {
    id: number;
    user_name: string | null;
    access_granted: boolean;
    timestamp: string;
    confidence_score: string | null;
}

export interface Stats {
    total_authorized_users: number;
    total_access_attempts: number;
    granted_attempts: number;
    denied_attempts: number;
    success_rate: number;
}

export const apiService = {
     getUsers: async (): Promise<User[]> => {
        const response = await api.get<User[]>('/users');
        return response.data;
    },
     registerUser: async (name: string, email: string, imageFile: File): Promise<User> => {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);
        formData.append('image', imageFile);

        const response = await api.post<User>('/users/register', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    async deleteUser(userId: number): Promise<void> {
        await api.delete(`/users/${userId}`);
    },


    async checkAccess(imageFile: File): Promise<AccessResponse> {
        const formData = new FormData();
        formData.append('image', imageFile);

        const response = await api.post<AccessResponse>('/access/check', formData, {
            headers: {
                'Content-Type': 'multipart/form-data', 
            },
        });
        return response.data;
    },

    async checkAccessCamera(): Promise<AccessResponse> {
        const response = await api.get<AccessResponse>('/access/check_camera');
        return response.data;
    },

    async getAccessLogs(limit: number = 50): Promise<AccessLog[]> {
        const response = await api.get<AccessLog[]>(`/access/logs?limit=${limit}`);
        return response.data;
    },

    async getStats(): Promise<Stats> {
        const response = await api.get<Stats>('/stats');
        return response.data;
    },

    async healthCheck(): Promise<any> {
        const response = await api.get('/health');
        return response.data;
    },
};

export default apiService;
        


