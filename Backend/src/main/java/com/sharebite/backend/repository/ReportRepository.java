package com.sharebite.backend.repository;

import com.sharebite.backend.entity.Report;
import com.sharebite.backend.entity.ReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReportRepository extends JpaRepository<Report, UUID> {

    List<Report> findByStatusOrderByCreatedAtDesc(ReportStatus status);

    List<Report> findAllByOrderByCreatedAtDesc();

    boolean existsByReporterIdAndListingIdAndStatus(UUID reporterId, UUID listingId, ReportStatus status);

    boolean existsByReporterIdAndRequestIdAndStatus(UUID reporterId, UUID requestId, ReportStatus status);
}
