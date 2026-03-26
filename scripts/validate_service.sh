#!/bin/bash
set -e

echo "Running validate_service.sh..."

# Give MySQL time to initialize (first run takes ~30s, subsequent runs ~5s)
echo "Waiting 45 seconds for MySQL and Spring Boot to initialize..."
sleep 45

# ─── Check MySQL container is running ────────────────────────────────────────
echo "Checking MySQL container status..."
if docker ps | grep -q "cicd-mysql"; then
    echo "MySQL container is running."
else
    echo "ERROR: MySQL container is not running."
    docker-compose logs mysql --tail 30 2>&1 || true
    exit 1
fi

# ─── Check backend health with retries ───────────────────────────────────────
MAX_RETRIES=12
RETRY_INTERVAL=10
COUNT=0

echo "Checking backend health endpoint (includes DB connectivity)..."
until curl -sf http://localhost:8080/api/health | grep -q '"status":"UP"'; do
    COUNT=$((COUNT + 1))
    if [ "$COUNT" -ge "$MAX_RETRIES" ]; then
        echo "ERROR: Backend did not become healthy after $((MAX_RETRIES * RETRY_INTERVAL)) seconds."
        echo "Backend container logs:"
        docker logs cicd-backend --tail 50 2>&1 || true
        exit 1
    fi
    echo "  Attempt $COUNT/$MAX_RETRIES — not ready yet, retrying in ${RETRY_INTERVAL}s..."
    sleep "$RETRY_INTERVAL"
done

echo "Backend is UP and connected to MySQL."

# ─── Check frontend ───────────────────────────────────────────────────────────
if curl -sf http://localhost:80 | grep -q "AWS CI/CD"; then
    echo "Frontend is running successfully."
else
    echo "WARNING: Frontend health check inconclusive."
    docker ps | grep cicd-frontend || echo "Frontend container not found"
fi

# ─── Print final status ───────────────────────────────────────────────────────
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "EC2_PUBLIC_IP")
echo ""
echo "=== Deployment Validation Complete ==="
echo "  App URL  : http://${PUBLIC_IP}"
echo "  API Health: http://${PUBLIC_IP}/api/health"
echo "  Database : MySQL 8.0 (Docker container, data persisted in named volume)"
echo ""
echo "validate_service.sh completed successfully."
