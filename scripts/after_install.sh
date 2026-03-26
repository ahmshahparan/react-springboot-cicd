#!/bin/bash
set -e

echo "Running after_install.sh..."

cd /home/ec2-user/app

# Ensure correct permissions on all deployed files
chown -R ec2-user:ec2-user /home/ec2-user/app
chmod -R 755 /home/ec2-user/app/scripts

# Verify Docker and Docker Compose are available
if ! command -v docker &>/dev/null; then
    echo "ERROR: Docker is not installed. Please run the EC2 setup script first."
    exit 1
fi

if ! command -v docker-compose &>/dev/null; then
    echo "ERROR: docker-compose is not installed. Please run the EC2 setup script first."
    exit 1
fi

echo "Docker version: $(docker --version)"
echo "Docker Compose version: $(docker-compose --version)"
echo "after_install.sh completed."
