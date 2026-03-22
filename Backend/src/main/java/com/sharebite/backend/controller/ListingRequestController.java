package com.sharebite.backend.controller;

import com.sharebite.backend.dto.ListingRequestCreateResponse;
import com.sharebite.backend.dto.ListingRequestResponse;
import com.sharebite.backend.service.ListingRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/requests")
public class ListingRequestController {

    @Autowired
    private ListingRequestService listingRequestService;

    @PostMapping("/{listingId}")
    @PreAuthorize("hasRole('RECIPIENT')")
    public ResponseEntity<ListingRequestCreateResponse> createRequest(@PathVariable UUID listingId) {
        ListingRequestCreateResponse response = listingRequestService.createRequest(listingId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('RECIPIENT')")
    public ResponseEntity<List<ListingRequestResponse>> getMyRequests() {
        List<ListingRequestResponse> responses = listingRequestService.getMyRequests();
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/for-my-listings")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<List<ListingRequestResponse>> getRequestsForMyListings() {
        List<ListingRequestResponse> responses = listingRequestService.getRequestsForMyListings();
        return ResponseEntity.ok(responses);
    }

    @PatchMapping("/{requestId}/approve")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<ListingRequestResponse> approveRequest(@PathVariable UUID requestId) {
        ListingRequestResponse response = listingRequestService.approveRequest(requestId);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{requestId}/reject")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<ListingRequestResponse> rejectRequest(@PathVariable UUID requestId) {
        ListingRequestResponse response = listingRequestService.rejectRequest(requestId);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{requestId}/cancel")
    @PreAuthorize("hasRole('RECIPIENT')")
    public ResponseEntity<ListingRequestResponse> cancelRequest(@PathVariable UUID requestId) {
        ListingRequestResponse response = listingRequestService.cancelRequest(requestId);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{requestId}/complete")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<ListingRequestResponse> completeRequest(@PathVariable UUID requestId) {
        ListingRequestResponse response = listingRequestService.completeRequest(requestId);
        return ResponseEntity.ok(response);
    }
}