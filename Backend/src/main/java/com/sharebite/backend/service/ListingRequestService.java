package com.sharebite.backend.service;

import com.sharebite.backend.dto.ListingRequestCreateResponse;
import com.sharebite.backend.dto.ListingRequestResponse;
import com.sharebite.backend.entity.*;
import com.sharebite.backend.exception.BadRequestException;
import com.sharebite.backend.exception.ConflictException;
import com.sharebite.backend.exception.ForbiddenException;
import com.sharebite.backend.exception.NotFoundException;
import com.sharebite.backend.repository.FoodListingRepository;
import com.sharebite.backend.repository.ListingRequestRepository;
import com.sharebite.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ListingRequestService {

    @Autowired
    private ListingRequestRepository listingRequestRepository;

    @Autowired
    private FoodListingRepository foodListingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    public ListingRequestCreateResponse createRequest(UUID listingId) {
        User recipient = getCurrentUser();
        FoodListing listing = foodListingRepository.findById(listingId)
                .orElseThrow(() -> new NotFoundException("Listing not found"));

        // Check listing is available and not expired
        if (listing.getStatus() != ListingStatus.AVAILABLE || listing.getExpiryDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Listing is not available for requests");
        }

        if (listingRequestRepository.findByListingIdAndStatus(listingId, RequestStatus.APPROVED).isPresent()) {
            throw new ConflictException("This listing already has an approved request");
        }

        // Check no active request
        if (listingRequestRepository.existsByListingIdAndRecipientIdAndStatusIn(
                listingId, recipient.getId(), List.of(RequestStatus.PENDING, RequestStatus.APPROVED))) {
            throw new ConflictException("You already have an active request for this listing");
        }

        ListingRequest request = new ListingRequest();
        request.setListing(listing);
        request.setRecipient(recipient);
        // status and requestDate set by @PrePersist

        ListingRequest saved = listingRequestRepository.save(request);

        // Create notification for donor
        notificationService.createNotification(
                listing.getDonor(),
                "New request received",
                "A recipient has requested your listing: " + listing.getTitle(),
                NotificationType.REQUEST_CREATED
        );

        return mapToCreateResponse(saved);
    }

    public List<ListingRequestResponse> getMyRequests() {
        User recipient = getCurrentUser();
        List<ListingRequest> requests = listingRequestRepository.findByRecipientIdOrderByRequestDateDesc(recipient.getId());
        return requests.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public List<ListingRequestResponse> getRequestsForMyListings() {
        User donor = getCurrentUser();
        List<ListingRequest> requests = listingRequestRepository.findByDonorIdOrderByRequestDateDesc(donor.getId());
        return requests.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional
    public ListingRequestResponse approveRequest(UUID requestId) {
        User donor = getCurrentUser();
        ListingRequest request = listingRequestRepository.findById(requestId)
                .orElseThrow(() -> new NotFoundException("Request not found"));

        if (!request.getListing().getDonor().getId().equals(donor.getId())) {
            throw new ForbiddenException("You can only manage requests for your own listings");
        }

        if (request.getStatus() != RequestStatus.PENDING) {
            throw new BadRequestException("Request must be pending to approve");
        }

        // Check no other approved for this listing
        if (listingRequestRepository.findByListingIdAndStatus(request.getListing().getId(), RequestStatus.APPROVED).isPresent()) {
            throw new ConflictException("This listing already has an approved request");
        }

        request.setStatus(RequestStatus.APPROVED);
        request.setDecisionDate(LocalDateTime.now());

        FoodListing listing = request.getListing();
        listing.setStatus(ListingStatus.RESERVED);
        foodListingRepository.save(listing);

        ListingRequest saved = listingRequestRepository.save(request);

        // Create notification for recipient
        notificationService.createNotification(
                request.getRecipient(),
                "Request approved",
                "Your request for '" + request.getListing().getTitle() + "' has been approved.",
                NotificationType.REQUEST_APPROVED
        );

        return mapToResponse(saved);
    }

    @Transactional
    public ListingRequestResponse rejectRequest(UUID requestId) {
        User donor = getCurrentUser();
        ListingRequest request = listingRequestRepository.findById(requestId)
                .orElseThrow(() -> new NotFoundException("Request not found"));

        if (!request.getListing().getDonor().getId().equals(donor.getId())) {
            throw new ForbiddenException("You can only manage requests for your own listings");
        }

        if (request.getStatus() != RequestStatus.PENDING) {
            throw new BadRequestException("Request must be pending to reject");
        }

        request.setStatus(RequestStatus.REJECTED);
        request.setDecisionDate(LocalDateTime.now());
        ListingRequest saved = listingRequestRepository.save(request);

        // Create notification for recipient
        notificationService.createNotification(
                request.getRecipient(),
                "Request rejected",
                "Your request for '" + request.getListing().getTitle() + "' has been rejected.",
                NotificationType.REQUEST_REJECTED
        );

        return mapToResponse(saved);
    }

    @Transactional
    public ListingRequestResponse cancelRequest(UUID requestId) {
        User recipient = getCurrentUser();
        ListingRequest request = listingRequestRepository.findById(requestId)
                .orElseThrow(() -> new NotFoundException("Request not found"));

        if (!request.getRecipient().getId().equals(recipient.getId())) {
            throw new ForbiddenException("You can only cancel your own requests");
        }

        if (request.getStatus() != RequestStatus.PENDING) {
            throw new BadRequestException("Only pending requests can be canceled");
        }

        request.setStatus(RequestStatus.CANCELED);
        request.setDecisionDate(LocalDateTime.now());
        ListingRequest saved = listingRequestRepository.save(request);

        notificationService.createNotification(
                request.getListing().getDonor(),
                "Request canceled",
                "A recipient canceled their request for '" + request.getListing().getTitle() + "'.",
                NotificationType.REQUEST_CANCELED
        );

        return mapToResponse(saved);
    }

    @Transactional
    public ListingRequestResponse completeRequest(UUID requestId) {
        User donor = getCurrentUser();
        ListingRequest request = listingRequestRepository.findById(requestId)
                .orElseThrow(() -> new NotFoundException("Request not found"));

        if (!request.getListing().getDonor().getId().equals(donor.getId())) {
            throw new ForbiddenException("You can only manage requests for your own listings");
        }

        if (request.getStatus() != RequestStatus.APPROVED) {
            throw new BadRequestException("Request must be approved to complete");
        }

        request.setStatus(RequestStatus.COMPLETED);
        request.setCompletedDate(LocalDateTime.now());

        // Update listing status
        FoodListing listing = request.getListing();
        listing.setStatus(ListingStatus.COMPLETED);
        foodListingRepository.save(listing);

        ListingRequest saved = listingRequestRepository.save(request);

        // Create notification for recipient
        notificationService.createNotification(
                request.getRecipient(),
                "Request completed",
                "Your request for '" + request.getListing().getTitle() + "' has been marked as completed.",
                NotificationType.REQUEST_COMPLETED
        );

        return mapToResponse(saved);
    }

    private User getCurrentUser() {
        String usernameOrEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(usernameOrEmail)
            .or(() -> userRepository.findByEmail(usernameOrEmail))
                .orElseThrow(() -> new NotFoundException("Authenticated user not found"));
    }

    private ListingRequestCreateResponse mapToCreateResponse(ListingRequest request) {
        return new ListingRequestCreateResponse(
                request.getId(),
                request.getListing().getId(),
                request.getListing().getTitle(),
                request.getStatus().name(),
                request.getRequestDate()
        );
    }

    private ListingRequestResponse mapToResponse(ListingRequest request) {
        return new ListingRequestResponse(
                request.getId(),
                request.getListing().getId(),
                request.getListing().getTitle(),
                request.getStatus().name(),
                request.getRequestDate(),
                request.getDecisionDate(),
                request.getCompletedDate(),
                request.getRecipient().getUsername(),
                request.getListing().getDonor().getUsername()
        );
    }
}