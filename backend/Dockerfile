# ─── Runtime Image (uses pre-built JAR from CodeBuild) ───────────────────────
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy the pre-built JAR (produced by CodeBuild's mvn package)
COPY cicd-backend.jar app.jar

# Change ownership
RUN chown appuser:appgroup app.jar
USER appuser

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

ENTRYPOINT ["java", "-jar", "-Djava.security.egd=file:/dev/./urandom", "app.jar"]
