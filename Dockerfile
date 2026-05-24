# Use the official Node.js 24 LTS lightweight image
FROM node:24-alpine

# Create the application working folder inside the container
WORKDIR /app

# Run the application in production mode
ENV NODE_ENV=production

# Copy package files first so dependencies can be installed
COPY package*.json ./

# Install only the dependencies needed to run the application
RUN npm ci --omit=dev

# Copy the application files into the container
COPY app.js server.js ./
COPY public ./public

# The application runs on port 3000
EXPOSE 3000

# Docker checks whether the application is running correctly
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(response => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

# Run as the existing non-root Node user for safer execution
USER node

# Start the ScamShield application
CMD ["node", "server.js"]