package com.sharebite.backend.service;

import com.sharebite.backend.dto.FoodListingRequest;
import com.sharebite.backend.dto.FoodListingResponse;
import com.sharebite.backend.entity.Category;
import com.sharebite.backend.entity.FoodListing;
import com.sharebite.backend.entity.ListingStatus;
import com.sharebite.backend.entity.NotificationType;
import com.sharebite.backend.entity.User;
import com.sharebite.backend.repository.ListingRequestRepository;
import com.sharebite.backend.repository.ReportRepository;
import com.sharebite.backend.repository.CategoryRepository;
import com.sharebite.backend.exception.BadRequestException;
import com.sharebite.backend.exception.ForbiddenException;
import com.sharebite.backend.exception.NotFoundException;
import com.sharebite.backend.repository.FoodListingRepository;
import com.sharebite.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class FoodListingService {

    @Autowired
    private FoodListingRepository foodListingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ListingRequestRepository listingRequestRepository;

    @Autowired
    private ReportRepository reportRepository;

    public FoodListingResponse createListing(FoodListingRequest request) {
        User currentUser = getCurrentUser();

        // Validate expiry date
        if (request.expiryDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Expiry date must be today or in the future");
        }

        // Validate fields (though DTO has annotations, double-check)
        if (request.title().trim().isEmpty() || request.description().trim().isEmpty() ||
            request.quantity().trim().isEmpty() || request.location().trim().isEmpty()) {
            throw new BadRequestException("Title, description, quantity, and location must not be blank");
        }

        FoodListing listing = new FoodListing();
        listing.setTitle(request.title());
        listing.setDescription(request.description());
        listing.setQuantity(request.quantity());
        listing.setExpiryDate(request.expiryDate());
        listing.setLocation(request.location());
        listing.setDonor(currentUser);

        if (request.categoryId() != null) {
            Category category = categoryRepository.findById(request.categoryId())
                    .orElseThrow(() -> new NotFoundException("Category not found"));
            listing.setCategory(category);
        }

        // status and createdAt set by @PrePersist

        FoodListing saved = foodListingRepository.save(listing);
        return mapToResponse(saved);
    }

    public List<FoodListingResponse> getPublicAvailableListings(String keyword, String location, UUID categoryId) {
        String normalizedKeyword = (keyword == null || keyword.trim().isEmpty()) ? null : keyword.trim();
        String normalizedLocation = (location == null || location.trim().isEmpty()) ? null : location.trim();

        List<FoodListing> listings;
        if (normalizedKeyword == null && normalizedLocation == null) {
            listings = (categoryId == null)
                    ? foodListingRepository.findAvailableNotExpired()
                    : foodListingRepository.findAvailableNotExpiredByCategoryId(categoryId);
        } else if (normalizedKeyword != null && normalizedLocation == null) {
            listings = (categoryId == null)
                    ? foodListingRepository.findAvailableNotExpiredByKeyword(normalizedKeyword)
                    : foodListingRepository.findAvailableNotExpiredByKeywordAndCategoryId(normalizedKeyword, categoryId);
        } else if (normalizedKeyword == null) {
            listings = (categoryId == null)
                    ? foodListingRepository.findAvailableNotExpiredByLocation(normalizedLocation)
                    : foodListingRepository.findAvailableNotExpiredByLocationAndCategoryId(normalizedLocation, categoryId);
        } else {
            listings = (categoryId == null)
                    ? foodListingRepository.findAvailableNotExpiredByKeywordAndLocation(normalizedKeyword, normalizedLocation)
                    : foodListingRepository.findAvailableNotExpiredByKeywordAndLocationAndCategoryId(
                            normalizedKeyword,
                            normalizedLocation,
                            categoryId
                    );
        }
        return listings.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public FoodListingResponse getPublicListingById(UUID listingId) {
        FoodListing listing = foodListingRepository.findById(listingId)
                .orElseThrow(() -> new NotFoundException("Listing not found"));
        return mapToResponse(listing);
    }

    public List<FoodListingResponse> getMyListings() {
        User currentUser = getCurrentUser();
        List<FoodListing> listings = foodListingRepository.findByDonorId(currentUser.getId());
        return listings.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional
    public FoodListingResponse updateMyListing(UUID listingId, FoodListingRequest request) {
        User currentUser = getCurrentUser();
        FoodListing listing = foodListingRepository.findById(listingId)
                .orElseThrow(() -> new NotFoundException("Listing not found"));

        if (!listing.getDonor().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("You can only modify your own listings");
        }

        // Validate
        if (request.expiryDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Expiry date must be today or in the future");
        }
        if (request.title().trim().isEmpty() || request.description().trim().isEmpty() ||
            request.quantity().trim().isEmpty() || request.location().trim().isEmpty()) {
            throw new BadRequestException("Title, description, quantity, and location must not be blank");
        }

        listing.setTitle(request.title());
        listing.setDescription(request.description());
        listing.setQuantity(request.quantity());
        listing.setExpiryDate(request.expiryDate());
        listing.setLocation(request.location());

        if (request.categoryId() != null) {
            Category category = categoryRepository.findById(request.categoryId())
                    .orElseThrow(() -> new NotFoundException("Category not found"));
            listing.setCategory(category);
        } else {
            listing.setCategory(null);
        }

        FoodListing updated = foodListingRepository.save(listing);
        return mapToResponse(updated);
    }

    @Transactional
    public FoodListingResponse uploadListingImage(UUID listingId, MultipartFile file) {
        User currentUser = getCurrentUser();
        FoodListing listing = foodListingRepository.findById(listingId)
                .orElseThrow(() -> new NotFoundException("Listing not found"));

        if (!listing.getDonor().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("You can only upload images to your own listings");
        }

        String imageUrl = fileStorageService.storeFile(file);
        listing.setImageUrl(imageUrl);
        FoodListing saved = foodListingRepository.save(listing);
        return mapToResponse(saved);
    }

    @Transactional
    public void deleteMyListing(UUID listingId) {
        User currentUser = getCurrentUser();
        FoodListing listing = foodListingRepository.findById(listingId)
                .orElseThrow(() -> new NotFoundException("Listing not found"));

        if (!listing.getDonor().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("You can only delete your own listings");
        }

        boolean hasListingReports = !reportRepository.findByListingId(listingId).isEmpty();
        boolean hasRequestReports = !reportRepository.findRequestReportsForListingId(listingId).isEmpty();
        if (hasListingReports || hasRequestReports) {
            throw new BadRequestException("You cannot delete a listing that is referenced by moderation reports");
        }

        if (!listingRequestRepository.findByListingId(listingId).isEmpty()) {
            throw new BadRequestException("You cannot delete a listing that already has request history");
        }

        foodListingRepository.delete(listing);
    }

    @Transactional
    public void markExpiredListings() {
        List<FoodListing> expired = foodListingRepository.findByStatusAndExpiryDateBefore(
            ListingStatus.AVAILABLE,
            LocalDate.now()
        );
        expired.forEach(l -> l.setStatus(ListingStatus.EXPIRED));
        foodListingRepository.saveAll(expired);

        // Create notifications for donors
        expired.forEach(listing -> {
            notificationService.createNotification(
                    listing.getDonor(),
                    "Listing expired",
                    "Your listing '" + listing.getTitle() + "' has expired.",
                    NotificationType.LISTING_EXPIRED
            );
        });
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                // .orElseThrow(() -> new RuntimeException("User not found"));
                .orElseThrow(() -> new NotFoundException("Authenticated user not found"));
    }

    private FoodListingResponse mapToResponse(FoodListing listing) {
        UUID categoryId = listing.getCategory() != null ? listing.getCategory().getId() : null;
        String categoryName = listing.getCategory() != null ? listing.getCategory().getName() : null;
        User donor = listing.getDonor();
        return new FoodListingResponse(
                listing.getId(),
                listing.getTitle(),
                listing.getDescription(),
                listing.getQuantity(),
                listing.getExpiryDate(),
                listing.getLocation(),
                listing.getStatus().name(),
                listing.getCreatedAt(),
                donor.getId(),
                donor.getUsername(),
                categoryId,
                categoryName,
                listing.getImageUrl(),
                donor.getUsername(),
                donor.getDisplayName(),
                donor.getOrganisationName(),
                donor.getCreatedAt(),
                donor.getProfileImageUrl()
        );
    }
}
