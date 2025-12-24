# Use official Playwright image for all-in-one dependency management
FROM mcr.microsoft.com/playwright:v1.49.0-noble

# Set working directory
WORKDIR /app

# Copy root package.json and install root dependencies
COPY package*.json ./
RUN npm install

# Copy everything else
COPY . .

# Build frontend
RUN npm run build

# Expose the port
EXPOSE 3011

# Start the application
CMD ["npm", "start"]
