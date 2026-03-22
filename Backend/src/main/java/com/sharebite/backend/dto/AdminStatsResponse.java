package com.sharebite.backend.dto;

public record AdminStatsResponse(
    long totalUsers,
    long totalListings,
    long availableListings,
    long expiredListings,
    long completedListings,
    long totalRequests,
    long completedRequests,
    long totalMessages,
    long totalCategories,
    long totalNotifications
) {}