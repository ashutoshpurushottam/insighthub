package com.insighthub.datasource;

import com.insighthub.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.List;
import java.util.Properties;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DatasourceService {

    private static final Logger log = LoggerFactory.getLogger(DatasourceService.class);

    private final DatasourceRepository datasourceRepository;

    public List<DatasourceDto> getAllDatasources() {
        return datasourceRepository.findAll().stream()
            .map(this::toDto)
            .toList();
    }

    public DatasourceDto getDatasourceById(Long id) {
        return datasourceRepository.findById(id)
            .map(this::toDto)
            .orElseThrow(() -> new ResourceNotFoundException("Datasource", "id", id));
    }

    @Transactional
    public DatasourceDto createDatasource(CreateDatasourceRequest request, String createdBy) {
        if (datasourceRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Datasource already exists: " + request.getName());
        }

        DatasourceEntity entity = DatasourceEntity.builder()
            .name(request.getName())
            .description(request.getDescription())
            .datasourceType(request.getDatasourceType())
            .databaseType(request.getDatabaseType())
            .driver(request.getDriver())
            .url(request.getUrl())
            .username(request.getUsername())
            .password(request.getPassword())
            .testSql(request.getTestSql())
            .active(request.isActive())
            .createdBy(createdBy)
            .build();

        return toDto(datasourceRepository.save(entity));
    }

    @Transactional
    public DatasourceDto updateDatasource(Long id, UpdateDatasourceRequest request, String updatedBy) {
        DatasourceEntity entity = datasourceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Datasource", "id", id));

        if (request.getName() != null) entity.setName(request.getName());
        if (request.getDescription() != null) entity.setDescription(request.getDescription());
        if (request.getDatasourceType() != null) entity.setDatasourceType(request.getDatasourceType());
        if (request.getDatabaseType() != null) entity.setDatabaseType(request.getDatabaseType());
        if (request.getDriver() != null) entity.setDriver(request.getDriver());
        if (request.getUrl() != null) entity.setUrl(request.getUrl());
        if (request.getUsername() != null) entity.setUsername(request.getUsername());
        if (request.getPassword() != null) entity.setPassword(request.getPassword());
        if (request.getTestSql() != null) entity.setTestSql(request.getTestSql());
        if (request.getActive() != null) entity.setActive(request.getActive());
        entity.setUpdatedBy(updatedBy);

        return toDto(datasourceRepository.save(entity));
    }

    @Transactional
    public void deleteDatasource(Long id) {
        if (!datasourceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Datasource", "id", id);
        }
        datasourceRepository.deleteById(id);
    }

    /**
     * Test a datasource connection by executing the test SQL.
     */
    public TestConnectionResult testConnection(Long id) {
        DatasourceEntity ds = datasourceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Datasource", "id", id));

        return testConnection(ds.getUrl(), ds.getUsername(), ds.getPassword(),
            ds.getDriver(), ds.getTestSql());
    }

    /**
     * Test a connection with provided parameters (for testing before save).
     */
    public TestConnectionResult testConnection(String url, String username, String password,
                                                String driver, String testSql) {
        long start = System.currentTimeMillis();
        try {
            if (driver != null && !driver.isBlank()) {
                Class.forName(driver);
            }

            Properties props = new Properties();
            if (username != null) props.put("user", username);
            if (password != null) props.put("password", password);

            try (Connection conn = DriverManager.getConnection(url, props)) {
                if (testSql != null && !testSql.isBlank()) {
                    try (Statement stmt = conn.createStatement()) {
                        stmt.execute(testSql);
                    }
                }
            }

            long elapsed = System.currentTimeMillis() - start;
            return new TestConnectionResult(true, "Connection successful (" + elapsed + "ms)", elapsed);
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - start;
            log.warn("Connection test failed: {}", e.getMessage());
            return new TestConnectionResult(false, e.getMessage(), elapsed);
        }
    }

    private DatasourceDto toDto(DatasourceEntity entity) {
        return DatasourceDto.builder()
            .id(entity.getId())
            .name(entity.getName())
            .description(entity.getDescription())
            .datasourceType(entity.getDatasourceType())
            .databaseType(entity.getDatabaseType())
            .driver(entity.getDriver())
            .url(entity.getUrl())
            .username(entity.getUsername())
            .active(entity.isActive())
            .testSql(entity.getTestSql())
            .createdAt(entity.getCreatedAt())
            .updatedAt(entity.getUpdatedAt())
            .build();
    }
}
