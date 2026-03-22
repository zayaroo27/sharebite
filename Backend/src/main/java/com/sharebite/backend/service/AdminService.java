package com.sharebite.backend.service;

import com.sharebite.backend.dto.AdminStatsResponse;
import com.sharebite.backend.dto.AdminUserResponse;
import com.sharebite.backend.entity.*;
import com.sharebite.backend.exception.NotFoundException;
import com.sharebite.backend.repository.CategoryRepository;
import com.sharebite.backend.repository.FoodListingRepository;
import com.sharebite.backend.repository.ListingRequestRepository;
import com.sharebite.backend.repository.MessageRepository;
import com.sharebite.backend.repository.NotificationRepository;
import com.sharebite.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AdminService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FoodListingRepository foodListingRepository;

    @Autowired
    private ListingRequestRepository listingRequestRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    public List<AdminUserResponse> getAllUsers() {
        List<User> users = userRepository.findAll();
        return users.stream().map(this::mapToAdminUserResponse).collect(Collectors.toList());
    }

    @Transactional
    public AdminUserResponse suspendUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.setStatus(AccountStatus.SUSPENDED);
        User saved = userRepository.save(user);
        return mapToAdminUserResponse(saved);
    }

    @Transactional
    public AdminUserResponse activateUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.setStatus(AccountStatus.ACTIVE);
        User saved = userRepository.save(user);
        return mapToAdminUserResponse(saved);
    }

    @Transactional
    public void deleteListing(UUID listingId) {
        FoodListing listing = foodListingRepository.findById(listingId)
                .orElseThrow(() -> new NotFoundException("Listing not found"));
        foodListingRepository.delete(listing);
        // Cascade delete will handle related requests and messages
    }

    public AdminStatsResponse getStats() {
        long totalUsers = userRepository.count();
        long totalListings = foodListingRepository.count();
        long availableListings = foodListingRepository.countByStatus(ListingStatus.AVAILABLE);
        long expiredListings = foodListingRepository.countByStatus(ListingStatus.EXPIRED);
        long completedListings = foodListingRepository.countByStatus(ListingStatus.COMPLETED);
        long totalRequests = listingRequestRepository.count();
        long completedRequests = listingRequestRepository.countByStatus(RequestStatus.COMPLETED);
        long totalMessages = messageRepository.count();
        long totalCategories = categoryRepository.count();
        long totalNotifications = notificationRepository.count();

        return new AdminStatsResponse(
                totalUsers,
                totalListings,
                availableListings,
                expiredListings,
                completedListings,
                totalRequests,
                completedRequests,
                totalMessages,
                totalCategories,
                totalNotifications
        );
    }

    private AdminUserResponse mapToAdminUserResponse(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole().name(),
                user.getStatus().name(),
                user.getCreatedAt()
        );
    }
}