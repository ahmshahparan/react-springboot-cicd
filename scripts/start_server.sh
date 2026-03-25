#!/bin/bash
set -e

echo "Running start_server.sh..."

cd /home/ec2-user/app

# Pull latest images (if using ECR) or build locally
echo "Building and starting Docker containers..."
docker-compose up -d --build

echo "start_server.sh completed."
