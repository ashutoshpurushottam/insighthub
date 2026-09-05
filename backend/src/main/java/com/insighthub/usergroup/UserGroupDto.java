package com.insighthub.usergroup;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
public class UserGroupDto {
    private Long id;
    private String name;
    private String description;
    private int memberCount;
    private Set<String> roleNames;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
