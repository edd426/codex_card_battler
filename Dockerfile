FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY server/package*.json ./

# Install dependencies
RUN npm install

# Copy server files
COPY server/src ./src
COPY server/public ./public
COPY server/scripts ./scripts
COPY server/src/cards.json ./src/
COPY server/jest.config.js ./

# Expose the application port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]