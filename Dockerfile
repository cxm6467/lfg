# Use a Node.js base image
FROM node:20

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install dependencies, including ts-node locally
RUN npm install
RUN npm i -g ts-node

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port that your application listens on
EXPOSE 3000

# Run the handler function in the app.ts file
CMD ["npx", "ts-node", "app.ts"]