package com.sharebite.backend.repository;

import com.sharebite.backend.entity.ListingRequest;
import com.sharebite.backend.entity.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ListingRequestRepository extends JpaRepository<ListingRequest, UUID> {

    List<ListingRequest> findByRecipientIdOrderByRequestDateDesc(UUID recipientId);

    long countByRecipientId(UUID recipientId);

    long countByRecipientIdAndStatus(UUID recipientId, RequestStatus status);

    @Query("SELECT r FROM ListingRequest r WHERE r.listing.donor.id = :donorId ORDER BY r.requestDate DESC")
    List<ListingRequest> findByDonorIdOrderByRequestDateDesc(@Param("donorId") UUID donorId);

    boolean existsByListingIdAndRecipientIdAndStatusIn(UUID listingId, UUID recipientId, Collection<RequestStatus> statuses);

    Optional<ListingRequest> findByListingIdAndStatus(UUID listingId, RequestStatus status);

    List<ListingRequest> findByListingIdAndStatusAndIdNot(UUID listingId, RequestStatus status, UUID id);

    List<ListingRequest> findByListingId(UUID listingId);

    void deleteByListingId(UUID listingId);

    long countByStatus(RequestStatus status);
}
