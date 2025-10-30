import express, {} from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import easypayRoutes from './routes/easypay.js';
import applicationsRoutes from './routes/applications.js';
import geckosRoutes from './routes/geckos.js';
import categoriesRoutes from './routes/categories.js';
import settingsRoutes from './routes/settings.js';
// Import database initialization
import { initializeDatabase } from './database/init.js';
// Load environment variables
dotenv.config({ path: './config.env' });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 5000;
// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'EasyPay API',
            version: '1.0.0',
            description: 'API documentation for EasyPay client management system',
            contact: {
                name: 'API Support',
                email: 'support@easypay.com'
            }
        },
        servers: [
            {
                url: `http://localhost:${PORT}/api`,
                description: 'Development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    },
    apis: ['./src/routes/*.ts', './src/models/*.ts']
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        // Allow all localhost ports for development
        if (origin.match(/^http:\/\/localhost:\d+$/)) {
            return callback(null, true);
        }
        // Allow specific production domains
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            process.env.FRONTEND_URL2,
            process.env.FRONTEND_URL3,
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3015',
            'http://localhost:3016',
            'http://localhost:3017',
            'http://localhost:3018',
            'http://localhost:3019',
            'http://localhost:3020',
            'http://localhost:5173',
            'http://localhost:5174'
        ].filter(Boolean);
        // Allow Vercel preview and production deployments (*.vercel.app)
        const isVercel = !!origin && /^https:\/\/([a-z0-9-]+)\.vercel\.app$/i.test(origin);
        if (isVercel || (origin && allowedOrigins.includes(origin))) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/easypay', easypayRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/geckos', geckosRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/settings', settingsRoutes);
// Serve static files (for EasyPay data)
app.use('/data', express.static(path.join(__dirname, '../data')));
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error Stack:', err.stack);
    console.error('Error Details:', {
        message: err.message,
        status: err.status || err.statusCode || 500,
        url: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    // Handle different types of errors
    let statusCode = err.status || err.statusCode || 500;
    let message = 'Something went wrong!';
    let details = null;
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        statusCode = 422;
        message = 'Validation failed';
        details = Object.values(err.errors).map((error) => ({
            field: error.path,
            message: error.message
        }));
    }
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }
    // Database errors
    if (err.code === 'SQLITE_CONSTRAINT') {
        statusCode = 409;
        message = 'Database constraint violation';
    }
    if (err.code === 'SQLITE_BUSY') {
        statusCode = 503;
        message = 'Database is busy, please try again';
    }
    // Custom application errors
    if (err.isOperational) {
        statusCode = err.statusCode || 400;
        message = err.message;
        details = err.details;
    }
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(statusCode).json({
        error: message,
        message: isDevelopment ? err.message : undefined,
        details: isDevelopment ? details : undefined,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method
    });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});
// Initialize database and start server
async function startServer() {
    try {
        await initializeDatabase();
        console.log('Database initialized successfully');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
            console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map