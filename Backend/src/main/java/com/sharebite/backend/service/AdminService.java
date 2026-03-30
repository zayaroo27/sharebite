package com.sharebite.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharebite.backend.dto.AdminListingEvidenceResponse;
import com.sharebite.backend.dto.AdminReportDetailResponse;
import com.sharebite.backend.dto.AdminReportMessageResponse;
import com.sharebite.backend.dto.AdminReportResponse;
import com.sharebite.backend.dto.AdminReportUserResponse;
import com.sharebite.backend.dto.AdminRequestEvidenceResponse;
import com.sharebite.backend.dto.AdminStatsResponse;
import com.sharebite.backend.dto.AdminUserResponse;
import com.sharebite.backend.entity.*;
import com.sharebite.backend.exception.BadRequestException;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
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

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private ObjectMapper objectMapper;

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

        boolean referencedByListingReports = !reportRepository.findByListingId(listingId).isEmpty();
        boolean referencedByRequestReports = !reportRepository.findRequestReportsForListingId(listingId).isEmpty();
        if (referencedByListingReports || referencedByRequestReports) {
            throw new BadRequestException(
                    "This listing is referenced by report records and should not be hard-deleted from moderation."
            );
        }

        foodListingRepository.delete(listing);
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

    @Transactional(readOnly = true)
    public List<AdminReportResponse> getReports(String statusFilter) {
        List<Report> reports = (statusFilter == null || statusFilter.isBlank())
                ? reportRepository.findAllByOrderByCreatedAtDesc()
                : reportRepository.findByStatusOrderByCreatedAtDesc(parseStatus(statusFilter));

        return reports.stream()
                .filter(this::shouldExposeReportInDashboard)
                .map(this::safeMapToAdminReportResponse)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AdminReportDetailResponse getReportDetail(UUID reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new NotFoundException("Report not found"));

        JsonNode snapshot = readSnapshot(report);
        AdminListingEvidenceResponse listingEvidence = buildListingEvidence(report, snapshot);
        AdminRequestEvidenceResponse requestEvidence = buildRequestEvidence(report, snapshot);

        return new AdminReportDetailResponse(
                report.getId(),
                report.getType().name(),
                report.getStatus().name(),
                report.getReason(),
                report.getDetails(),
                report.getCreatedAt(),
                report.getReviewedAt(),
                report.getReviewedByAdmin() != null ? report.getReviewedByAdmin().getUsername() : null,
                buildUserResponse(report.getReporter()),
                listingEvidence,
                requestEvidence,
                report.getStatus() == ReportStatus.PENDING
        );
    }

    @Transactional
    public AdminReportResponse resolveReport(UUID reportId) {
        User admin = getCurrentAdmin();
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new NotFoundException("Report not found"));
        ensurePending(report);

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
        ensurePending(report);

        report.setStatus(ReportStatus.DISMISSED);
        report.setReviewedByAdmin(admin);
        report.setReviewedAt(LocalDateTime.now());
        return mapToAdminReportResponse(reportRepository.save(report));
    }

    private void ensurePending(Report report) {
        if (report.getStatus() != ReportStatus.PENDING) {
            throw new BadRequestException("Only pending reports can be reviewed");
        }
    }

    private ReportStatus parseStatus(String rawStatus) {
        try {
            return ReportStatus.valueOf(rawStatus.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Invalid report status filter");
        }
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
        JsonNode snapshot = readSnapshot(report);
        UUID listingId = report.getListing() != null
                ? report.getListing().getId()
                : readUuid(snapshot, "listing", "id");
        String listingTitle = report.getListing() != null
                ? report.getListing().getTitle()
                : readText(snapshot, "listing", "title");
        UUID requestId = report.getRequest() != null
                ? report.getRequest().getId()
                : readUuid(snapshot, "request", "id");

        return new AdminReportResponse(
                report.getId(),
                report.getType() != null ? report.getType().name() : null,
                report.getStatus() != null ? report.getStatus().name() : null,
                report.getReason(),
                report.getDetails(),
                listingId,
                listingTitle,
                requestId,
                report.getReporter() != null ? report.getReporter().getUsername() : null,
                (report.getReporter() != null && report.getReporter().getRole() != null)
                        ? report.getReporter().getRole().name()
                        : null,
                report.getCreatedAt(),
                report.getReviewedAt(),
                report.getReviewedByAdmin() != null ? report.getReviewedByAdmin().getUsername() : null
        );
    }

    private AdminReportResponse safeMapToAdminReportResponse(Report report) {
        try {
            return mapToAdminReportResponse(report);
        } catch (Exception exception) {
            return null;
        }
    }

    private boolean shouldExposeReportInDashboard(Report report) {
        try {
            if (report == null) {
                return false;
            }
            User reporter = report.getReporter();
            return reporter == null || reporter.getRole() != Role.ADMIN;
        } catch (Exception exception) {
            return false;
        }
    }

    private AdminListingEvidenceResponse buildListingEvidence(Report report, JsonNode snapshot) {
        if (report.getType() == ReportType.LISTING && report.getListing() != null) {
            FoodListing listing = report.getListing();
            return new AdminListingEvidenceResponse(
                    listing.getId(),
                    listing.getTitle(),
                    listing.getDescription(),
                    listing.getCategory() != null ? listing.getCategory().getName() : null,
                    listing.getQuantity(),
                    listing.getExpiryDate(),
                    listing.getLocation(),
                    listing.getImageUrl(),
                    listing.getStatus() != null ? listing.getStatus().name() : null,
                    buildUserResponse(listing.getDonor()),
                    false
            );
        }

        JsonNode listingNode = getNode(snapshot, "listing");
        if (listingNode == null) {
            return null;
        }

        return new AdminListingEvidenceResponse(
                readUuid(listingNode, "id"),
                readText(listingNode, "title"),
                readText(listingNode, "description"),
                readText(listingNode, "categoryName"),
                readText(listingNode, "quantity"),
                readLocalDate(listingNode, "expiryDate"),
                readText(listingNode, "location"),
                readText(listingNode, "imageUrl"),
                readText(listingNode, "status"),
                buildUserResponse(getNode(snapshot, "donor")),
                true
        );
    }

    private AdminRequestEvidenceResponse buildRequestEvidence(Report report, JsonNode snapshot) {
        if (report.getType() == ReportType.REQUEST && report.getRequest() != null) {
            ListingRequest request = report.getRequest();
            List<AdminReportMessageResponse> messages = messageRepository.findByRequestIdOrderByTimestampAsc(request.getId())
                    .stream()
                    .map(this::buildMessageResponse)
                    .collect(Collectors.toList());

            return new AdminRequestEvidenceResponse(
                    request.getId(),
                    request.getStatus() != null ? request.getStatus().name() : null,
                    request.getRequestDate(),
                    request.getDecisionDate(),
                    request.getCompletedDate(),
                    new AdminListingEvidenceResponse(
                            request.getListing().getId(),
                            request.getListing().getTitle(),
                            request.getListing().getDescription(),
                            request.getListing().getCategory() != null ? request.getListing().getCategory().getName() : null,
                            request.getListing().getQuantity(),
                            request.getListing().getExpiryDate(),
                            request.getListing().getLocation(),
                            request.getListing().getImageUrl(),
                            request.getListing().getStatus() != null ? request.getListing().getStatus().name() : null,
                            buildUserResponse(request.getListing().getDonor()),
                            false
                    ),
                    buildUserResponse(request.getListing().getDonor()),
                    buildUserResponse(request.getRecipient()),
                    messages,
                    false
            );
        }

        JsonNode requestNode = getNode(snapshot, "request");
        if (requestNode == null) {
            return null;
        }

        JsonNode listingNode = getNode(snapshot, "listing");
        List<AdminReportMessageResponse> messages = readMessageResponses(getNode(snapshot, "messages"));

        return new AdminRequestEvidenceResponse(
                readUuid(requestNode, "id"),
                readText(requestNode, "status"),
                readLocalDateTime(requestNode, "requestDate"),
                readLocalDateTime(requestNode, "decisionDate"),
                readLocalDateTime(requestNode, "completedDate"),
                listingNode == null ? null : new AdminListingEvidenceResponse(
                        readUuid(listingNode, "id"),
                        readText(listingNode, "title"),
                        readText(listingNode, "description"),
                        readText(listingNode, "categoryName"),
                        readText(listingNode, "quantity"),
                        readLocalDate(listingNode, "expiryDate"),
                        readText(listingNode, "location"),
                        readText(listingNode, "imageUrl"),
                        readText(listingNode, "status"),
                        buildUserResponse(getNode(snapshot, "donor")),
                        true
                ),
                buildUserResponse(getNode(snapshot, "donor")),
                buildUserResponse(getNode(snapshot, "recipient")),
                messages,
                true
        );
    }

    private AdminReportMessageResponse buildMessageResponse(Message message) {
        return new AdminReportMessageResponse(
                message.getId(),
                message.getContent(),
                message.getTimestamp(),
                message.getSender().getUsername(),
                message.getSender().getRole().name()
        );
    }

    private List<AdminReportMessageResponse> readMessageResponses(JsonNode messagesNode) {
        if (messagesNode == null || !messagesNode.isArray()) {
            return Collections.emptyList();
        }

        return java.util.stream.StreamSupport.stream(messagesNode.spliterator(), false)
                .map(messageNode -> new AdminReportMessageResponse(
                        readUuid(messageNode, "id"),
                        readText(messageNode, "content"),
                        readLocalDateTime(messageNode, "timestamp"),
                        readText(messageNode, "senderUsername"),
                        readText(messageNode, "senderRole")
                ))
                .collect(Collectors.toList());
    }

    private AdminReportUserResponse buildUserResponse(User user) {
        if (user == null) {
            return null;
        }
        return new AdminReportUserResponse(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getEmail(),
                user.getRole() != null ? user.getRole().name() : null,
                user.getOrganisationName()
        );
    }

    private AdminReportUserResponse buildUserResponse(JsonNode userNode) {
        if (userNode == null || userNode.isMissingNode() || userNode.isNull()) {
            return null;
        }
        return new AdminReportUserResponse(
                readUuid(userNode, "id"),
                readText(userNode, "username"),
                readText(userNode, "displayName"),
                readText(userNode, "email"),
                readText(userNode, "role"),
                readText(userNode, "organisationName")
        );
    }

    private JsonNode readSnapshot(Report report) {
        if (report.getEvidenceSnapshot() == null || report.getEvidenceSnapshot().isBlank()) {
            return null;
        }
        try {
            return objectMapper.readTree(report.getEvidenceSnapshot());
        } catch (Exception exception) {
            return null;
        }
    }

    private JsonNode getNode(JsonNode node, String field) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        JsonNode child = node.get(field);
        return child == null || child.isMissingNode() || child.isNull() ? null : child;
    }

    private String readText(JsonNode node, String field) {
        JsonNode value = getNode(node, field);
        return value == null ? null : value.asText(null);
    }

    private String readText(JsonNode snapshot, String objectField, String valueField) {
        JsonNode objectNode = getNode(snapshot, objectField);
        return readText(objectNode, valueField);
    }

    private UUID readUuid(JsonNode node, String field) {
        String value = readText(node, field);
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private UUID readUuid(JsonNode snapshot, String objectField, String valueField) {
        JsonNode objectNode = getNode(snapshot, objectField);
        return readUuid(objectNode, valueField);
    }

    private LocalDate readLocalDate(JsonNode node, String field) {
        String value = readText(node, field);
        return value == null || value.isBlank() ? null : LocalDate.parse(value);
    }

    private LocalDateTime readLocalDateTime(JsonNode node, String field) {
        String value = readText(node, field);
        return value == null || value.isBlank() ? null : LocalDateTime.parse(value);
    }
}
