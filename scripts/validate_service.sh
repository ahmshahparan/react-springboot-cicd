#!/bin/bash
set -e

echo "Running validate_service.sh..."

# Wait for services to start
sleep 15

# Check if backend is running
if curl -s http://localhost:8080/api/health | grep -q "UP"; then
    echo "Backend is running successfully."
else
    echo "Backend failed to start."
    exit 1
fi

# Check if frontend is running
if curl -s http://localhost:80 | grep -q "React"; then
    echo "Frontend is running successfully."
else
    echo "Frontend failed to start."
    exit 1
fi

echo "validate_service.sh completed successfully."
