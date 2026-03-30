package com.sharebite.backend.service;

import com.sharebite.backend.dto.ListingRequestResponse;
import com.sharebite.backend.entity.FoodListing;
import com.sharebite.backend.entity.ListingRequest;
import com.sharebite.backend.entity.ListingStatus;
import com.sharebite.backend.entity.NotificationType;
import com.sharebite.backend.entity.RequestStatus;
import com.sharebite.backend.entity.Role;
import com.sharebite.backend.entity.User;
import com.sharebite.backend.exception.BadRequestException;
import com.sharebite.backend.repository.FoodListingRepository;
import com.sharebite.backend.repository.ListingRequestRepository;
import com.sharebite.backend.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ListingRequestServiceTest {

    private ListingRequestService listingRequestService;
    private ListingRequestRepository listingRequestRepository;
    private FoodListingRepository foodListingRepository;
    private UserRepository userRepository;
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        listingRequestService = new ListingRequestService();
        listingRequestRepository = Mockito.mock(ListingRequestRepository.class);
        foodListingRepository = Mockito.mock(FoodListingRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        notificationService = Mockito.mock(NotificationService.class);

        ReflectionTestUtils.setField(listingRequestService, "listingRequestRepository", listingRequestRepository);
        ReflectionTestUtils.setField(listingRequestService, "foodListingRepository", foodListingRepository);
        ReflectionTestUtils.setField(listingRequestService, "userRepository", userRepository);
        ReflectionTestUtils.setField(listingRequestService, "notificationService", notificationService);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void approveRequest_ShouldReserveListingAndRejectOtherPendingRequests() {
        User donor = createUser("donor", Role.DONOR);
        User approvedRecipient = createUser("recipient-approved", Role.RECIPIENT);
        User rejectedRecipient = createUser("recipient-rejected", Role.RECIPIENT);

        FoodListing listing = new FoodListing();
        listing.setId(UUID.randomUUID());
        listing.setTitle("Vegetable packs");
        listing.setDonor(donor);
        listing.setStatus(ListingStatus.AVAILABLE);

        ListingRequest approvedRequest = new ListingRequest();
        approvedRequest.setId(UUID.randomUUID());
        approvedRequest.setListing(listing);
        approvedRequest.setRecipient(approvedRecipient);
        approvedRequest.setStatus(RequestStatus.PENDING);

        ListingRequest competingRequest = new ListingRequest();
        competingRequest.setId(UUID.randomUUID());
        competingRequest.setListing(listing);
        competingRequest.setRecipient(rejectedRecipient);
        competingRequest.setStatus(RequestStatus.PENDING);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(donor.getUsername(), "secret")
        );

        when(userRepository.findByUsername(donor.getUsername())).thenReturn(Optional.of(donor));
        when(listingRequestRepository.findById(approvedRequest.getId())).thenReturn(Optional.of(approvedRequest));
        when(listingRequestRepository.findByListingIdAndStatus(listing.getId(), RequestStatus.APPROVED))
                .thenReturn(Optional.empty());
        when(listingRequestRepository.findByListingIdAndStatusAndIdNot(
                listing.getId(),
                RequestStatus.PENDING,
                approvedRequest.getId()
        )).thenReturn(List.of(competingRequest));
        when(listingRequestRepository.save(any(ListingRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(listingRequestRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        when(foodListingRepository.save(any(FoodListing.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ListingRequestResponse response = listingRequestService.approveRequest(approvedRequest.getId());

        assertEquals(RequestStatus.APPROVED.name(), response.status());
        assertEquals(ListingStatus.RESERVED, listing.getStatus());
        assertEquals(RequestStatus.APPROVED, approvedRequest.getStatus());
        assertEquals(RequestStatus.REJECTED, competingRequest.getStatus());
        assertNotNull(approvedRequest.getDecisionDate());
        assertNotNull(competingRequest.getDecisionDate());

        verify(notificationService).createNotification(
                eq(approvedRecipient),
                eq("Request approved"),
                contains("has been approved"),
                eq(NotificationType.REQUEST_APPROVED)
        );
        verify(notificationService).createNotification(
                eq(rejectedRecipient),
                eq("Request rejected"),
                contains("was not selected"),
                eq(NotificationType.REQUEST_REJECTED)
        );
    }

    @Test
    void approveRequest_WhenListingAlreadyReserved_ShouldFail() {
        User donor = createUser("donor", Role.DONOR);
        User recipient = createUser("recipient", Role.RECIPIENT);

        FoodListing listing = new FoodListing();
        listing.setId(UUID.randomUUID());
        listing.setTitle("Cooked rice");
        listing.setDonor(donor);
        listing.setStatus(ListingStatus.RESERVED);

        ListingRequest request = new ListingRequest();
        request.setId(UUID.randomUUID());
        request.setListing(listing);
        request.setRecipient(recipient);
        request.setStatus(RequestStatus.PENDING);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(donor.getUsername(), "secret")
        );

        when(userRepository.findByUsername(donor.getUsername())).thenReturn(Optional.of(donor));
        when(listingRequestRepository.findById(request.getId())).thenReturn(Optional.of(request));

        BadRequestException exception = assertThrows(
                BadRequestException.class,
                () -> listingRequestService.approveRequest(request.getId())
        );

        assertEquals("Listing is not available for approval", exception.getMessage());
        verify(listingRequestRepository, never()).save(any(ListingRequest.class));
        verify(listingRequestRepository, never()).saveAll(anyList());
        verify(foodListingRepository, never()).save(any(FoodListing.class));
        verify(notificationService, never()).createNotification(any(), any(), any(), any());
    }

    private User createUser(String username, Role role) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername(username);
        user.setRole(role);
        return user;
    }
}
