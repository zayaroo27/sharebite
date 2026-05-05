package com.sharebite.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharebite.backend.dto.AdminListingEvidenceResponse;
import com.sharebite.backend.dto.AdminReportDetailResponse;
import com.sharebite.backend.dto.AdminReportMessageResponse;
import com.sharebite.backend.dto.AdminReportReviewRequest;
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
import java.util.EnumSet;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private static final Set<Role> DASHBOARD_USER_ROLES = EnumSet.of(Role.DONOR, Role.RECIPIENT);

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

    @Autowired
    private NotificationService notificationService;

    public List<AdminUserResponse> getAllUsers() {
        List<User> users = userRepository.findAll();
        return users.stream()
                .filter(this::isDashboardUser)
                .map(this::mapToAdminUserResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public AdminUserResponse suspendUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        if (user.getRole() == Role.ADMIN) {
            throw new BadRequestException("Admin accounts cannot be suspended from the users dashboard");
        }
        user.setStatus(AccountStatus.SUSPENDED);
        User saved = userRepository.save(user);
        return mapToAdminUserResponse(saved);
    }

    @Transactional
    public AdminUserResponse activateUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        if (user.getRole() == Role.ADMIN) {
            throw new BadRequestException("Admin accounts cannot be managed from the users dashboard");
        }
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
        List<User> dashboardUsers = userRepository.findAll().stream()
            .filter(this::isDashboardUser)
            .toList();

        long totalUsers = dashboardUsers.size();
        long activeUsers = dashboardUsers.stream()
            .filter(user -> user.getStatus() == AccountStatus.ACTIVE)
            .count();
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

    private boolean isDashboardUser(User user) {
        return DASHBOARD_USER_ROLES.contains(user.getRole());
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
        AdminListingEvidenceResponse listingEvidence = buildSnapshotListingEvidence(report, snapshot);
        AdminRequestEvidenceResponse requestEvidence = buildSnapshotRequestEvidence(report, snapshot);
        AdminListingEvidenceResponse currentListingEvidence = buildCurrentListingEvidence(report);
        AdminRequestEvidenceResponse currentRequestEvidence = buildCurrentRequestEvidence(report);

        return new AdminReportDetailResponse(
                report.getId(),
                report.getType().name(),
                report.getStatus().name(),
                report.getReason(),
                report.getPolicyCategory() != null ? report.getPolicyCategory().name() : null,
                report.getSeverity() != null ? report.getSeverity().name() : null,
                report.getDetails(),
                report.getCreatedAt(),
                report.getEvidenceCapturedAt(),
                report.getReviewedAt(),
                report.getReviewedByAdmin() != null ? report.getReviewedByAdmin().getUsername() : null,
                report.getReportedMessageId(),
                readText(snapshot, "reportedMessageExcerpt"),
                report.getDecisionNote(),
                report.getActionTaken() != null ? report.getActionTaken().name() : null,
                report.getActionTargetType() != null ? report.getActionTargetType().name() : null,
                report.getActionTargetId(),
                report.getActionTakenAt(),
                buildUserResponse(report.getReporter()),
                listingEvidence,
                requestEvidence,
                currentListingEvidence,
                currentRequestEvidence,
                report.getStatus() == ReportStatus.PENDING
        );
    }

    @Transactional
    public AdminReportResponse resolveReport(UUID reportId, AdminReportReviewRequest reviewRequest) {
        User admin = getCurrentAdmin();
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new NotFoundException("Report not found"));
        ensurePending(report);

        applyReviewMetadata(report, reviewRequest, false);
        executeAutomaticModerationAction(report);
        report.setStatus(ReportStatus.RESOLVED);
        report.setReviewedByAdmin(admin);
        report.setReviewedAt(LocalDateTime.now());
        return mapToAdminReportResponse(reportRepository.save(report));
    }

    @Transactional
    public AdminReportResponse dismissReport(UUID reportId, AdminReportReviewRequest reviewRequest) {
        User admin = getCurrentAdmin();
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new NotFoundException("Report not found"));
        ensurePending(report);

        applyReviewMetadata(report, reviewRequest, true);
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
                user.getCreatedAt(),
                user.getMonitoredAt()
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
                report.getPolicyCategory() != null ? report.getPolicyCategory().name() : null,
                report.getSeverity() != null ? report.getSeverity().name() : null,
                report.getDetails(),
                listingId,
                listingTitle,
                requestId,
                report.getReportedMessageId(),
                report.getReporter() != null ? report.getReporter().getUsername() : null,
                (report.getReporter() != null && report.getReporter().getRole() != null)
                        ? report.getReporter().getRole().name()
                        : null,
                report.getCreatedAt(),
                report.getEvidenceCapturedAt(),
                report.getReviewedAt(),
                report.getReviewedByAdmin() != null ? report.getReviewedByAdmin().getUsername() : null,
                report.getActionTaken() != null ? report.getActionTaken().name() : null
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

    private AdminListingEvidenceResponse buildSnapshotListingEvidence(Report report, JsonNode snapshot) {
        JsonNode listingNode = getNode(snapshot, "listing");
        if (listingNode != null) {
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

        return buildCurrentListingEvidence(report);
    }

    private AdminRequestEvidenceResponse buildSnapshotRequestEvidence(Report report, JsonNode snapshot) {
        JsonNode requestNode = getNode(snapshot, "request");
        if (requestNode != null) {
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
                    report.getReportedMessageId() != null ? report.getReportedMessageId() : readUuid(snapshot, "reportedMessageId"),
                    messages,
                    true
            );
        }

        return buildCurrentRequestEvidence(report);
    }

    private AdminListingEvidenceResponse buildCurrentListingEvidence(Report report) {
        FoodListing listing = null;
        if (report.getListing() != null) {
            listing = report.getListing();
        } else if (report.getRequest() != null && report.getRequest().getListing() != null) {
            listing = report.getRequest().getListing();
        }
        if (listing == null) {
            return null;
        }

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

    private AdminRequestEvidenceResponse buildCurrentRequestEvidence(Report report) {
        if (report.getType() != ReportType.REQUEST || report.getRequest() == null) {
            return null;
        }

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
                buildCurrentListingEvidence(report),
                buildUserResponse(request.getListing().getDonor()),
                buildUserResponse(request.getRecipient()),
                report.getReportedMessageId(),
                messages,
                false
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

    private void applyReviewMetadata(Report report, AdminReportReviewRequest reviewRequest, boolean dismissedReview) {
        if (reviewRequest == null || reviewRequest.decisionNote() == null || reviewRequest.decisionNote().isBlank()) {
            throw new BadRequestException("A decision note is required when reviewing a report");
        }

        report.setDecisionNote(trimmed(reviewRequest.decisionNote(), 4000));

        if (dismissedReview) {
            report.setActionTaken(ModerationActionType.NONE);
            report.setActionTargetType(null);
            report.setActionTargetId(null);
            report.setActionTakenAt(null);
            return;
        }

        ModerationActionType actionTaken = parseActionTaken(reviewRequest.actionTaken());
        ModerationActionTargetType actionTargetType = parseActionTargetType(reviewRequest.actionTargetType());
        UUID actionTargetId = reviewRequest.actionTargetId();

        if (actionTaken == ModerationActionType.NONE) {
            if (actionTargetType != null || actionTargetId != null) {
                throw new BadRequestException("Do not provide an action target when no moderation action was taken");
            }
            report.setActionTaken(actionTaken);
            report.setActionTargetType(null);
            report.setActionTargetId(null);
            report.setActionTakenAt(null);
            return;
        }

        if (actionTargetType == null || actionTargetId == null) {
            throw new BadRequestException("Action target type and target id are required when recording a moderation action");
        }

        report.setActionTaken(actionTaken);
        report.setActionTargetType(actionTargetType);
        report.setActionTargetId(actionTargetId);
        report.setActionTakenAt(LocalDateTime.now());
    }

    private void executeAutomaticModerationAction(Report report) {
        ModerationActionType actionTaken = report.getActionTaken();
        if (actionTaken == null || actionTaken == ModerationActionType.NONE) {
            return;
        }

        if (report.getActionTargetType() == null || report.getActionTargetId() == null) {
            return;
        }

        switch (actionTaken) {
            case WARN_USER -> warnUser(report);
            case SUSPEND_USER -> suspendUserFromReport(report);
            case REMOVE_LISTING -> removeListingFromPlatform(report);
            case MONITOR_ACCOUNT -> markUserUnderMonitoring(report);
            case ESCALATE -> escalateReport(report);
            default -> { }
        }
    }

    private void warnUser(Report report) {
        User user = getActionTargetUser(report, ModerationActionType.WARN_USER);
        notificationService.createNotification(
                user,
                "Account warning",
                buildDecisionMessage(
                        "An admin issued a warning on your ShareBite account.",
                        report.getDecisionNote()
                ),
                NotificationType.MODERATION_WARNING
        );
    }

    private void suspendUserFromReport(Report report) {
        User user = getActionTargetUser(report, ModerationActionType.SUSPEND_USER);
        if (user.getStatus() != AccountStatus.SUSPENDED) {
            user.setStatus(AccountStatus.SUSPENDED);
            userRepository.save(user);
        }

        notificationService.createNotification(
                user,
                "Account suspended",
                buildDecisionMessage(
                        "An admin suspended your ShareBite account.",
                        report.getDecisionNote()
                ),
                NotificationType.ACCOUNT_SUSPENDED
        );
    }

    private void markUserUnderMonitoring(Report report) {
        User user = getActionTargetUser(report, ModerationActionType.MONITOR_ACCOUNT);
        if (user.getMonitoredAt() == null) {
            user.setMonitoredAt(LocalDateTime.now());
            userRepository.save(user);
        }
        notificationService.createNotification(
                user,
                "Account under monitoring",
                buildDecisionMessage(
                        "An admin placed your ShareBite account under monitoring.",
                        report.getDecisionNote()
                ),
                NotificationType.ACCOUNT_MONITORED
        );
    }

    private void removeListingFromPlatform(Report report) {
        FoodListing listing = getActionTargetListing(report, ModerationActionType.REMOVE_LISTING);
        if (listing.getRemovedByModerationAt() == null) {
            listing.setRemovedByModerationAt(LocalDateTime.now());
            foodListingRepository.save(listing);
        }

        notificationService.createNotification(
                listing.getDonor(),
                "Listing removed by moderation",
                buildDecisionMessage(
                        "An admin removed one of your ShareBite listings from public visibility.",
                        report.getDecisionNote()
                ),
                NotificationType.LISTING_REMOVED
        );
    }

    private void escalateReport(Report report) {
        List<User> adminsToNotify = userRepository.findAll().stream()
                .filter(user -> user.getRole() == Role.ADMIN)
                .filter(user -> user.getStatus() == AccountStatus.ACTIVE)
                .filter(user -> report.getReviewedByAdmin() == null || !user.getId().equals(report.getReviewedByAdmin().getId()))
                .toList();

        for (User admin : adminsToNotify) {
            notificationService.createNotification(
                    admin,
                    "Report escalated for follow-up",
                    buildDecisionMessage(
                            "A moderation case was escalated and needs additional admin attention. Report ID: " + report.getId(),
                            report.getDecisionNote()
                    ),
                    NotificationType.REPORT_ESCALATED
            );
        }
    }

    private User getActionTargetUser(Report report, ModerationActionType actionType) {
        if (report.getActionTargetType() != ModerationActionTargetType.USER) {
            throw new BadRequestException(actionType.name() + " requires a USER target");
        }

        return userRepository.findById(report.getActionTargetId())
                .orElseThrow(() -> new NotFoundException("Moderation action target user not found"));
    }

    private FoodListing getActionTargetListing(Report report, ModerationActionType actionType) {
        if (report.getActionTargetType() != ModerationActionTargetType.LISTING) {
            throw new BadRequestException(actionType.name() + " requires a LISTING target");
        }

        return foodListingRepository.findById(report.getActionTargetId())
                .orElseThrow(() -> new NotFoundException("Moderation action target listing not found"));
    }

    private String buildDecisionMessage(String prefix, String decisionNote) {
        String note = trimmed(decisionNote, 3000);
        if (note == null) {
            return prefix;
        }
        return prefix + " Reason: " + note;
    }

    private ModerationActionType parseActionTaken(String rawAction) {
        if (rawAction == null || rawAction.isBlank()) {
            return ModerationActionType.NONE;
        }
        try {
            return ModerationActionType.valueOf(rawAction.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Invalid moderation action");
        }
    }

    private ModerationActionTargetType parseActionTargetType(String rawTargetType) {
        if (rawTargetType == null || rawTargetType.isBlank()) {
            return null;
        }
        try {
            return ModerationActionTargetType.valueOf(rawTargetType.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Invalid moderation action target type");
        }
    }

    private String trimmed(String value, int maxLength) {
        String normalized = value == null ? null : value.trim();
        if (normalized == null || normalized.isBlank()) {
            return null;
        }
        return normalized.length() > maxLength ? normalized.substring(0, maxLength) : normalized;
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
