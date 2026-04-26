package com.sharebite.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharebite.backend.dto.ReportCreateRequest;
import com.sharebite.backend.entity.*;
import com.sharebite.backend.exception.BadRequestException;
import com.sharebite.backend.exception.ForbiddenException;
import com.sharebite.backend.exception.NotFoundException;
import com.sharebite.backend.repository.FoodListingRepository;
import com.sharebite.backend.repository.ListingRequestRepository;
import com.sharebite.backend.repository.MessageRepository;
import com.sharebite.backend.repository.ReportRepository;
import com.sharebite.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ReportService {

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private FoodListingRepository foodListingRepository;

    @Autowired
    private ListingRequestRepository listingRequestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Transactional
    public void createReport(ReportCreateRequest body) {
        if (body == null) {
            throw new BadRequestException("Report payload is required");
        }

        User reporter = getCurrentUser();
        if (reporter.getRole() == Role.ADMIN) {
            throw new ForbiddenException("Admins cannot create reports");
        }

        ReportType type = parseType(body.type());
        ReportPolicyCategory policyCategory = parsePolicyCategory(body.policyCategory());
        ReportSeverity severity = parseSeverity(body.severity());
        LocalDateTime evidenceCapturedAt = LocalDateTime.now();

        Report report = new Report();
        report.setType(type);
        report.setStatus(ReportStatus.PENDING);
        report.setReason(sanitizeReason(body));
        report.setPolicyCategory(policyCategory);
        report.setSeverity(severity);
        report.setDetails(sanitizeDetails(body));
        report.setEvidenceCapturedAt(evidenceCapturedAt);
        report.setReporter(reporter);

        if (type == ReportType.LISTING) {
            if (body.listingId() == null || body.requestId() != null) {
                throw new BadRequestException("For LISTING reports, provide listingId and do not provide requestId");
            }
            if (body.reportedMessageId() != null) {
                throw new BadRequestException("Listing reports cannot target a specific message");
            }

            FoodListing listing = foodListingRepository.findById(body.listingId())
                    .orElseThrow(() -> new NotFoundException("Listing not found"));

            if (reportRepository.existsByReporterIdAndListingIdAndStatus(
                    reporter.getId(), body.listingId(), ReportStatus.PENDING)) {
                throw new BadRequestException("You already have a pending report for this listing");
            }

            report.setListing(listing);
            report.setRequest(null);
            report.setReportedMessageId(null);
            report.setEvidenceSnapshot(buildListingSnapshot(listing, evidenceCapturedAt));
        } else {
            if (body.requestId() == null || body.listingId() != null) {
                throw new BadRequestException("For REQUEST reports, provide requestId and do not provide listingId");
            }

            ListingRequest request = listingRequestRepository.findById(body.requestId())
                    .orElseThrow(() -> new NotFoundException("Request not found"));

            boolean participant = request.getRecipient().getId().equals(reporter.getId())
                    || request.getListing().getDonor().getId().equals(reporter.getId());
            if (!participant) {
                throw new ForbiddenException("You can only report request conversations you are part of");
            }

            if (reportRepository.existsByReporterIdAndRequestIdAndStatus(
                    reporter.getId(), body.requestId(), ReportStatus.PENDING)) {
                throw new BadRequestException("You already have a pending report for this request");
            }

            Message reportedMessage = resolveReportedMessage(request, body.reportedMessageId(), reporter);
            report.setRequest(request);
            report.setListing(null);
            report.setReportedMessageId(reportedMessage != null ? reportedMessage.getId() : null);
            report.setEvidenceSnapshot(buildRequestSnapshot(request, evidenceCapturedAt, reportedMessage));
        }

        reportRepository.save(report);
    }

    private ReportType parseType(String rawType) {
        if (rawType == null || rawType.isBlank()) {
            throw new BadRequestException("Report type is required and must be LISTING or REQUEST");
        }
        try {
            return ReportType.valueOf(rawType.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid report type. Use LISTING or REQUEST");
        }
    }

    private ReportPolicyCategory parsePolicyCategory(String rawCategory) {
        if (rawCategory == null || rawCategory.isBlank()) {
            return ReportPolicyCategory.OTHER;
        }
        try {
            return ReportPolicyCategory.valueOf(rawCategory.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Invalid policy category");
        }
    }

    private ReportSeverity parseSeverity(String rawSeverity) {
        if (rawSeverity == null || rawSeverity.isBlank()) {
            return ReportSeverity.MEDIUM;
        }
        try {
            return ReportSeverity.valueOf(rawSeverity.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Invalid report severity");
        }
    }

    private String sanitizeReason(ReportCreateRequest body) {
        String reason = body.reason();
        if (reason == null || reason.isBlank()) {
            throw new BadRequestException("Report reason is required");
        }
        String trimmed = reason.trim();
        return trimmed.length() > 500 ? trimmed.substring(0, 500) : trimmed;
    }

    private String sanitizeDetails(ReportCreateRequest body) {
        String details = body.details();
        if (details == null || details.isBlank()) {
            return null;
        }
        String trimmed = details.trim();
        return trimmed.length() > 4000 ? trimmed.substring(0, 4000) : trimmed;
    }

    private User getCurrentUser() {
        String usernameOrEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(usernameOrEmail)
                .or(() -> userRepository.findByEmail(usernameOrEmail))
                .orElseThrow(() -> new NotFoundException("Authenticated user not found"));
    }

    private Message resolveReportedMessage(ListingRequest request, java.util.UUID reportedMessageId, User reporter) {
        if (reportedMessageId == null) {
            return null;
        }

        Message message = messageRepository.findById(reportedMessageId)
                .orElseThrow(() -> new NotFoundException("Reported message not found"));

        if (message.getRequest() == null || !request.getId().equals(message.getRequest().getId())) {
            throw new BadRequestException("Reported message does not belong to this request");
        }
        if (message.getSender() != null && reporter.getId().equals(message.getSender().getId())) {
            throw new BadRequestException("You cannot report your own message");
        }

        return message;
    }

    private String buildListingSnapshot(FoodListing listing, LocalDateTime capturedAt) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("kind", ReportType.LISTING.name());
        snapshot.put("capturedAt", capturedAt);
        snapshot.put("listing", buildListingMap(listing));
        snapshot.put("donor", buildUserMap(listing.getDonor()));
        return serializeSnapshot(snapshot);
    }

    private String buildRequestSnapshot(ListingRequest request, LocalDateTime capturedAt, Message reportedMessage) {
        List<Message> messages = messageRepository.findByRequestIdOrderByTimestampAsc(request.getId());

        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("kind", ReportType.REQUEST.name());
        snapshot.put("capturedAt", capturedAt);
        snapshot.put("reportedMessageId", reportedMessage != null ? reportedMessage.getId() : null);
        snapshot.put("reportedMessageExcerpt", reportedMessage != null ? reportedMessage.getContent() : null);
        snapshot.put("request", buildRequestMap(request));
        snapshot.put("listing", buildListingMap(request.getListing()));
        snapshot.put("donor", buildUserMap(request.getListing().getDonor()));
        snapshot.put("recipient", buildUserMap(request.getRecipient()));
        snapshot.put(
                "messages",
                messages.stream().map(this::buildMessageMap).toList()
        );
        return serializeSnapshot(snapshot);
    }

    private Map<String, Object> buildListingMap(FoodListing listing) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", listing.getId());
        map.put("title", listing.getTitle());
        map.put("description", listing.getDescription());
        map.put("categoryName", listing.getCategory() != null ? listing.getCategory().getName() : null);
        map.put("quantity", listing.getQuantity());
        map.put("expiryDate", listing.getExpiryDate());
        map.put("location", listing.getLocation());
        map.put("imageUrl", listing.getImageUrl());
        map.put("status", listing.getStatus() != null ? listing.getStatus().name() : null);
        map.put("createdAt", listing.getCreatedAt());
        return map;
    }

    private Map<String, Object> buildRequestMap(ListingRequest request) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", request.getId());
        map.put("status", request.getStatus() != null ? request.getStatus().name() : null);
        map.put("requestDate", request.getRequestDate());
        map.put("decisionDate", request.getDecisionDate());
        map.put("completedDate", request.getCompletedDate());
        return map;
    }

    private Map<String, Object> buildUserMap(User user) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", user.getId());
        map.put("username", user.getUsername());
        map.put("displayName", user.getDisplayName());
        map.put("email", user.getEmail());
        map.put("role", user.getRole() != null ? user.getRole().name() : null);
        map.put("organisationName", user.getOrganisationName());
        map.put("status", user.getStatus() != null ? user.getStatus().name() : null);
        return map;
    }

    private Map<String, Object> buildMessageMap(Message message) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", message.getId());
        map.put("content", message.getContent());
        map.put("timestamp", message.getTimestamp());
        map.put("senderId", message.getSender().getId());
        map.put("senderUsername", message.getSender().getUsername());
        map.put("senderRole", message.getSender().getRole().name());
        return map;
    }

    private String serializeSnapshot(Map<String, Object> snapshot) {
        try {
            return objectMapper.writeValueAsString(snapshot);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to capture report evidence snapshot", exception);
        }
    }
}
