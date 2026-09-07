package com.insighthub.role;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Set;

@Data
public class CreateRoleRequest {

    @NotBlank(message = "Role name is required")
    @Size(max = 50)
    private String name;

    @Size(max = 200)
    private String description;

    private Set<Long> permissionIds;
}
