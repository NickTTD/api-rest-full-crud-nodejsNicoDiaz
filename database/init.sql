-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de logs
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    method VARCHAR(10) NOT NULL,
    path TEXT NOT NULL,
    status_code INTEGER,
    response_time INTEGER,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_method ON logs(method);
CREATE INDEX IF NOT EXISTS idx_logs_path ON logs(path);

-- Insertar algunos usuarios de ejemplo (opcional)
INSERT INTO users (name, email) VALUES
    ('Juan Pérez', 'juan@example.com'),
    ('María García', 'maria@example.com'),
    ('Carlos López', 'carlos@example.com')
ON CONFLICT (email) DO NOTHING;
