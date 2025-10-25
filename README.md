# EasyPay Backend API

A Node.js backend API for the EasyPay client management system with Swagger documentation.

## Features

- **Authentication**: JWT-based authentication with login/register endpoints
- **User Management**: CRUD operations for users with admin controls
- **EasyPay Clients**: Full CRUD operations for EasyPay client data
- **Search & Pagination**: Advanced search and pagination for all entities
- **Swagger Documentation**: Interactive API documentation
- **Database**: SQLite database with automatic initialization
- **Security**: Helmet, CORS, input validation, and password hashing

## Tech Stack

- **Node.js** with **Express.js**
- **TypeScript** for type safety
- **SQLite3** for database
- **JWT** for authentication
- **Swagger** for API documentation
- **Joi** for request validation
- **bcryptjs** for password hashing

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment configuration:
```bash
cp config.env .env
```

4. Update the `.env` file with your configuration:
```env
NODE_ENV=development
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
DB_PATH=./data/database.sqlite
FRONTEND_URL=http://localhost:3000
```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## API Documentation

Once the server is running, you can access the Swagger documentation at:
- **Swagger UI**: http://localhost:5000/api-docs
- **Health Check**: http://localhost:5000/health

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Users (Admin Only)
- `GET /api/users` - Get all users (paginated)
- `GET /api/users/search` - Search users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### EasyPay Clients
- `GET /api/easypay/clients` - Get all clients (paginated)
- `GET /api/easypay/clients/search` - Search clients
- `GET /api/easypay/clients/:id` - Get client by ID
- `POST /api/easypay/clients` - Create new client
- `PUT /api/easypay/clients/:id` - Update client
- `DELETE /api/easypay/clients/:id` - Delete client
- `POST /api/easypay/import` - Import clients from JSON file

## Database

The application uses SQLite database with the following tables:

### Users Table
- `id` (INTEGER PRIMARY KEY)
- `name` (TEXT)
- `email` (TEXT UNIQUE)
- `password` (TEXT - hashed)
- `role` (TEXT - 'user' or 'admin')
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

### EasyPay Clients Table
- `id` (INTEGER PRIMARY KEY)
- `client_id` (TEXT UNIQUE)
- `display_name` (TEXT)
- `first_name` (TEXT)
- `last_name` (TEXT)
- `email` (TEXT)
- `phone` (TEXT)
- And many more fields matching the EasyPay client structure

## Default Admin User

A default admin user is created automatically:
- **Email**: admin@easypay.com
- **Password**: admin123

**Important**: Change the default password in production!

## Data Import

The API includes an endpoint to import EasyPay clients from the existing JSON file:
- `POST /api/easypay/import` - Imports all clients from `data/easypayClients.json`

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for secure password storage
- **Input Validation**: Joi schemas for request validation
- **CORS**: Configured for frontend communication
- **Helmet**: Security headers
- **Rate Limiting**: Built-in Express rate limiting

## Error Handling

The API includes comprehensive error handling:
- Validation errors (400)
- Authentication errors (401)
- Authorization errors (403)
- Not found errors (404)
- Server errors (500)

## Development

### Project Structure
```
backend/
├── src/
│   ├── database/
│   │   └── init.ts          # Database initialization
│   ├── middleware/
│   │   ├── auth.ts          # Authentication middleware
│   │   └── validation.ts    # Request validation
│   ├── routes/
│   │   ├── auth.ts          # Authentication routes
│   │   ├── users.ts         # User management routes
│   │   └── easypay.ts       # EasyPay client routes
│   └── server.ts            # Main server file
├── data/
│   └── database.sqlite      # SQLite database file
├── package.json
├── tsconfig.json
└── config.env               # Environment configuration
```

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## Frontend Integration

The backend is configured to work with the React frontend:
- CORS enabled for `http://localhost:3000`
- API base URL: `http://localhost:5000/api`
- JWT tokens for authentication
- Consistent data structures

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Configure proper CORS origins
4. Use a production database (PostgreSQL recommended)
5. Set up proper logging and monitoring
6. Use HTTPS
7. Implement rate limiting
8. Set up backup strategies

## License

MIT License

