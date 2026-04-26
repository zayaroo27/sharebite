package com.sharebite.backend.service;

import com.sharebite.backend.dto.AuthResponse;
import com.sharebite.backend.dto.RegisterRequest;
import com.sharebite.backend.entity.Role;
import com.sharebite.backend.exception.BadRequestException;
import com.sharebite.backend.repository.UserRepository;
import com.sharebite.backend.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceImplTest {

    private AuthServiceImpl authService;
    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        authService = new AuthServiceImpl();
        userRepository = Mockito.mock(UserRepository.class);
        passwordEncoder = Mockito.mock(PasswordEncoder.class);
        jwtUtil = Mockito.mock(JwtUtil.class);

        ReflectionTestUtils.setField(authService, "userRepository", userRepository);
        ReflectionTestUtils.setField(authService, "passwordEncoder", passwordEncoder);
        ReflectionTestUtils.setField(authService, "authenticationManager", Mockito.mock(AuthenticationManager.class));
        ReflectionTestUtils.setField(authService, "jwtUtil", jwtUtil);
    }

    @Test
    void register_AdminRole_ShouldRejectPublicRegistration() {
        RegisterRequest request = new RegisterRequest(
                "admin_candidate",
                "admin@example.com",
                "Admin123",
                Role.ADMIN
        );

        when(userRepository.findByUsername(request.username())).thenReturn(Optional.empty());
        when(userRepository.findByEmail(request.email())).thenReturn(Optional.empty());

        BadRequestException exception = assertThrows(
                BadRequestException.class,
                () -> authService.register(request)
        );

        assertEquals("Admin accounts cannot be created through public registration", exception.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_DonorRole_ShouldCreateAccount() {
        RegisterRequest request = new RegisterRequest(
                "donor_user",
                "donor@example.com",
                "Donor2026!",
                Role.DONOR
        );

        when(userRepository.findByUsername(request.username())).thenReturn(Optional.empty());
        when(userRepository.findByEmail(request.email())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(request.password())).thenReturn("encoded-secret");
        when(jwtUtil.generateTokenFromUsername(anyString())).thenReturn("jwt-token");

        AuthResponse response = authService.register(request);

        assertEquals("jwt-token", response.token());
        assertEquals("donor_user", response.user().username());
        assertEquals(Role.DONOR, response.user().role());
        assertTrue(response.user().email().contains("@"));
        verify(userRepository).save(any());
    }

    @Test
    void register_WeakPassword_ShouldReject() {
        RegisterRequest request = new RegisterRequest(
                "recipient_user",
                "recipient@example.com",
                "Password1",
                Role.RECIPIENT
        );

        when(userRepository.findByUsername(request.username())).thenReturn(Optional.empty());
        when(userRepository.findByEmail(request.email())).thenReturn(Optional.empty());

        BadRequestException exception = assertThrows(
                BadRequestException.class,
                () -> authService.register(request)
        );

        assertEquals(
                "Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character.",
                exception.getMessage()
        );
        verify(passwordEncoder, never()).encode(anyString());
        verify(userRepository, never()).save(any());
    }
}
