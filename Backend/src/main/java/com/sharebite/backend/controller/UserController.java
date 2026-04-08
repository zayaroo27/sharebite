package com.sharebite.backend.controller;

import com.sharebite.backend.dto.PublicUserProfileResponse;
import com.sharebite.backend.service.PublicUserProfileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private PublicUserProfileService publicUserProfileService;

    @GetMapping("/{id}/public-profile")
    public ResponseEntity<PublicUserProfileResponse> getPublicProfile(@PathVariable UUID id) {
        PublicUserProfileResponse response = publicUserProfileService.getPublicProfile(id);
        return ResponseEntity.ok(response);
    }
}
