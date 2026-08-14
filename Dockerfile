# Use official lightweight Node.js LTS image
FROM node:20-slim

# Install system dependencies for Puppeteer & Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Environment variables for Puppeteer inside Docker
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PORT=5000
ENV NODE_ENV=production

# Create app directory
WORKDIR /app

# Copy package configurations
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install root, backend, and frontend dependencies
RUN npm run setup

# Copy the rest of the application source code
COPY . .

# Build the frontend production assets
WORKDIR /app/frontend
RUN npm run build

# Return to root workdir
WORKDIR /app

# Expose API and frontend dashboard port
EXPOSE 5000

# Start Express server (which automatically serves the compiled frontend)
CMD ["npm", "start"]
