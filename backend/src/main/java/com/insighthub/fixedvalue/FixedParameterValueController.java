package com.insighthub.fixedvalue;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FixedParameterValueController {

    private final FixedParameterValueService fixedParameterValueService;

    @GetMapping("/parameters/{paramId}/fixed-values")
    public ResponseEntity<List<FixedParameterValueDto>> getFixedValuesForParameter(
            @PathVariable Long paramId) {
        return ResponseEntity.ok(fixedParameterValueService.getFixedValuesForParameter(paramId));
    }

    @PostMapping("/parameters/{paramId}/fixed-values")
    public ResponseEntity<FixedParameterValueDto> setFixedValue(
            @PathVariable Long paramId,
            @RequestBody SetFixedValueRequest request) {
        FixedParameterValueDto dto = fixedParameterValueService.setFixedValue(
                paramId, request.userId(), request.fixedValue());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @DeleteMapping("/fixed-values/{id}")
    public ResponseEntity<Void> deleteFixedValue(@PathVariable Long id) {
        fixedParameterValueService.deleteFixedValue(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/users/{userId}/fixed-values")
    public ResponseEntity<List<FixedParameterValueDto>> getFixedValuesForUser(
            @PathVariable Long userId) {
        return ResponseEntity.ok(fixedParameterValueService.getFixedValuesForUser(userId));
    }

    /**
     * Request body for setting a fixed parameter value.
     */
    public record SetFixedValueRequest(Long userId, String fixedValue) {}
}
