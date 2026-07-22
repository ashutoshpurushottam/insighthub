package com.insighthub.fixedvalue;

import com.insighthub.common.exception.ResourceNotFoundException;
import com.insighthub.parameter.ExpressionResolver;
import com.insighthub.parameter.ParameterEntity;
import com.insighthub.parameter.ParameterRepository;
import com.insighthub.report.ReportEntity;
import com.insighthub.user.UserEntity;
import com.insighthub.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FixedParameterValueServiceTest {

    @Mock
    private FixedParameterValueRepository fixedParameterValueRepository;

    @Mock
    private ParameterRepository parameterRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ExpressionResolver expressionResolver;

    @InjectMocks
    private FixedParameterValueService service;

    private UserEntity testUser;
    private ParameterEntity testParameter;
    private FixedParameterValueEntity testFixedValue;

    @BeforeEach
    void setUp() {
        testUser = UserEntity.builder()
                .id(1L)
                .username("admin")
                .build();

        ReportEntity report = ReportEntity.builder()
                .id(10L)
                .build();

        testParameter = ParameterEntity.builder()
                .id(100L)
                .name("start_date")
                .report(report)
                .build();

        testFixedValue = FixedParameterValueEntity.builder()
                .id(1000L)
                .user(testUser)
                .parameter(testParameter)
                .fixedValue("CURDATE()")
                .build();
    }

    // ==================== getFixedValuesForParameter tests ====================

    @Test
    void getFixedValuesForParameter_returnsListOfDtos() {
        when(fixedParameterValueRepository.findByParameterId(100L))
                .thenReturn(List.of(testFixedValue));

        List<FixedParameterValueDto> result = service.getFixedValuesForParameter(100L);

        assertEquals(1, result.size());
        FixedParameterValueDto dto = result.get(0);
        assertEquals(1000L, dto.id());
        assertEquals(1L, dto.userId());
        assertEquals("admin", dto.username());
        assertEquals(100L, dto.parameterId());
        assertEquals("start_date", dto.parameterName());
        assertEquals("CURDATE()", dto.fixedValue());
    }

    @Test
    void getFixedValuesForParameter_returnsEmptyList_whenNoFixedValues() {
        when(fixedParameterValueRepository.findByParameterId(999L))
                .thenReturn(List.of());

        List<FixedParameterValueDto> result = service.getFixedValuesForParameter(999L);

        assertTrue(result.isEmpty());
    }

    // ==================== getFixedValuesForUser tests ====================

    @Test
    void getFixedValuesForUser_returnsListOfDtos() {
        when(fixedParameterValueRepository.findByUserId(1L))
                .thenReturn(List.of(testFixedValue));

        List<FixedParameterValueDto> result = service.getFixedValuesForUser(1L);

        assertEquals(1, result.size());
        assertEquals("admin", result.get(0).username());
        assertEquals("start_date", result.get(0).parameterName());
    }

    @Test
    void getFixedValuesForUser_returnsEmptyList_whenNoFixedValues() {
        when(fixedParameterValueRepository.findByUserId(999L))
                .thenReturn(List.of());

        List<FixedParameterValueDto> result = service.getFixedValuesForUser(999L);

        assertTrue(result.isEmpty());
    }

    // ==================== setFixedValue tests ====================

    @Test
    void setFixedValue_createsNewEntry_whenNoExistingValue() {
        when(parameterRepository.findById(100L)).thenReturn(Optional.of(testParameter));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(fixedParameterValueRepository.findByParameterIdAndUserId(100L, 1L))
                .thenReturn(Optional.empty());
        when(fixedParameterValueRepository.save(any(FixedParameterValueEntity.class)))
                .thenReturn(testFixedValue);

        FixedParameterValueDto result = service.setFixedValue(100L, 1L, "CURDATE()");

        assertNotNull(result);
        assertEquals("CURDATE()", result.fixedValue());
        verify(fixedParameterValueRepository).save(any(FixedParameterValueEntity.class));
    }

    @Test
    void setFixedValue_updatesExistingEntry_whenValueAlreadyExists() {
        when(parameterRepository.findById(100L)).thenReturn(Optional.of(testParameter));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(fixedParameterValueRepository.findByParameterIdAndUserId(100L, 1L))
                .thenReturn(Optional.of(testFixedValue));

        FixedParameterValueEntity updatedEntity = FixedParameterValueEntity.builder()
                .id(1000L)
                .user(testUser)
                .parameter(testParameter)
                .fixedValue("new_value")
                .build();
        when(fixedParameterValueRepository.save(any(FixedParameterValueEntity.class)))
                .thenReturn(updatedEntity);

        FixedParameterValueDto result = service.setFixedValue(100L, 1L, "new_value");

        assertNotNull(result);
        assertEquals("new_value", result.fixedValue());
        verify(fixedParameterValueRepository).save(testFixedValue);
    }

    @Test
    void setFixedValue_throwsResourceNotFoundException_whenParameterNotFound() {
        when(parameterRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.setFixedValue(999L, 1L, "value"));
    }

    @Test
    void setFixedValue_throwsResourceNotFoundException_whenUserNotFound() {
        when(parameterRepository.findById(100L)).thenReturn(Optional.of(testParameter));
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.setFixedValue(100L, 999L, "value"));
    }

    // ==================== deleteFixedValue tests ====================

    @Test
    void deleteFixedValue_deletesSuccessfully_whenExists() {
        when(fixedParameterValueRepository.existsById(1000L)).thenReturn(true);

        service.deleteFixedValue(1000L);

        verify(fixedParameterValueRepository).deleteById(1000L);
    }

    @Test
    void deleteFixedValue_throwsResourceNotFoundException_whenNotFound() {
        when(fixedParameterValueRepository.existsById(999L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class,
                () -> service.deleteFixedValue(999L));
    }

    // ==================== resolveFixedValuesForExecution tests ====================

    @Test
    void resolveFixedValuesForExecution_resolvesExpressionThroughResolver() {
        when(parameterRepository.findByReportIdOrderByPositionAsc(10L))
                .thenReturn(List.of(testParameter));
        when(fixedParameterValueRepository.findByParameterIdAndUserId(100L, 1L))
                .thenReturn(Optional.of(testFixedValue));
        when(expressionResolver.resolve("CURDATE()")).thenReturn("2026-07-01");

        Map<String, Object> result = service.resolveFixedValuesForExecution(10L, 1L);

        assertEquals(1, result.size());
        assertEquals("2026-07-01", result.get("start_date"));
    }

    @Test
    void resolveFixedValuesForExecution_skipsParametersWithoutFixedValues() {
        ParameterEntity param2 = ParameterEntity.builder()
                .id(101L)
                .name("end_date")
                .build();

        when(parameterRepository.findByReportIdOrderByPositionAsc(10L))
                .thenReturn(List.of(testParameter, param2));
        when(fixedParameterValueRepository.findByParameterIdAndUserId(100L, 1L))
                .thenReturn(Optional.of(testFixedValue));
        when(fixedParameterValueRepository.findByParameterIdAndUserId(101L, 1L))
                .thenReturn(Optional.empty());
        when(expressionResolver.resolve("CURDATE()")).thenReturn("2026-07-01");

        Map<String, Object> result = service.resolveFixedValuesForExecution(10L, 1L);

        assertEquals(1, result.size());
        assertTrue(result.containsKey("start_date"));
        assertFalse(result.containsKey("end_date"));
    }

    @Test
    void resolveFixedValuesForExecution_returnsEmptyMap_whenNoParameters() {
        when(parameterRepository.findByReportIdOrderByPositionAsc(10L))
                .thenReturn(List.of());

        Map<String, Object> result = service.resolveFixedValuesForExecution(10L, 1L);

        assertTrue(result.isEmpty());
    }

    @Test
    void resolveFixedValuesForExecution_returnsEmptyMap_whenNoFixedValues() {
        when(parameterRepository.findByReportIdOrderByPositionAsc(10L))
                .thenReturn(List.of(testParameter));
        when(fixedParameterValueRepository.findByParameterIdAndUserId(100L, 1L))
                .thenReturn(Optional.empty());

        Map<String, Object> result = service.resolveFixedValuesForExecution(10L, 1L);

        assertTrue(result.isEmpty());
    }

    @Test
    void resolveFixedValuesForExecution_resolvesPlainValues_unchangedByResolver() {
        FixedParameterValueEntity plainFixedValue = FixedParameterValueEntity.builder()
                .id(1001L)
                .user(testUser)
                .parameter(testParameter)
                .fixedValue("static_value")
                .build();

        when(parameterRepository.findByReportIdOrderByPositionAsc(10L))
                .thenReturn(List.of(testParameter));
        when(fixedParameterValueRepository.findByParameterIdAndUserId(100L, 1L))
                .thenReturn(Optional.of(plainFixedValue));
        when(expressionResolver.resolve("static_value")).thenReturn("static_value");

        Map<String, Object> result = service.resolveFixedValuesForExecution(10L, 1L);

        assertEquals("static_value", result.get("start_date"));
    }
}
