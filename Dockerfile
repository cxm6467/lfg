# Use a Node.js base image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Remove node_modules folder if it exists
RUN npm cache clean --force
RUN rm -rf node_modules

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install dependencies, including ts-node locally
RUN npm install
RUN npm i -g ts-node

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port that your application listens on
EXPOSE 3000

ENV FORCE_COLOR=1

# Run the handler function in the app.ts file
CMD ["npx", "ts-node", "app.ts"]
