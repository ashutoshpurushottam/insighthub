package com.insighthub.user;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
public class UserDto {
    private Long id;
    private String username;
    private String fullName;
    private String email;
    private String description;
    private int accessLevel;
    private boolean active;
    private boolean publicUser;
    private Set<String> roles;
    private Set<String> permissions;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
