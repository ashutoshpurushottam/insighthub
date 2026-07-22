package com.insighthub.datasource;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/datasources")
@RequiredArgsConstructor
public class DatasourceController {

    private final DatasourceService datasourceService;

    @GetMapping
    public ResponseEntity<List<DatasourceDto>> getAllDatasources() {
        return ResponseEntity.ok(datasourceService.getAllDatasources());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DatasourceDto> getDatasourceById(@PathVariable Long id) {
        return ResponseEntity.ok(datasourceService.getDatasourceById(id));
    }

    @PostMapping
    public ResponseEntity<DatasourceDto> createDatasource(
            @Valid @RequestBody CreateDatasourceRequest request,
            @AuthenticationPrincipal UserDetails currentUser) {
        DatasourceDto ds = datasourceService.createDatasource(request, currentUser.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(ds);
    }

    @PutMapping("/{id}")
    public ResponseEntity<DatasourceDto> updateDatasource(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDatasourceRequest request,
            @AuthenticationPrincipal UserDetails currentUser) {
        return ResponseEntity.ok(datasourceService.updateDatasource(id, request, currentUser.getUsername()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDatasource(@PathVariable Long id) {
        datasourceService.deleteDatasource(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/test")
    public ResponseEntity<TestConnectionResult> testConnection(@PathVariable Long id) {
        return ResponseEntity.ok(datasourceService.testConnection(id));
    }

    @PostMapping("/test")
    public ResponseEntity<TestConnectionResult> testConnectionDirect(
            @RequestBody TestConnectionRequest request) {
        return ResponseEntity.ok(datasourceService.testConnection(
            request.getUrl(), request.getUsername(), request.getPassword(),
            request.getDriver(), request.getTestSql()));
    }
}
