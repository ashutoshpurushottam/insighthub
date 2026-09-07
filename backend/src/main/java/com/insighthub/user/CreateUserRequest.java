package com.insighthub.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateUserRequest {

    @NotBlank(message = "Username is required")
    @Size(max = 50)
    private String username;

    @NotBlank(message = "Password is required")
    @Size(min = 4, max = 100)
    private String password;

    @Size(max = 100)
    private String fullName;

    @Size(max = 100)
    private String email;

    @Size(max = 500)
    private String description;

    private int accessLevel = 0;
}
