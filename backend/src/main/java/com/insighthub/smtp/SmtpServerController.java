package com.insighthub.smtp;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/smtp-servers")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('configure_settings') or hasRole('ADMIN')")
public class SmtpServerController {

    private final SmtpServerService smtpServerService;

    @GetMapping
    public ResponseEntity<List<SmtpServerEntity>> getAllActive() {
        return ResponseEntity.ok(smtpServerService.getAllActive());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SmtpServerEntity> getById(@PathVariable Long id) {
        return ResponseEntity.ok(smtpServerService.getById(id));
    }

    @PostMapping
    public ResponseEntity<SmtpServerEntity> create(@RequestBody SmtpServerEntity entity) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(smtpServerService.create(entity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SmtpServerEntity> update(
            @PathVariable Long id,
            @RequestBody SmtpServerEntity entity) {
        return ResponseEntity.ok(smtpServerService.update(id, entity));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        smtpServerService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
