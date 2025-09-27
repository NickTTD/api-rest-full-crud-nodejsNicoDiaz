import { Pool, PoolConfig } from 'pg';

// Configuración de la base de datos
const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'users_api',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  max: 20, // Máximo número de conexiones en el pool
  idleTimeoutMillis: 30000, // Cerrar conexiones inactivas después de 30s
  connectionTimeoutMillis: 2000, // Timeout para obtener conexión
};

// Crear pool de conexiones
export const pool = new Pool(dbConfig);

// Función para probar la conexión
export const testConnection = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Conexión a PostgreSQL exitosa:', result.rows[0].now);
    client.release();
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error);
    throw error;
  }
};

// Función para cerrar el pool
export const closePool = async (): Promise<void> => {
  try {
    await pool.end();
    console.log('✅ Pool de conexiones cerrado');
  } catch (error) {
    console.error('❌ Error cerrando pool:', error);
  }
};

// Manejo de eventos del pool
pool.on('connect', (client) => {
  console.log('🔗 Nueva conexión establecida');
});

pool.on('error', (err, client) => {
  console.error('❌ Error inesperado en conexión inactiva:', err);
});

export default pool;
