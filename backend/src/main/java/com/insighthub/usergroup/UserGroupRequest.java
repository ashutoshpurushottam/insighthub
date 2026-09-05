package com.insighthub.usergroup;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserGroupRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 50)
    private String name;

    @Size(max = 200)
    private String description;
}
