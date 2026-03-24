package com.sharebite.backend.controller;

import com.sharebite.backend.dto.AdminStatsResponse;
import com.sharebite.backend.dto.AdminReportResponse;
import com.sharebite.backend.dto.AdminUserResponse;
import com.sharebite.backend.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @GetMapping("/users")
    public ResponseEntity<List<AdminUserResponse>> getAllUsers() {
        List<AdminUserResponse> users = adminService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    @PatchMapping("/users/{id}/suspend")
    public ResponseEntity<AdminUserResponse> suspendUser(@PathVariable UUID id) {
        AdminUserResponse response = adminService.suspendUser(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/users/{id}/activate")
    public ResponseEntity<AdminUserResponse> activateUser(@PathVariable UUID id) {
        AdminUserResponse response = adminService.activateUser(id);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/listings/{id}")
    public ResponseEntity<Void> deleteListing(@PathVariable UUID id) {
        adminService.deleteListing(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stats")
    public ResponseEntity<AdminStatsResponse> getStats() {
        AdminStatsResponse stats = adminService.getStats();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/reports")
    public ResponseEntity<List<AdminReportResponse>> getOpenReports() {
        List<AdminReportResponse> reports = adminService.getOpenReports();
        return ResponseEntity.ok(reports);
    }

    @PatchMapping("/reports/{id}/resolve")
    public ResponseEntity<AdminReportResponse> resolveReport(@PathVariable UUID id) {
        AdminReportResponse response = adminService.resolveReport(id);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/reports/{id}/dismiss")
    public ResponseEntity<AdminReportResponse> dismissReport(@PathVariable UUID id) {
        AdminReportResponse response = adminService.dismissReport(id);
        return ResponseEntity.ok(response);
    }
}