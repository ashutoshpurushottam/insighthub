package com.insighthub.smtp;

import com.insighthub.common.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SmtpServerServiceTest {

    @Mock
    private SmtpServerRepository smtpServerRepository;

    @InjectMocks
    private SmtpServerService service;

    private SmtpServerEntity testServer;

    @BeforeEach
    void setUp() {
        testServer = SmtpServerEntity.builder()
                .id(1L)
                .name("Primary SMTP")
                .description("Primary email server")
                .active(true)
                .server("smtp.example.com")
                .port(587)
                .useStarttls(true)
                .useAuth(true)
                .username("user@example.com")
                .password("secret")
                .fromAddress("noreply@example.com")
                .build();
    }

    // ==================== getAllActive tests ====================

    @Test
    void getAllActive_returnsActiveServers() {
        when(smtpServerRepository.findByActiveTrue()).thenReturn(List.of(testServer));

        List<SmtpServerEntity> result = service.getAllActive();

        assertEquals(1, result.size());
        assertEquals("Primary SMTP", result.get(0).getName());
        verify(smtpServerRepository).findByActiveTrue();
    }

    @Test
    void getAllActive_returnsEmptyList_whenNoActiveServers() {
        when(smtpServerRepository.findByActiveTrue()).thenReturn(List.of());

        List<SmtpServerEntity> result = service.getAllActive();

        assertTrue(result.isEmpty());
    }

    // ==================== getById tests ====================

    @Test
    void getById_returnsServer_whenExists() {
        when(smtpServerRepository.findById(1L)).thenReturn(Optional.of(testServer));

        SmtpServerEntity result = service.getById(1L);

        assertEquals("Primary SMTP", result.getName());
        assertEquals("smtp.example.com", result.getServer());
    }

    @Test
    void getById_throwsResourceNotFoundException_whenNotFound() {
        when(smtpServerRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.getById(999L));
    }

    // ==================== create tests ====================

    @Test
    void create_savesAndReturnsServer() {
        when(smtpServerRepository.save(any(SmtpServerEntity.class))).thenReturn(testServer);

        SmtpServerEntity result = service.create(testServer);

        assertEquals("Primary SMTP", result.getName());
        verify(smtpServerRepository).save(testServer);
    }

    // ==================== update tests ====================

    @Test
    void update_updatesAllFields_whenServerExists() {
        SmtpServerEntity updatedData = SmtpServerEntity.builder()
                .name("Updated SMTP")
                .description("Updated description")
                .active(false)
                .server("smtp2.example.com")
                .port(465)
                .useStarttls(false)
                .useAuth(false)
                .username("newuser@example.com")
                .password("newpassword")
                .fromAddress("new@example.com")
                .build();

        when(smtpServerRepository.findById(1L)).thenReturn(Optional.of(testServer));
        when(smtpServerRepository.save(any(SmtpServerEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        SmtpServerEntity result = service.update(1L, updatedData);

        assertEquals("Updated SMTP", result.getName());
        assertEquals("Updated description", result.getDescription());
        assertFalse(result.isActive());
        assertEquals("smtp2.example.com", result.getServer());
        assertEquals(465, result.getPort());
        assertFalse(result.isUseStarttls());
        assertFalse(result.isUseAuth());
        assertEquals("newuser@example.com", result.getUsername());
        assertEquals("newpassword", result.getPassword());
        assertEquals("new@example.com", result.getFromAddress());
    }

    @Test
    void update_throwsResourceNotFoundException_whenNotFound() {
        SmtpServerEntity updatedData = SmtpServerEntity.builder().name("New Name").build();
        when(smtpServerRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.update(999L, updatedData));
    }

    // ==================== delete tests ====================

    @Test
    void delete_deletesSuccessfully_whenExists() {
        when(smtpServerRepository.existsById(1L)).thenReturn(true);

        service.delete(1L);

        verify(smtpServerRepository).deleteById(1L);
    }

    @Test
    void delete_throwsResourceNotFoundException_whenNotFound() {
        when(smtpServerRepository.existsById(999L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> service.delete(999L));
    }
}
