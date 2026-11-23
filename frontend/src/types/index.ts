export interface FileItem {
  name: string;
  full_path: string;
  size: number;
  last_modified: string | null;
  content_type: string | null;
  is_dir: boolean;
}

export interface FileListResponse {
  items: FileItem[];
  current_prefix: string;
  total_files: number;
  total_folders: number;
  total_size_bytes: number;
}

export interface BucketStatus {
  bucket_name: string;
  connected: boolean;
  exists: boolean;
  endpoint: string;
  message?: string;
  config_id?: number;
  config_name?: string;
}

export interface PresignedUrlResponse {
  url: string;
  expires_seconds: number;
}

export interface MessageResponse {
  message: string;
  success: boolean;
  dev_code?: string;
}

export interface User {
  id: number;
  email: string;
  full_name?: string | null;
  is_active: boolean;
  needs_initial_setup: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface S3Config {
  id: number;
  name: string;
  endpoint: string;
  access_key: string;
  bucket_name: string;
  region?: string | null;
  secure: boolean;
  is_default: boolean;
  created_at: string;
}

export interface S3ConfigInput {
  name: string;
  endpoint: string;
  access_key: string;
  secret_key: string;
  bucket_name: string;
  region?: string;
  secure: boolean;
  is_default?: boolean;
}

export interface S3TestResult {
  connected: boolean;
  exists: boolean;
  message: string;
}

export interface SMTPConfig {
  id?: number;
  host: string;
  port: number;
  username?: string | null;
  password?: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  use_ssl: boolean;
  is_configured: boolean;
}
