package com.sharebite.backend.controller;

import com.sharebite.backend.dto.FoodListingRequest;
import com.sharebite.backend.dto.FoodListingResponse;
import com.sharebite.backend.service.FoodListingService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/listings")
public class FoodListingController {

    @Autowired
    private FoodListingService foodListingService;

    @GetMapping
    public ResponseEntity<List<FoodListingResponse>> getListings(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) UUID categoryId) {
        List<FoodListingResponse> listings = foodListingService.getPublicAvailableListings(keyword, location, categoryId);
        return ResponseEntity.ok(listings);
    }

    @GetMapping("/{id}")
    public ResponseEntity<FoodListingResponse> getListingById(@PathVariable UUID id) {
        FoodListingResponse listing = foodListingService.getPublicListingById(id);
        return ResponseEntity.ok(listing);
    }

    @PostMapping
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<FoodListingResponse> createListing(@Valid @RequestBody FoodListingRequest request) {
        FoodListingResponse response = foodListingService.createListing(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<List<FoodListingResponse>> getMyListings() {
        List<FoodListingResponse> listings = foodListingService.getMyListings();
        return ResponseEntity.ok(listings);
    }

    
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<FoodListingResponse> updateListing(@PathVariable UUID id, @Valid @RequestBody FoodListingRequest request) {
        FoodListingResponse response = foodListingService.updateMyListing(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<Void> deleteListing(@PathVariable UUID id) {
        foodListingService.deleteMyListing(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/image")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<FoodListingResponse> uploadImage(@PathVariable UUID id, @RequestParam("file") MultipartFile file) {
        FoodListingResponse response = foodListingService.uploadListingImage(id, file);
        return ResponseEntity.ok(response);
    }
}