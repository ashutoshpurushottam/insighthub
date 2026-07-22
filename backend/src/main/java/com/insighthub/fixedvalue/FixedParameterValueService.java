package com.insighthub.fixedvalue;

import com.insighthub.common.exception.ResourceNotFoundException;
import com.insighthub.parameter.ExpressionResolver;
import com.insighthub.parameter.ParameterEntity;
import com.insighthub.parameter.ParameterRepository;
import com.insighthub.user.UserEntity;
import com.insighthub.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FixedParameterValueService {

    private static final Logger log = LoggerFactory.getLogger(FixedParameterValueService.class);

    private final FixedParameterValueRepository fixedParameterValueRepository;
    private final ParameterRepository parameterRepository;
    private final UserRepository userRepository;
    private final ExpressionResolver expressionResolver;

    /**
     * Returns all fixed values assigned to a specific parameter.
     *
     * @param parameterId the parameter ID
     * @return list of fixed value DTOs for the parameter
     */
    public List<FixedParameterValueDto> getFixedValuesForParameter(Long parameterId) {
        return fixedParameterValueRepository.findByParameterId(parameterId).stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Returns all fixed values assigned to a specific user.
     *
     * @param userId the user ID
     * @return list of fixed value DTOs for the user
     */
    public List<FixedParameterValueDto> getFixedValuesForUser(Long userId) {
        return fixedParameterValueRepository.findByUserId(userId).stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Sets (upserts) a fixed value for a given parameter and user combination.
     * If a fixed value already exists for the user+parameter pair, it is updated;
     * otherwise a new record is created.
     *
     * @param parameterId the parameter ID
     * @param userId      the user ID
     * @param value       the fixed value (may be an expression like CURRENT_USER)
     * @return the created or updated fixed value DTO
     */
    @Transactional
    public FixedParameterValueDto setFixedValue(Long parameterId, Long userId, String value) {
        ParameterEntity parameter = parameterRepository.findById(parameterId)
                .orElseThrow(() -> new ResourceNotFoundException("Parameter", "id", parameterId));

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Optional<FixedParameterValueEntity> existing =
                fixedParameterValueRepository.findByParameterIdAndUserId(parameterId, userId);

        FixedParameterValueEntity entity;
        if (existing.isPresent()) {
            entity = existing.get();
            entity.setFixedValue(value);
        } else {
            entity = FixedParameterValueEntity.builder()
                    .parameter(parameter)
                    .user(user)
                    .fixedValue(value)
                    .build();
        }

        return toDto(fixedParameterValueRepository.save(entity));
    }

    /**
     * Deletes a fixed value by its ID.
     *
     * @param id the fixed value record ID
     * @throws ResourceNotFoundException if no fixed value exists with the given ID
     */
    @Transactional
    public void deleteFixedValue(Long id) {
        if (!fixedParameterValueRepository.existsById(id)) {
            throw new ResourceNotFoundException("FixedParameterValue", "id", id);
        }
        fixedParameterValueRepository.deleteById(id);
    }

    /**
     * Resolves fixed parameter values for a report execution.
     * For each parameter in the report, checks if the user has a fixed value set.
     * If so, resolves the fixed value through the ExpressionResolver and adds
     * it to the result map.
     *
     * @param reportId the report ID whose parameters should be checked
     * @param userId   the user ID whose fixed values should be applied
     * @return a map of parameterName → resolved fixed value
     */
    public Map<String, Object> resolveFixedValuesForExecution(Long reportId, Long userId) {
        Map<String, Object> resolvedValues = new HashMap<>();

        List<ParameterEntity> parameters = parameterRepository.findByReportIdOrderByPositionAsc(reportId);

        for (ParameterEntity parameter : parameters) {
            Optional<FixedParameterValueEntity> fixedValue =
                    fixedParameterValueRepository.findByParameterIdAndUserId(parameter.getId(), userId);

            if (fixedValue.isPresent()) {
                String rawValue = fixedValue.get().getFixedValue();
                String resolvedValue = expressionResolver.resolve(rawValue);
                resolvedValues.put(parameter.getName(), resolvedValue);
                log.debug("Resolved fixed value for parameter '{}': '{}' → '{}'",
                        parameter.getName(), rawValue, resolvedValue);
            }
        }

        return resolvedValues;
    }

    private FixedParameterValueDto toDto(FixedParameterValueEntity entity) {
        return new FixedParameterValueDto(
                entity.getId(),
                entity.getUser().getId(),
                entity.getUser().getUsername(),
                entity.getParameter().getId(),
                entity.getParameter().getName(),
                entity.getFixedValue()
        );
    }
}
