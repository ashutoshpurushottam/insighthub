package com.insighthub.parameter;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ParameterController {

    private final ParameterService parameterService;

    @GetMapping("/reports/{reportId}/parameters")
    public ResponseEntity<List<ParameterDto>> getParametersForReport(@PathVariable Long reportId) {
        return ResponseEntity.ok(parameterService.getParametersForReport(reportId));
    }

    @GetMapping("/parameters/{id}")
    public ResponseEntity<ParameterDto> getParameterById(@PathVariable Long id) {
        return ResponseEntity.ok(parameterService.getParameterById(id));
    }

    @PostMapping("/reports/{reportId}/parameters")
    public ResponseEntity<ParameterDto> createParameter(
            @PathVariable Long reportId,
            @Valid @RequestBody ParameterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(parameterService.createParameter(reportId, request));
    }

    @PutMapping("/parameters/{id}")
    public ResponseEntity<ParameterDto> updateParameter(
            @PathVariable Long id,
            @Valid @RequestBody ParameterRequest request) {
        return ResponseEntity.ok(parameterService.updateParameter(id, request));
    }

    @DeleteMapping("/parameters/{id}")
    public ResponseEntity<Void> deleteParameter(@PathVariable Long id) {
        parameterService.deleteParameter(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/parameters/{id}/lov")
    public ResponseEntity<LovResult> getParameterLov(
            @PathVariable Long id,
            @RequestParam(required = false) String parentValue) {
        return ResponseEntity.ok(parameterService.resolveLov(id, parentValue));
    }
}
