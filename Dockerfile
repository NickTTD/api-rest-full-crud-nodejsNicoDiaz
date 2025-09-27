# Usar imagen base de Node.js
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies)
RUN npm install

# Copiar el código fuente
COPY . .

# Exponer el puerto
EXPOSE 3000

# Comando para ejecutar la aplicación directamente con ts-node
CMD ["npx", "ts-node", "server.ts"]
