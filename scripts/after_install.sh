#!/bin/bash
set -e

echo "Running after_install.sh..."

cd /home/ec2-user/app

# Ensure correct permissions
chown -R ec2-user:ec2-user /home/ec2-user/app
chmod -R 755 /home/ec2-user/app/scripts

echo "after_install.sh completed."
