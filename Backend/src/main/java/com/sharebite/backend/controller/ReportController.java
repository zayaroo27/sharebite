package com.sharebite.backend.controller;

import com.sharebite.backend.dto.ReportCreateRequest;
import com.sharebite.backend.service.ReportService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@PreAuthorize("isAuthenticated()")
public class ReportController {

    @Autowired
    private ReportService reportService;

    @PostMapping
    public ResponseEntity<Void> createReport(@Valid @RequestBody ReportCreateRequest body) {
        reportService.createReport(body);
        return ResponseEntity.noContent().build();
    }
}
