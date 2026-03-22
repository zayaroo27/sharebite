package com.sharebite.backend.dto;

public record AuthResponse(String token, UserDto user) {
}