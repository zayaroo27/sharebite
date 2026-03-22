package com.sharebite.backend.service;

import com.sharebite.backend.dto.AuthResponse;
import com.sharebite.backend.dto.LoginRequest;
import com.sharebite.backend.dto.RegisterRequest;
import com.sharebite.backend.dto.UserDto;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    UserDto getCurrentUser();

    void logout();

}