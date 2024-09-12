# backend/Dockerfile
FROM node:20

# Set the working directory
WORKDIR /app

# Copy package.json and yarn.lock
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install
RUN npm install -g typescript

# Copy the rest of the application code
COPY . ./

# Compile TypeScript files to JavaScript
RUN tsc

# Command to run the application
CMD ["node", "./bin/app.js"]  # Ensure this matches the path to your compiled entry file
