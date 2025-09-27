import express, { Request, Response, NextFunction } from "express";
import { body, param, validationResult } from "express-validator";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { testConnection, closePool } from './database/connection';
import * as userQueries from './database/queries';
import { User, CreateUserRequest, UpdateUserRequest, ApiError, CreateLogData } from './models/types';

// Crear una nueva app de Express
const app = express();

// Puerto
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// Probar conexión a la base de datos al iniciar
testConnection().catch((error) => {
  console.error('❌ No se pudo conectar a la base de datos:', error);
  process.exit(1);
});

// Configuración de Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Usuarios con PostgreSQL',
      version: '1.0.0',
      description: 'Una API REST completa para gestionar usuarios con PostgreSQL y Docker',
      contact: {
        name: 'Desarrollador',
        email: 'developer@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Servidor de desarrollo'
      }
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          required: ['id', 'name', 'email', 'created_at'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único del usuario',
              example: 1
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Nombre del usuario',
              example: 'Juan Pérez'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email del usuario',
              example: 'juan@example.com'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación del usuario',
              example: '2024-01-01T10:00:00.000Z'
            }
          }
        },
        CreateUserRequest: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Nombre del usuario',
              example: 'Juan Pérez'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email del usuario',
              example: 'juan@example.com'
            }
          }
        },
        UpdateUserRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Nombre del usuario',
              example: 'Juan Pérez'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email del usuario',
              example: 'juan@example.com'
            }
          }
        },
        Log: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID único del log',
              example: 1
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp del request',
              example: '2024-01-01T10:00:00.000Z'
            },
            method: {
              type: 'string',
              description: 'Método HTTP',
              example: 'GET'
            },
            path: {
              type: 'string',
              description: 'Ruta del endpoint',
              example: '/users'
            },
            status_code: {
              type: 'integer',
              description: 'Código de estado HTTP',
              example: 200
            },
            response_time: {
              type: 'integer',
              description: 'Tiempo de respuesta en milisegundos',
              example: 25
            },
            ip_address: {
              type: 'string',
              description: 'Dirección IP del cliente',
              example: '192.168.1.100'
            },
            user_agent: {
              type: 'string',
              description: 'User Agent del navegador',
              example: 'Mozilla/5.0...'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación del log',
              example: '2024-01-01T10:00:00.000Z'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              oneOf: [
                { $ref: '#/components/schemas/User' },
                { type: 'array', items: { $ref: '#/components/schemas/User' } }
              ]
            },
            message: {
              type: 'string',
              example: 'Operación exitosa'
            },
            total: {
              type: 'integer',
              description: 'Total de elementos (solo para listas)',
              example: 10
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: 'Mensaje de error'
            },
            details: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Detalles adicionales del error'
            }
          }
        }
      }
    }
  },
  apis: ['./server.ts']
};

const specs = swaggerJSDoc(swaggerOptions);

// Configurar Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'API de Usuarios - Documentación'
}));

// Middleware para logging con almacenamiento en PostgreSQL
const logger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log inmediato en consola
  console.log(`${timestamp} - ${req.method} ${req.path}`);
  
  // Capturar información del request
  const method = req.method;
  const path = req.originalUrl || req.path;
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  
  // Interceptar el final de la respuesta para obtener status code y tiempo
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Guardar log en PostgreSQL (asíncrono, no bloquea la respuesta)
    const logData: CreateLogData = {
      timestamp,
      method,
      path,
      statusCode,
      responseTime,
      ipAddress,
      userAgent
    };
    
    userQueries.createLog(logData).catch((error) => {
      console.error('Error al guardar log en BD:', error);
    });
    
    // Llamar al send original
    return originalSend.call(this, data);
  };
  
  next();
};

app.use(logger);

// Middleware para manejo de errores de validación
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const apiError: ApiError = {
      success: false,
      error: "Datos de entrada inválidos",
      details: errors.array().map(err => err.msg)
    };
    res.status(400).json(apiError);
    return;
  }
  next();
};

// Validaciones
const createUserValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Debe proporcionar un email válido')
    .custom(async (email: string) => {
      try {
        const existingUser = await userQueries.getUserByEmail(email);
        if (existingUser) {
          throw new Error('El email ya está registrado');
        }
        return true;
      } catch (error) {
        throw error;
      }
    })
];

const updateUserValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Debe proporcionar un email válido')
];

const getUserByIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID debe ser un número entero positivo')
];

// Routes con documentación Swagger

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Obtiene todos los usuarios
 *     tags: [Usuarios]
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 total:
 *                   type: integer
 *                   example: 2
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get("/users", async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await userQueries.getAllUsers();
    res.json({
      success: true,
      data: users,
      total: users.length
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los usuarios'
    });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Obtiene un usuario por ID
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get("/users/:id", 
  getUserByIdValidation,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const user = await userQueries.getUserById(id);
      
      if (!user) {
        res.status(404).json({ 
          success: false,
          error: "Usuario no encontrado" 
        });
        return;
      }
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener el usuario'
      });
    }
  }
);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Crea un nuevo usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *                   example: Usuario creado exitosamente
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post("/users",
  createUserValidation,
  handleValidationErrors,
  async (req: Request<{}, {}, CreateUserRequest>, res: Response): Promise<void> => {
    try {
      const { name, email } = req.body;
      
      const newUser = await userQueries.createUser(name.trim(), email.toLowerCase());
      
      res.status(201).json({
        success: true,
        data: newUser,
        message: "Usuario creado exitosamente"
      });
    } catch (error: any) {
      console.error('Error al crear usuario:', error);
      
      if (error.code === '23505') { // PostgreSQL unique constraint error
        res.status(400).json({
          success: false,
          error: 'El email ya está registrado'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Error al crear el usuario'
        });
      }
    }
  }
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Actualiza un usuario existente
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *                   example: Usuario actualizado exitosamente
 *       400:
 *         description: Datos inválidos o email ya existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.put("/users/:id",
  getUserByIdValidation,
  updateUserValidation,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const { name, email } = req.body;
      
      // Verificar si el usuario existe
      const existingUser = await userQueries.getUserById(id);
      if (!existingUser) {
        res.status(404).json({ 
          success: false,
          error: "Usuario no encontrado" 
        });
        return;
      }
      
      // Verificar si el email ya existe en otro usuario
      if (email) {
        const emailExists = await userQueries.getUserByEmail(email);
        if (emailExists && emailExists.id !== id) {
          res.status(400).json({
            success: false,
            error: "El email ya está registrado por otro usuario"
          });
          return;
        }
      }
      
      // Preparar updates
      const updates: Partial<Pick<User, 'name' | 'email'>> = {};
      if (name !== undefined) updates.name = name.trim();
      if (email !== undefined) updates.email = email.toLowerCase();
      
      if (Object.keys(updates).length === 0) {
        res.status(400).json({
          success: false,
          error: 'Debe proporcionar al menos un campo para actualizar'
        });
        return;
      }
      
      const updatedUser = await userQueries.updateUser(id, updates);
      
      res.json({
        success: true,
        data: updatedUser,
        message: "Usuario actualizado exitosamente"
      });
    } catch (error: any) {
      console.error('Error al actualizar usuario:', error);
      
      if (error.code === '23505') { // PostgreSQL unique constraint error
        res.status(400).json({
          success: false,
          error: 'El email ya está registrado'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Error al actualizar el usuario'
        });
      }
    }
  }
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Elimina un usuario
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Usuario eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *                   example: Usuario eliminado exitosamente
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.delete("/users/:id",
  getUserByIdValidation,
  handleValidationErrors,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Number(req.params.id);
      
      const deletedUser = await userQueries.deleteUser(id);
      
      if (!deletedUser) {
        res.status(404).json({ 
          success: false,
          error: "Usuario no encontrado" 
        });
        return;
      }
      
      res.json({
        success: true,
        data: deletedUser,
        message: "Usuario eliminado exitosamente"
      });
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      res.status(500).json({
        success: false,
        error: 'Error al eliminar el usuario'
      });
    }
  }
);

/**
 * @swagger
 * /logs:
 *   get:
 *     summary: Obtiene los logs de la aplicación
 *     tags: [Logs]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: Número máximo de logs a retornar
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [GET, POST, PUT, DELETE]
 *         description: Filtrar por método HTTP
 *     responses:
 *       200:
 *         description: Lista de logs obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Log'
 *                 total:
 *                   type: integer
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get("/logs", async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const method = req.query.method as string;
    
    const logs = await userQueries.getAllLogs(limit, method);
    
    res.json({
      success: true,
      data: logs,
      total: logs.length
    });
  } catch (error) {
    console.error('Error al obtener logs:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener los logs'
    });
  }
});

// Ruta para servir la especificación OpenAPI en JSON
app.get('/api-docs.json', (req: Request, res: Response): void => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// Middleware para rutas no encontradas
app.use((req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: "Ruta no encontrada"
  });
});

// Middleware global de manejo de errores
app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    error: "Error interno del servidor"
  });
});

// Manejo de cierre graceful de la base de datos
process.on('SIGINT', () => {
  console.log('\n🔄 Cerrando servidor...');
  closePool().finally(() => {
    process.exit(0);
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`🐘 Base de datos: PostgreSQL`);
  console.log(`📚 Documentación Swagger disponible en: http://localhost:${PORT}/api-docs`);
  console.log(`📋 Endpoints disponibles:`);
  console.log(`  GET    /users     - Obtener todos los usuarios`);
  console.log(`  GET    /users/:id - Obtener usuario por ID`);
  console.log(`  POST   /users     - Crear nuevo usuario`);
  console.log(`  PUT    /users/:id - Actualizar usuario`);
  console.log(`  DELETE /users/:id - Eliminar usuario`);
  console.log(`  GET    /logs      - Obtener logs de la aplicación`);
});

export default app;
