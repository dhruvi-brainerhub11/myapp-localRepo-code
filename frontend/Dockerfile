# Production Dockerfile using serve
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and public files
COPY src ./src
COPY public ./public

# Build React app
RUN npm run build

# Install serve globally
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Serve the build folder on port 3000
CMD ["serve", "-s", "build", "-l", "3000"]