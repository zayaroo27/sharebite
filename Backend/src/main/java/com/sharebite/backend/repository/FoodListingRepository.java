package com.sharebite.backend.repository;

import com.sharebite.backend.entity.FoodListing;
import com.sharebite.backend.entity.ListingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface FoodListingRepository extends JpaRepository<FoodListing, UUID> {

    List<FoodListing> findByStatus(ListingStatus status);

    List<FoodListing> findByDonorId(UUID donorId);

       List<FoodListing> findByStatusAndExpiryDateBefore(ListingStatus status, LocalDate date);

    @Query("SELECT f FROM FoodListing f WHERE f.status = :status AND f.expiryDate >= CURRENT_DATE")
    List<FoodListing> findAvailableNotExpired(@Param("status") ListingStatus status);

    @Query("SELECT f FROM FoodListing f WHERE f.status = 'AVAILABLE' AND f.expiryDate >= CURRENT_DATE")
    List<FoodListing> findAvailableNotExpired();

    @Query("SELECT f FROM FoodListing f WHERE f.status = 'AVAILABLE' AND f.expiryDate >= CURRENT_DATE AND f.category.id = :categoryId")
    List<FoodListing> findAvailableNotExpiredByCategoryId(@Param("categoryId") UUID categoryId);

    @Query("SELECT f FROM FoodListing f WHERE f.status = 'AVAILABLE' AND f.expiryDate >= CURRENT_DATE AND " +
           "(LOWER(f.title) LIKE CONCAT('%', LOWER(:keyword), '%') OR LOWER(f.description) LIKE CONCAT('%', LOWER(:keyword), '%'))")
    List<FoodListing> findAvailableNotExpiredByKeyword(@Param("keyword") String keyword);

    @Query("SELECT f FROM FoodListing f WHERE f.status = 'AVAILABLE' AND f.expiryDate >= CURRENT_DATE AND " +
           "(LOWER(f.title) LIKE CONCAT('%', LOWER(:keyword), '%') OR LOWER(f.description) LIKE CONCAT('%', LOWER(:keyword), '%')) AND " +
           "f.category.id = :categoryId")
    List<FoodListing> findAvailableNotExpiredByKeywordAndCategoryId(@Param("keyword") String keyword, @Param("categoryId") UUID categoryId);

    @Query("SELECT f FROM FoodListing f WHERE f.status = 'AVAILABLE' AND f.expiryDate >= CURRENT_DATE AND " +
           "LOWER(f.location) LIKE CONCAT('%', LOWER(:location), '%')")
    List<FoodListing> findAvailableNotExpiredByLocation(@Param("location") String location);

    @Query("SELECT f FROM FoodListing f WHERE f.status = 'AVAILABLE' AND f.expiryDate >= CURRENT_DATE AND " +
           "LOWER(f.location) LIKE CONCAT('%', LOWER(:location), '%') AND " +
           "f.category.id = :categoryId")
    List<FoodListing> findAvailableNotExpiredByLocationAndCategoryId(@Param("location") String location, @Param("categoryId") UUID categoryId);

    @Query("SELECT f FROM FoodListing f WHERE f.status = 'AVAILABLE' AND f.expiryDate >= CURRENT_DATE AND " +
           "(LOWER(f.title) LIKE CONCAT('%', LOWER(:keyword), '%') OR LOWER(f.description) LIKE CONCAT('%', LOWER(:keyword), '%')) AND " +
           "LOWER(f.location) LIKE CONCAT('%', LOWER(:location), '%')")
    List<FoodListing> findAvailableNotExpiredByKeywordAndLocation(@Param("keyword") String keyword, @Param("location") String location);

    @Query("SELECT f FROM FoodListing f WHERE f.status = 'AVAILABLE' AND f.expiryDate >= CURRENT_DATE AND " +
           "(LOWER(f.title) LIKE CONCAT('%', LOWER(:keyword), '%') OR LOWER(f.description) LIKE CONCAT('%', LOWER(:keyword), '%')) AND " +
           "LOWER(f.location) LIKE CONCAT('%', LOWER(:location), '%') AND " +
           "f.category.id = :categoryId")
    List<FoodListing> findAvailableNotExpiredByKeywordAndLocationAndCategoryId(@Param("keyword") String keyword, @Param("location") String location, @Param("categoryId") UUID categoryId);

    long countByStatus(ListingStatus status);
}