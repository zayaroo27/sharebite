package com.sharebite.backend.repository;

import com.sharebite.backend.entity.Report;
import com.sharebite.backend.entity.ReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReportRepository extends JpaRepository<Report, UUID> {

    List<Report> findByStatusOrderByCreatedAtDesc(ReportStatus status);

    List<Report> findAllByOrderByCreatedAtDesc();

    List<Report> findByStatusNotOrderByCreatedAtDesc(ReportStatus status);

    List<Report> findByListingId(UUID listingId);

    boolean existsByReporterIdAndListingIdAndStatus(UUID reporterId, UUID listingId, ReportStatus status);

    boolean existsByReporterIdAndRequestIdAndStatus(UUID reporterId, UUID requestId, ReportStatus status);

    @Query("SELECT r FROM Report r WHERE r.request IS NOT NULL AND r.request.listing.id = :listingId")
    List<Report> findRequestReportsForListingId(@Param("listingId") UUID listingId);
}
