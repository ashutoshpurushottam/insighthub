package com.insighthub.user;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateUserRequest {

    @Size(max = 100)
    private String fullName;

    @Size(max = 100)
    private String email;

    @Size(max = 500)
    private String description;

    private Integer accessLevel;

    private Boolean active;
}
