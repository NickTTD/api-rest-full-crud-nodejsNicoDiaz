import { QueryResult } from 'pg';
import pool from './connection';
import { User, Log } from '../models/types';

// ============= QUERIES DE USUARIOS =============

export const getAllUsers = async (): Promise<User[]> => {
  const query = 'SELECT * FROM users ORDER BY created_at DESC';
  const result: QueryResult<User> = await pool.query(query);
  return result.rows;
};

export const getUserById = async (id: number): Promise<User | null> => {
  const query = 'SELECT * FROM users WHERE id = $1';
  const result: QueryResult<User> = await pool.query(query, [id]);
  return result.rows[0] || null;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const query = 'SELECT * FROM users WHERE email = $1';
  const result: QueryResult<User> = await pool.query(query, [email]);
  return result.rows[0] || null;
};

export const createUser = async (name: string, email: string): Promise<User> => {
  const query = `
    INSERT INTO users (name, email) 
    VALUES ($1, $2) 
    RETURNING *
  `;
  const result: QueryResult<User> = await pool.query(query, [name, email]);
  return result.rows[0];
};

export const updateUser = async (
  id: number, 
  updates: Partial<Pick<User, 'name' | 'email'>>
): Promise<User | null> => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  if (updates.name !== undefined) {
    fields.push(`name = ${paramCount}`);
    values.push(updates.name);
    paramCount++;
  }

  if (updates.email !== undefined) {
    fields.push(`email = ${paramCount}`);
    values.push(updates.email);
    paramCount++;
  }

  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  values.push(id);
  const query = `
    UPDATE users 
    SET ${fields.join(', ')} 
    WHERE id = ${paramCount} 
    RETURNING *
  `;

  const result: QueryResult<User> = await pool.query(query, values);
  return result.rows[0] || null;
};

export const deleteUser = async (id: number): Promise<User | null> => {
  const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
  const result: QueryResult<User> = await pool.query(query, [id]);
  return result.rows[0] || null;
};

// ============= QUERIES DE LOGS =============

export const getAllLogs = async (limit: number = 100, method?: string): Promise<Log[]> => {
  let query = 'SELECT * FROM logs';
  const values = [];

  if (method) {
    query += ' WHERE method = $1';
    values.push(method.toUpperCase());
  }

  query += 'ORDER BY timestamp DESC LIMIT  + (values.length + 1);'
  values.push(limit);

  const result: QueryResult<Log> = await pool.query(query, values);
  return result.rows;
};

export const createLog = async (logData: {
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  ipAddress: string;
  userAgent: string;
}): Promise<Log> => {
  const query = `
    INSERT INTO logs (timestamp, method, path, status_code, response_time, ip_address, user_agent)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  
  const values = [
    logData.timestamp,
    logData.method,
    logData.path,
    logData.statusCode,
    logData.responseTime,
    logData.ipAddress,
    logData.userAgent
  ];

  const result: QueryResult<Log> = await pool.query(query, values);
  return result.rows[0];
};

// ============= UTILITY QUERIES =============

export const getUserCount = async (): Promise<number> => {
  const query = 'SELECT COUNT(*) as count FROM users';
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
};

export const getLogCount = async (): Promise<number> => {
  const query = 'SELECT COUNT(*) as count FROM logs';
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
};

export const cleanOldLogs = async (daysToKeep: number = 30): Promise<number> => {
  const query = `
    DELETE FROM logs 
    WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
  `;
  const result = await pool.query(query);
  return result.rowCount || 0;
};
