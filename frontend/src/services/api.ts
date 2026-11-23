import axios from 'axios';
import {
  BucketStatus,
  FileListResponse,
  MessageResponse,
  PresignedUrlResponse,
  TokenResponse,
  User,
  S3Config,
  S3ConfigInput,
  S3TestResult,
  SMTPConfig
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Token helpers
export const getToken = (): string | null => localStorage.getItem('s3_access_token');
export const setToken = (token: string): void => localStorage.setItem('s3_access_token', token);
export const clearToken = (): void => localStorage.removeItem('s3_access_token');

// Active S3 config helper
export const getActiveS3Id = (): number | null => {
  const saved = localStorage.getItem('s3_active_config_id');
  return saved ? Number(saved) : null;
};
export const setActiveS3Id = (id: number | null): void => {
  if (id !== null) {
    localStorage.setItem('s3_active_config_id', String(id));
  } else {
    localStorage.removeItem('s3_active_config_id');
  }
};

// Request interceptor: lampirkan JWT token & Active S3 Config ID di header
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeS3Id = getActiveS3Id();
  if (activeS3Id !== null) {
    config.headers['X-S3-Config-Id'] = String(activeS3Id);
  }
  return config;
});

// Response interceptor: tangani 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!error.config.url.includes('/api/auth/login')) {
        clearToken();
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  // --- Auth ---
  login: async (email: string, password: string): Promise<TokenResponse> => {
    const res = await apiClient.post<TokenResponse>('/api/auth/login', { email, password });
    if (res.data.access_token) {
      setToken(res.data.access_token);
    }
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>('/api/auth/me');
    return res.data;
  },

  logout: (): void => {
    clearToken();
    setActiveS3Id(null);
  },

  // --- S3 Files & Health ---
  checkHealth: async (configId?: number): Promise<BucketStatus> => {
    const headers = configId ? { 'X-S3-Config-Id': String(configId) } : {};
    const res = await apiClient.get<BucketStatus>('/api/files/health', { headers });
    return res.data;
  },

  listFiles: async (prefix: string = '', configId?: number): Promise<FileListResponse> => {
    const headers = configId ? { 'X-S3-Config-Id': String(configId) } : {};
    const res = await apiClient.get<FileListResponse>('/api/files/list', {
      params: { prefix },
      headers,
    });
    return res.data;
  },

  uploadFiles: async (
    files: File[],
    prefix: string = '',
    onProgress?: (percent: number) => void
  ): Promise<MessageResponse> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('prefix', prefix);

    const res = await apiClient.post<MessageResponse>('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
    return res.data;
  },

  createFolder: async (folderName: string, prefix: string = ''): Promise<MessageResponse> => {
    const res = await apiClient.post<MessageResponse>('/api/files/create-folder', {
      folder_name: folderName,
      prefix,
    });
    return res.data;
  },

  getDownloadUrl: (path: string, configId?: number): string => {
    const token = getToken();
    const activeId = configId || getActiveS3Id();
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    const configParam = activeId ? `&s3_config_id=${encodeURIComponent(activeId)}` : '';
    return `${API_BASE_URL}/api/files/download?path=${encodeURIComponent(path)}${tokenParam}${configParam}`;
  },

  getPresignedUrl: async (path: string, expires: number = 3600): Promise<PresignedUrlResponse> => {
    const res = await apiClient.get<PresignedUrlResponse>('/api/files/presigned-url', {
      params: { path, expires },
    });
    return res.data;
  },

  deleteItem: async (path: string, isDir: boolean = false): Promise<MessageResponse> => {
    const res = await apiClient.delete<MessageResponse>('/api/files/delete', {
      params: { path, is_dir: isDir },
    });
    return res.data;
  },

  batchDelete: async (items: { path: string; is_dir: boolean }[]): Promise<MessageResponse> => {
    const res = await apiClient.post<MessageResponse>('/api/files/batch-delete', { items });
    return res.data;
  },

  batchDownload: async (
    items: { path: string; is_dir: boolean }[],
    zipName: string = 'archive.zip'
  ): Promise<Blob> => {
    const res = await apiClient.post(
      '/api/files/batch-download',
      { items, zip_name: zipName },
      { responseType: 'blob' }
    );
    return res.data;
  },

  // --- Multi S3 Settings ---
  listS3Configs: async (): Promise<S3Config[]> => {
    const res = await apiClient.get<S3Config[]>('/api/settings/s3');
    return res.data;
  },

  createS3Config: async (data: S3ConfigInput): Promise<S3Config> => {
    const res = await apiClient.post<S3Config>('/api/settings/s3', data);
    return res.data;
  },

  updateS3Config: async (id: number, data: Partial<S3ConfigInput>): Promise<S3Config> => {
    const res = await apiClient.put<S3Config>(`/api/settings/s3/${id}`, data);
    return res.data;
  },

  deleteS3Config: async (id: number): Promise<MessageResponse> => {
    const res = await apiClient.delete<MessageResponse>(`/api/settings/s3/${id}`);
    return res.data;
  },

  setDefaultS3Config: async (id: number): Promise<MessageResponse> => {
    const res = await apiClient.post<MessageResponse>(`/api/settings/s3/${id}/default`);
    return res.data;
  },

  testS3Connection: async (data: S3ConfigInput): Promise<S3TestResult> => {
    const res = await apiClient.post<S3TestResult>('/api/settings/s3/test', data);
    return res.data;
  },

  // --- SMTP Settings ---
  getSMTPConfig: async (): Promise<SMTPConfig> => {
    const res = await apiClient.get<SMTPConfig>('/api/settings/smtp');
    return res.data;
  },

  saveSMTPConfig: async (data: SMTPConfig): Promise<MessageResponse> => {
    const res = await apiClient.post<MessageResponse>('/api/settings/smtp', data);
    return res.data;
  },

  testSMTP: async (targetEmail: string): Promise<MessageResponse> => {
    const res = await apiClient.post<MessageResponse>('/api/settings/smtp/test', {
      target_email: targetEmail,
    });
    return res.data;
  },

  // --- Profile & Security & Wizard ---
  requestEmailChange: async (newEmail: string): Promise<MessageResponse> => {
    const res = await apiClient.post<MessageResponse>('/api/settings/profile/request-email-change', {
      new_email: newEmail,
    });
    return res.data;
  },

  confirmEmailChange: async (code: string, newPassword?: string): Promise<MessageResponse> => {
    const res = await apiClient.post<MessageResponse>('/api/settings/profile/confirm-email-change', {
      code,
      new_password: newPassword,
    });
    return res.data;
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<MessageResponse> => {
    const res = await apiClient.post<MessageResponse>('/api/settings/profile/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return res.data;
  },

  completeWizard: async (data: {
    new_email: string;
    verification_code: string;
    new_password: string;
    s3_config?: S3ConfigInput;
  }): Promise<MessageResponse> => {
    const res = await apiClient.post<MessageResponse>('/api/settings/profile/complete-wizard', data);
    return res.data;
  },
};
