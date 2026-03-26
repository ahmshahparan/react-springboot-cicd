#!/bin/bash
set -e

echo "Running start_server.sh..."

cd /home/ec2-user/app

# Stop and remove any existing containers (clean slate for the new deployment)
echo "Stopping existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Pull the MySQL image if not already cached (saves time on subsequent deploys)
echo "Pulling MySQL 8.0 image..."
docker pull mysql:8.0 2>/dev/null || true

# Build the backend and frontend Docker images, then start all three containers:
#   1. cicd-mysql   — MySQL 8.0 database
#   2. cicd-backend — Spring Boot app (waits for MySQL to be healthy)
#   3. cicd-frontend — React/Nginx (waits for backend to be healthy)
echo "Building images and starting all containers..."
docker-compose up -d --build

echo "start_server.sh completed. Containers are starting in the background."
echo "MySQL will initialize first, then Spring Boot will connect and create tables."
