package com.sharebite.backend.dto;

import com.sharebite.backend.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record RegisterRequest(
        @NotBlank String username,
        @Email @NotBlank String email,
        @NotBlank
        @Pattern(
                regexp = "^(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$",
                message = "Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character."
        )
        String password,
        @NotNull Role role
) {
}
