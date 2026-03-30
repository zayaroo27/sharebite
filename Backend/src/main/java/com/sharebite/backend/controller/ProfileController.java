package com.sharebite.backend.controller;

import com.sharebite.backend.dto.ProfileResponse;
import com.sharebite.backend.dto.ProfileUpdateRequest;
import com.sharebite.backend.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/profile")
@PreAuthorize("isAuthenticated()")
public class ProfileController {

    @Autowired
    private ProfileService profileService;

    @GetMapping("/me")
    public ResponseEntity<ProfileResponse> getMyProfile() {
        ProfileResponse response = profileService.getMyProfile();
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me")
    public ResponseEntity<ProfileResponse> updateMyProfile(@Valid @RequestBody ProfileUpdateRequest request) {
        ProfileResponse response = profileService.updateMyProfile(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/upload-image")
    public ResponseEntity<ProfileResponse> uploadProfileImage(@RequestParam("file") MultipartFile file) {
        ProfileResponse response = profileService.uploadProfileImage(file);
        return ResponseEntity.ok(response);
    }
}
