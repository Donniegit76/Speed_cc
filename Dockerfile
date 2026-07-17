# Use a secure and lightweight Node base image
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy dependency configs
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy application code files
COPY server.js ./
COPY index.html ./
COPY styles.css ./
COPY app.js ./
COPY favicon.png ./

# Create data directory for volume mount persistence
RUN mkdir -p /usr/src/app/data

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV DATABASE_PATH=/usr/src/app/data/database.json

# Run server
CMD ["node", "server.js"]
