package com.insighthub.role;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
public class RoleDto {
    private Long id;
    private String name;
    private String description;
    private Set<String> permissions;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
