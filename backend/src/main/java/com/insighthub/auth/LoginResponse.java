package com.insighthub.auth;

import com.insighthub.user.UserDto;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private UserDto user;
}
