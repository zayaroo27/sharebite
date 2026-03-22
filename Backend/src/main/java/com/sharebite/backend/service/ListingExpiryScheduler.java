package com.sharebite.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ListingExpiryScheduler {

    @Autowired
    private FoodListingService foodListingService;

    @Scheduled(cron = "0 0 * * * *")
    public void markExpiredListings() {
        foodListingService.markExpiredListings();
    }
}