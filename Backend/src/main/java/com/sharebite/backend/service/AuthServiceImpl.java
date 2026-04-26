package com.sharebite.backend.service;

import com.sharebite.backend.dto.AuthResponse;
import com.sharebite.backend.dto.LoginRequest;
import com.sharebite.backend.dto.RegisterRequest;
import com.sharebite.backend.dto.UserDto;
import com.sharebite.backend.entity.User;
import com.sharebite.backend.entity.Role;
import com.sharebite.backend.exception.BadRequestException;
import com.sharebite.backend.exception.ConflictException;
import com.sharebite.backend.repository.UserRepository;
import com.sharebite.backend.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

@Service
public class AuthServiceImpl implements AuthService {

    private static final String PASSWORD_POLICY_MESSAGE =
            "Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character.";
    private static final Pattern PASSWORD_POLICY_PATTERN =
            Pattern.compile("^(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$");

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByUsername(request.username()).isPresent()) {
            throw new ConflictException("Username already exists");
        }
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new ConflictException("Email already exists");
        }
        if (request.role() == Role.ADMIN) {
            throw new BadRequestException("Admin accounts cannot be created through public registration");
        }
        validatePasswordStrength(request.password());

        User user = new User();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(request.role());

        userRepository.save(user);

        String token = jwtUtil.generateTokenFromUsername(user.getUsername());
        UserDto userDto = new UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.getProfileImageUrl()
        );

        return new AuthResponse(token, userDto);
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String token = jwtUtil.generateToken(authentication);

        User user = userRepository.findByUsername(request.username())
            .or(() -> userRepository.findByEmail(request.username()))
            .orElseThrow();
        UserDto userDto = new UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.getProfileImageUrl()
        );

        return new AuthResponse(token, userDto);
    }

    @Override
    public UserDto getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        User user = userRepository.findByUsername(username).orElseThrow();
        return new UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.getProfileImageUrl()
        );
    }

    @Override
    public void logout() {
        // For stateless JWT, logout is handled on the client by discarding the token.
        // Clearing the SecurityContext ensures the current request has no authenticated user.
        SecurityContextHolder.clearContext();
    }

    private void validatePasswordStrength(String password) {
        if (password == null || !PASSWORD_POLICY_PATTERN.matcher(password).matches()) {
            throw new BadRequestException(PASSWORD_POLICY_MESSAGE);
        }
    }
}
