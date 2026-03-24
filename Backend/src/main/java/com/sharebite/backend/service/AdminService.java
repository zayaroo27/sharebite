package com.sharebite.backend.service;

import com.sharebite.backend.dto.AdminStatsResponse;
import com.sharebite.backend.dto.AdminReportResponse;
import com.sharebite.backend.dto.AdminUserResponse;
import com.sharebite.backend.entity.*;
import com.sharebite.backend.exception.NotFoundException;
import com.sharebite.backend.repository.CategoryRepository;
import com.sharebite.backend.repository.FoodListingRepository;
import com.sharebite.backend.repository.ListingRequestRepository;
import com.sharebite.backend.repository.MessageRepository;
import com.sharebite.backend.repository.NotificationRepository;
import com.sharebite.backend.repository.ReportRepository;
import com.sharebite.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.LocalDateTime;
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

    @Autowired
    private ReportRepository reportRepository;

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
        long activeUsers = userRepository.countByStatus(AccountStatus.ACTIVE);
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
                activeUsers,
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

        public List<AdminReportResponse> getOpenReports() {
        return reportRepository.findByStatusOrderByCreatedAtDesc(ReportStatus.PENDING)
            .stream()
            .map(this::mapToAdminReportResponse)
            .collect(Collectors.toList());
        }

        @Transactional
        public AdminReportResponse resolveReport(UUID reportId) {
        User admin = getCurrentAdmin();
        Report report = reportRepository.findById(reportId)
            .orElseThrow(() -> new NotFoundException("Report not found"));

        report.setStatus(ReportStatus.RESOLVED);
        report.setReviewedByAdmin(admin);
        report.setReviewedAt(LocalDateTime.now());
        return mapToAdminReportResponse(reportRepository.save(report));
        }

        @Transactional
        public AdminReportResponse dismissReport(UUID reportId) {
        User admin = getCurrentAdmin();
        Report report = reportRepository.findById(reportId)
            .orElseThrow(() -> new NotFoundException("Report not found"));

        report.setStatus(ReportStatus.DISMISSED);
        report.setReviewedByAdmin(admin);
        report.setReviewedAt(LocalDateTime.now());
        return mapToAdminReportResponse(reportRepository.save(report));
        }

        private User getCurrentAdmin() {
        String usernameOrEmail = org.springframework.security.core.context.SecurityContextHolder
            .getContext()
            .getAuthentication()
            .getName();

        return userRepository.findByUsername(usernameOrEmail)
            .or(() -> userRepository.findByEmail(usernameOrEmail))
            .orElseThrow(() -> new NotFoundException("Authenticated admin not found"));
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

    private AdminReportResponse mapToAdminReportResponse(Report report) {
        return new AdminReportResponse(
                report.getId(),
                report.getType().name(),
                report.getStatus().name(),
                report.getReason(),
                report.getDetails(),
                report.getListing() != null ? report.getListing().getId() : null,
                report.getListing() != null ? report.getListing().getTitle() : null,
                report.getRequest() != null ? report.getRequest().getId() : null,
                report.getReporter() != null ? report.getReporter().getUsername() : null,
                report.getReporter() != null ? report.getReporter().getRole().name() : null,
                report.getCreatedAt(),
                report.getReviewedAt(),
                report.getReviewedByAdmin() != null ? report.getReviewedByAdmin().getUsername() : null
        );
    }
}
