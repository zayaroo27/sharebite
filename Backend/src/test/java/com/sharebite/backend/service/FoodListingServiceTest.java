package com.sharebite.backend.service;

import com.sharebite.backend.entity.FoodListing;
import com.sharebite.backend.entity.ListingRequest;
import com.sharebite.backend.entity.Report;
import com.sharebite.backend.entity.Role;
import com.sharebite.backend.entity.User;
import com.sharebite.backend.exception.BadRequestException;
import com.sharebite.backend.repository.CategoryRepository;
import com.sharebite.backend.repository.FoodListingRepository;
import com.sharebite.backend.repository.ListingRequestRepository;
import com.sharebite.backend.repository.ReportRepository;
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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FoodListingServiceTest {

    private FoodListingService foodListingService;
    private FoodListingRepository foodListingRepository;
    private UserRepository userRepository;
    private ListingRequestRepository listingRequestRepository;
    private ReportRepository reportRepository;

    @BeforeEach
    void setUp() {
        foodListingService = new FoodListingService();
        foodListingRepository = Mockito.mock(FoodListingRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        listingRequestRepository = Mockito.mock(ListingRequestRepository.class);
        reportRepository = Mockito.mock(ReportRepository.class);

        ReflectionTestUtils.setField(foodListingService, "foodListingRepository", foodListingRepository);
        ReflectionTestUtils.setField(foodListingService, "userRepository", userRepository);
        ReflectionTestUtils.setField(foodListingService, "categoryRepository", Mockito.mock(CategoryRepository.class));
        ReflectionTestUtils.setField(foodListingService, "fileStorageService", Mockito.mock(FileStorageService.class));
        ReflectionTestUtils.setField(foodListingService, "notificationService", Mockito.mock(NotificationService.class));
        ReflectionTestUtils.setField(foodListingService, "listingRequestRepository", listingRequestRepository);
        ReflectionTestUtils.setField(foodListingService, "reportRepository", reportRepository);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void deleteMyListing_WhenListingHasRequestHistory_ShouldReject() {
        User donor = createUser("donor");
        FoodListing listing = createListing(donor);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(donor.getUsername(), "secret")
        );

        when(userRepository.findByUsername(donor.getUsername())).thenReturn(Optional.of(donor));
        when(foodListingRepository.findById(listing.getId())).thenReturn(Optional.of(listing));
        when(reportRepository.findByListingId(listing.getId())).thenReturn(List.of());
        when(reportRepository.findRequestReportsForListingId(listing.getId())).thenReturn(List.of());
        when(listingRequestRepository.findByListingId(listing.getId())).thenReturn(List.of(new ListingRequest()));

        BadRequestException exception = assertThrows(
                BadRequestException.class,
                () -> foodListingService.deleteMyListing(listing.getId())
        );

        assertEquals("You cannot delete a listing that already has request history", exception.getMessage());
        verify(foodListingRepository, never()).delete(any(FoodListing.class));
    }

    @Test
    void deleteMyListing_WhenListingHasModerationReports_ShouldReject() {
        User donor = createUser("donor");
        FoodListing listing = createListing(donor);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(donor.getUsername(), "secret")
        );

        when(userRepository.findByUsername(donor.getUsername())).thenReturn(Optional.of(donor));
        when(foodListingRepository.findById(listing.getId())).thenReturn(Optional.of(listing));
        when(reportRepository.findByListingId(listing.getId())).thenReturn(List.of(new Report()));

        BadRequestException exception = assertThrows(
                BadRequestException.class,
                () -> foodListingService.deleteMyListing(listing.getId())
        );

        assertEquals("You cannot delete a listing that is referenced by moderation reports", exception.getMessage());
        verify(foodListingRepository, never()).delete(any(FoodListing.class));
        verify(listingRequestRepository, never()).findByListingId(any());
    }

    private User createUser(String username) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername(username);
        user.setRole(Role.DONOR);
        return user;
    }

    private FoodListing createListing(User donor) {
        FoodListing listing = new FoodListing();
        listing.setId(UUID.randomUUID());
        listing.setDonor(donor);
        return listing;
    }
}
