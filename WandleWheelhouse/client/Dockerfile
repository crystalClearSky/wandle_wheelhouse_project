# Location: client/Dockerfile

# --- Stage 1: Build React App ---
FROM node:20-alpine AS build

# Set working directory inside the build stage
WORKDIR /app

# Copy package files FROM THE CLIENT SUBDIRECTORY in the build context
# *** CORRECTED PATHS HERE ***
COPY client/package.json client/package-lock.json* ./

# Use npm ci for cleaner installs
RUN npm ci

# Copy the rest of the CLIENT application source code
# *** CORRECTED PATH HERE ***
COPY client/. .

# Define build-time argument for API origin
ARG VITE_API_ORIGIN
ENV VITE_API_ORIGIN=${VITE_API_ORIGIN}

# Build the application for production
RUN npm run build

# --- Stage 2: Serve Static Files with Nginx ---
FROM nginx:stable-alpine

# Copy the custom Nginx configuration FROM THE CLIENT SUBDIRECTORY
# *** CORRECTED PATH HERE (assuming nginx.conf is in client/) ***
COPY client/nginx.conf /etc/nginx/nginx.conf

# Copy the built static files from the build stage to Nginx's web root
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 (Nginx's default HTTP port)
EXPOSE 80

# Command to run Nginx in the foreground when the container starts
CMD ["nginx", "-g", "daemon off;"]