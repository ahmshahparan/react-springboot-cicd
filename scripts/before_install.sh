#!/bin/bash
set -e

echo "Running before_install.sh..."

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    yum update -y
    amazon-linux-extras install docker -y || yum install docker -y
    service docker start
    usermod -a -G docker ec2-user
    chkconfig docker on
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose || true
fi

# Clean up previous deployment directory
if [ -d "/home/ec2-user/app" ]; then
    echo "Cleaning up previous deployment..."
    cd /home/ec2-user/app
    docker-compose down || true
    rm -rf /home/ec2-user/app/*
fi

mkdir -p /home/ec2-user/app
echo "before_install.sh completed."
