#!/bin/bash
# EC2 Setup Script — Run this on a fresh Amazon Linux 2 instance
# Usage: sudo bash ec2_setup.sh

set -e
echo "=== EC2 Setup for React + Spring Boot CI/CD Demo ==="

# Update system
echo "[1/5] Updating system packages..."
yum update -y

# Install CodeDeploy Agent
echo "[2/5] Installing AWS CodeDeploy Agent..."
yum install -y ruby wget
REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)
cd /home/ec2-user
wget https://aws-codedeploy-${REGION}.s3.${REGION}.amazonaws.com/latest/install
chmod +x ./install
./install auto
service codedeploy-agent start
chkconfig codedeploy-agent on
echo "CodeDeploy Agent status: $(service codedeploy-agent status)"

# Install Docker
echo "[3/5] Installing Docker..."
amazon-linux-extras install docker -y 2>/dev/null || yum install docker -y
service docker start
usermod -a -G docker ec2-user
chkconfig docker on

# Install Docker Compose
echo "[4/5] Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Verify installations
echo "[5/5] Verifying installations..."
echo "Docker version: $(docker --version)"
echo "Docker Compose version: $(docker-compose --version)"
echo "CodeDeploy Agent: $(service codedeploy-agent status | head -1)"

echo ""
echo "=== EC2 Setup Complete ==="
echo "Instance is ready for CodeDeploy deployments."
