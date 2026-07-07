package com.insighthub.config;

import java.sql.Connection;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("postgres")
public class DatabaseConnectionVerifier implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseConnectionVerifier.class);
    private static final int MAX_RETRIES = 3;
    private static final long RETRY_INTERVAL_MS = 5000;

    private final DataSource dataSource;

    public DatabaseConnectionVerifier(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                logger.info("Verifying database connectivity (attempt {}/{})", attempt, MAX_RETRIES);
                try (Connection connection = dataSource.getConnection()) {
                    logger.info("Database connection verified successfully on attempt {}", attempt);
                    return;
                }
            } catch (Exception e) {
                logger.warn("Database connection attempt {}/{} failed: {}", attempt, MAX_RETRIES, e.getMessage());
                if (attempt < MAX_RETRIES) {
                    try {
                        Thread.sleep(RETRY_INTERVAL_MS);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new RuntimeException("Database connection verification interrupted", ie);
                    }
                }
            }
        }

        logger.error("Database is unavailable after {} connection attempts", MAX_RETRIES);
        throw new RuntimeException("Database is unavailable after " + MAX_RETRIES + " connection attempts");
    }
}
