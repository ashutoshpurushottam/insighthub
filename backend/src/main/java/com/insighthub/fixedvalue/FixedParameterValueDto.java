package com.insighthub.fixedvalue;

public record FixedParameterValueDto(
    Long id,
    Long userId,
    String username,
    Long parameterId,
    String parameterName,
    String fixedValue
) {}
