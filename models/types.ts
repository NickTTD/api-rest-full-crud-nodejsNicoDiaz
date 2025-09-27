// ============= INTERFACES DE USUARIO =============

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}

// ============= INTERFACES DE LOGS =============

export interface Log {
  id: number;
  timestamp: string;
  method: string;
  path: string;
  status_code: number;
  response_time: number;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface CreateLogData {
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  ipAddress: string;
  userAgent: string;
}

// ============= INTERFACES DE RESPUESTAS API =============

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  total?: number;
}

export interface ApiError {
  success: boolean;
  error: string;
  details?: string[];
}

// ============= TIPOS PARA VALIDACIONES =============

export interface ValidationError {
  field: string;
  message: string;
}

// ============= CONFIGURACIONES =============

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  database: DatabaseConfig;
}
