# Step 1: Use Node.js image
FROM node:18-alpine AS builder

# Step 2: Set working directory
WORKDIR /app

# Step 3: Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Step 4: Copy the rest of your app and build it
COPY . .
RUN npm run build

# Step 5: Use Nginx to serve static build
FROM nginx:alpine

# Copy built files to Nginx public folder
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom Nginx config if needed
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
