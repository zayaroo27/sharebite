package com.sharebite.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Entity
@Table(name = "listing_requests", indexes = {
    @Index(name = "idx_listing_requests_listing_id", columnList = "listing_id"),
    @Index(name = "idx_listing_requests_recipient_id", columnList = "recipient_id")
})
public class ListingRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestStatus status;

    @Column(nullable = false)
    private LocalDateTime requestDate;

    @Column
    private LocalDateTime decisionDate;

    @Column
    private LocalDateTime completedDate;

    @ManyToOne
    @JoinColumn(name = "listing_id", nullable = false)
    private FoodListing listing;

    @ManyToOne
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Message> messages;

    @Version
    private Long version;

    @PrePersist
    protected void onCreate() {
        if (requestDate == null) {
            requestDate = LocalDateTime.now();
        }
        if (status == null) {
            status = RequestStatus.PENDING;
        }
    }
}