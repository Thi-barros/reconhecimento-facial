import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export enum AccessLevel{

    BASICO = 'BASICO',
    INTERMEDIARIO = 'INTERMEDIARIO',
    TOTAL = 'TOTAL'
}

export enum DocumentLevel{
    LIVRE = 'LIVRE',
    RESTRITO= 'RESTRITO',
    CONFIDENCIAL = 'CONFIDENCIAL'
}

export interface User {
    id: number;
    name: string;
    email: string;
    access_level: AccessLevel;
    created_at: string;
    is_active: boolean;
}

export interface UserUpdate{
    name?: string;
    access_level?: AccessLevel;
    is_active?: boolean;
}

export interface Document {
    id: number;
    title: string;
    filename: string;
    description?: string;
    document_level: DocumentLevel;
    file_path: string;
    uploaded_at: string;
    uploaded_by: number;
}

export interface DocumentAccessResponse{
    documents: Document[];
    user_access_level: AccessLevel;
    total_available: number;
}


export interface AccessResponse {
    access_granted: boolean;
    user_name?: string | null;
    user_email?: string|null;
    message: string;
    confidence_score?: number | null;
    access_level?: AccessLevel;
    locked?: boolean;
    lock_remaining_seconds?: number;
}

export interface AccessLog {
    id: number;
    user_name: string | null;
    access_granted: boolean;
    timestamp: string;
    confidence_score: string | null;
    access_type?: 'facial_recognition' | 'document_access' | 'document_download' | 'lockout';
}

export interface Stats {
    total_authorized_users: number;
    total_access_attempts: number;
    granted_attempts: number;
    denied_attempts: number;
    success_rate: number;
    current_lockouts?: number;
}

export interface LevelInfo{
    value: string;
    label: string;
    description: string;
}

export interface LevelsResponse{
    document_levels: LevelInfo[];
    access_levels: LevelInfo[];
}

export const apiService = {
     getUsers: async (): Promise<User[]> => {
        const response = await api.get<User[]>('/users');
        return response.data;
    },
     registerUser: async (name: string, email: string, accessLevel: AccessLevel, imageFile: File): Promise<User> => {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);
        formData.append('access_level', accessLevel);
        formData.append('image', imageFile);

        const response = await api.post<User>('/users/register', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    async updateUser(userId: number, updateData: UserUpdate):Promise<User> {
        const response = await api.put(`/users/${userId}`, updateData);
        return response.data;
    },

    async deleteUser(userId: number): Promise<void> {
        await api.delete(`/users/${userId}`);
    },


    async checkAccess(imageFile: File): Promise<AccessResponse> {
    const formData = new FormData();
    formData.append('image', imageFile);

    try {
        // validateStatus pra não jogar exceção automaticamente
        const response = await api.post<AccessResponse>('/access/check', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        validateStatus: () => true,
        });

        // Se o back já devolve { locked: true } (200 ou 429 tratado no servidor)
        if ((response.data as any)?.locked) {
        return {
            access_granted: false,
            message: response.data.message || 'Acesso temporariamente bloqueado.',
            locked: true,
            lock_remaining_seconds: (response.data as any).lock_remaining_seconds ?? 60,
        };
        }

        // Se for 429 padrão (FastAPI HTTPException), montar resposta manual
        if (response.status === 429) {
        const data = response.data as any;
        const msg =
            data?.message ||
            data?.detail ||
            'Acesso temporariamente bloqueado. Tente novamente em breve.';
        const remaining =
            typeof data?.lock_remaining_seconds === 'number' ? data.lock_remaining_seconds : 60;

        return {
            access_granted: false,
            message: msg,
            locked: true,
            lock_remaining_seconds: remaining,
        };
        }

        // Fluxo normal 2xx
        return response.data;
    } catch (err: any) {
        // Erros “de verdade” (rede, CORS, etc.)
        if (axios.isAxiosError(err) && err.response?.status === 429) {
        const data = err.response.data as any;
        return {
            access_granted: false,
            message:
            data?.message ||
            data?.detail ||
            'Acesso temporariamente bloqueado. Tente novamente em breve.',
            locked: true,
            lock_remaining_seconds:
            typeof data?.lock_remaining_seconds === 'number' ? data.lock_remaining_seconds : 60,
        };
        }
        throw err;
    }
    },

    async checkAccessCamera(): Promise<AccessResponse> {
        const response = await api.get<AccessResponse>('/access/check-camera');
        return response.data;
    },
    
    //Documentos
    async uploadDocuments(
        title: string,
        description: string,
        documentLevel: DocumentLevel,
        uploaderEmail: string,
        file: File
    ): Promise<Document> {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('document_level', documentLevel);
        formData.append('uploader_email', uploaderEmail);
        formData.append('file', file);

         const response = await api.post('documents/upload', formData, {
            headers: {
                'Content-type': 'multipart/form-data',
            },
         });
         return response.data;
    },

    async getDocuments(userEmail: string): Promise<DocumentAccessResponse> {
        if (!userEmail) throw new Error("Email do usuário não informado!");

    const response = await api.get(`/documents?user_email=${encodeURIComponent(userEmail)}`);
    return response.data;
    },

    async downloadDocument(documentId: number, userEmail: string): Promise<Blob>{
        const response = await api.get(`/documents/${documentId}/download?user_email=${encodeURIComponent(userEmail)}` ,{
            responseType: 'blob',
        });
        return response.data;
    },
    async getDocumentsLevel(): Promise<LevelsResponse> {
        const response = await api.get('/documents/levels');
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
        


