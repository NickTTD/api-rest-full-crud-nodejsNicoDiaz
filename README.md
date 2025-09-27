# API Rest full CRUD

A REST API for user management, using **Node.js**, **TypeScript**, **PostgreSQL**, and **Docker**.

Original https://github.com/erneledesma/api-rest-full-crud-nodejs

Modificado por Díaz Nicolás para TP6 Programación Avanzada
## Features

- Full CRUD operations for users  
- PostgreSQL database -> persistence  
- Logging system stored in the database  
- Swagger documentation  
- Data validation with express-validator  
- Docker Compose for development  
- TypeScript for static typing

## Prerequisites

- Docker and Docker Compose  
- Node.js (optional, for local development)

## Installation & Usage

### With Docker (Recommended)

```bash
# Clone the repository
git clone <your-repository>
cd api-rest-full-nodejs

# Start containers
npm run docker:up

# Stop containers 
npm run docker:down

# View logs (optional)
npm run docker:logs

# Nodemon dev
npm run dev

# Compile TS          
npm run build

# Run compiled version
npm start

# Rebuild containers
npm run docker:rebuild
