package com.demo.cicd.model;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class HealthResponse {
    private String status;
    private String service;
    private String version;
    private String timestamp;
    private String environment;
    private String database;
    private long dbItemCount;

    public HealthResponse() {
        this.status = "UP";
        this.service = "cicd-backend";
        this.version = "1.0.0";
        this.timestamp = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        this.environment = System.getenv("APP_ENV") != null ? System.getenv("APP_ENV") : "production";
        this.database = "MySQL (AWS RDS)";
        this.dbItemCount = 0;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getService() { return service; }
    public void setService(String service) { this.service = service; }

    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public String getEnvironment() { return environment; }
    public void setEnvironment(String environment) { this.environment = environment; }

    public String getDatabase() { return database; }
    public void setDatabase(String database) { this.database = database; }

    public long getDbItemCount() { return dbItemCount; }
    public void setDbItemCount(long dbItemCount) { this.dbItemCount = dbItemCount; }
}
