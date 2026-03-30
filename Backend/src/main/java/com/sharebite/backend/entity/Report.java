package com.sharebite.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "reports", indexes = {
    @Index(name = "idx_reports_status", columnList = "status"),
    @Index(name = "idx_reports_created_at", columnList = "createdAt"),
    @Index(name = "idx_reports_type", columnList = "type")
})
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportStatus status;

    @Column(length = 500)
    private String reason;

    // Longer optional explanation from reporter (maps to TEXT on PostgreSQL)
    @Lob
    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime reviewedAt;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String evidenceSnapshot;

    @ManyToOne
    @JoinColumn(name = "reporter_id", nullable = false)
    private User reporter;

    @ManyToOne
    @JoinColumn(name = "reviewed_by_admin_id")
    private User reviewedByAdmin;

    @ManyToOne
    @JoinColumn(name = "listing_id")
    private FoodListing listing;

    @ManyToOne
    @JoinColumn(name = "request_id")
    private ListingRequest request;

    private void validateTargetConsistency() {
        if (type == null) {
            throw new IllegalStateException("Report type is required");
        }

        if (type == ReportType.LISTING) {
            if (listing == null) {
                throw new IllegalStateException("Listing report must reference a listing");
            }
            if (request != null) {
                throw new IllegalStateException("Listing report must not reference a request");
            }
        }

        if (type == ReportType.REQUEST) {
            if (request == null) {
                throw new IllegalStateException("Request report must reference a request");
            }
            if (listing != null) {
                throw new IllegalStateException("Request report must not reference a listing");
            }
        }
    }

    @PrePersist
    @PreUpdate
    protected void onCreate() {
        validateTargetConsistency();

        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = ReportStatus.PENDING;
        }
    }
}
