package com.sharebite.backend.service;

import com.sharebite.backend.dto.ProfileResponse;
import com.sharebite.backend.dto.ProfileUpdateRequest;
import com.sharebite.backend.entity.User;
import com.sharebite.backend.exception.NotFoundException;
import com.sharebite.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ProfileService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FileStorageService fileStorageService;

    public ProfileResponse getMyProfile() {
        User user = getCurrentUser();
        return mapToResponse(user);
    }

    public ProfileResponse updateMyProfile(ProfileUpdateRequest request) {
        User user = getCurrentUser();

        // Only profile fields are editable; core auth fields remain unchanged
        user.setDisplayName(request.displayName());
        user.setPhoneNumber(request.phoneNumber());
        user.setOrganisationName(request.organisationName());

        User saved = userRepository.save(user);
        return mapToResponse(saved);
    }

    public ProfileResponse uploadProfileImage(MultipartFile file) {
        User user = getCurrentUser();
        return uploadProfileImage(file, user);
    }

    public ProfileResponse uploadProfileImage(MultipartFile file, User user) {
        String imageUrl = fileStorageService.storeFile(file);
        user.setProfileImageUrl(imageUrl);
        User saved = userRepository.save(user);
        return mapToResponse(saved);
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Authenticated user not found"));
    }

    private ProfileResponse mapToResponse(User user) {
        ProfileResponse response = new ProfileResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setDisplayName(user.getDisplayName());
        response.setPhoneNumber(user.getPhoneNumber());
        response.setOrganisationName(user.getOrganisationName());
        response.setProfileImageUrl(user.getProfileImageUrl());
        response.setRole(user.getRole().name());
        response.setStatus(user.getStatus().name());
        response.setCreatedAt(user.getCreatedAt());
        return response;
    }
}
