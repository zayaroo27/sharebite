package com.sharebite.backend.service;

import com.sharebite.backend.dto.PublicUserProfileResponse;
import com.sharebite.backend.entity.ListingStatus;
import com.sharebite.backend.entity.RequestStatus;
import com.sharebite.backend.entity.User;
import com.sharebite.backend.exception.NotFoundException;
import com.sharebite.backend.repository.FoodListingRepository;
import com.sharebite.backend.repository.ListingRequestRepository;
import com.sharebite.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class PublicUserProfileService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FoodListingRepository foodListingRepository;

    @Autowired
    private ListingRequestRepository listingRequestRepository;

    public PublicUserProfileResponse getPublicProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        long listingsCreatedCount = foodListingRepository.countByDonorId(userId);
        long completedDonationsCount = foodListingRepository.countByDonorIdAndStatus(userId, ListingStatus.COMPLETED);
        long activeListingsCount = foodListingRepository.countByDonorIdAndStatusIn(
                userId,
                List.of(ListingStatus.AVAILABLE, ListingStatus.RESERVED)
        );
        long requestsMadeCount = listingRequestRepository.countByRecipientId(userId);
        long successfulPickupsCount = listingRequestRepository.countByRecipientIdAndStatus(userId, RequestStatus.COMPLETED);

        return new PublicUserProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getOrganisationName(),
                user.getRole().name(),
                user.getProfileImageUrl(),
                user.getCreatedAt(),
                listingsCreatedCount,
                completedDonationsCount,
                activeListingsCount,
                requestsMadeCount,
                successfulPickupsCount
        );
    }
}
