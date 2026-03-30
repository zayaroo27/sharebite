package com.sharebite.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharebite.backend.dto.ReportCreateRequest;
import com.sharebite.backend.entity.Role;
import com.sharebite.backend.entity.User;
import com.sharebite.backend.exception.ForbiddenException;
import com.sharebite.backend.repository.FoodListingRepository;
import com.sharebite.backend.repository.ListingRequestRepository;
import com.sharebite.backend.repository.MessageRepository;
import com.sharebite.backend.repository.ReportRepository;
import com.sharebite.backend.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReportServiceTest {

    private ReportService reportService;
    private ReportRepository reportRepository;
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        reportService = new ReportService();
        reportRepository = Mockito.mock(ReportRepository.class);
        userRepository = Mockito.mock(UserRepository.class);

        ReflectionTestUtils.setField(reportService, "reportRepository", reportRepository);
        ReflectionTestUtils.setField(reportService, "foodListingRepository", Mockito.mock(FoodListingRepository.class));
        ReflectionTestUtils.setField(reportService, "listingRequestRepository", Mockito.mock(ListingRequestRepository.class));
        ReflectionTestUtils.setField(reportService, "userRepository", userRepository);
        ReflectionTestUtils.setField(reportService, "messageRepository", Mockito.mock(MessageRepository.class));
        ReflectionTestUtils.setField(reportService, "objectMapper", new ObjectMapper());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createReport_WhenReporterIsAdmin_ShouldReject() {
        User admin = new User();
        admin.setId(UUID.randomUUID());
        admin.setUsername("admin");
        admin.setRole(Role.ADMIN);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin.getUsername(), "secret")
        );

        when(userRepository.findByUsername(admin.getUsername())).thenReturn(Optional.of(admin));

        ForbiddenException exception = assertThrows(
                ForbiddenException.class,
                () -> reportService.createReport(
                        new ReportCreateRequest("LISTING", "Misleading listing", null, UUID.randomUUID(), null)
                )
        );

        assertEquals("Admins cannot create reports", exception.getMessage());
        verify(reportRepository, never()).save(Mockito.any());
    }
}
