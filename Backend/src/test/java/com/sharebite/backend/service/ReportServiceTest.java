package com.sharebite.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharebite.backend.dto.ReportCreateRequest;
import com.sharebite.backend.entity.AccountStatus;
import com.sharebite.backend.entity.FoodListing;
import com.sharebite.backend.entity.ListingRequest;
import com.sharebite.backend.entity.ListingStatus;
import com.sharebite.backend.entity.Message;
import com.sharebite.backend.entity.Report;
import com.sharebite.backend.entity.ReportPolicyCategory;
import com.sharebite.backend.entity.ReportSeverity;
import com.sharebite.backend.entity.ReportStatus;
import com.sharebite.backend.entity.Role;
import com.sharebite.backend.entity.RequestStatus;
import com.sharebite.backend.entity.User;
import com.sharebite.backend.exception.BadRequestException;
import com.sharebite.backend.exception.ForbiddenException;
import com.sharebite.backend.repository.FoodListingRepository;
import com.sharebite.backend.repository.ListingRequestRepository;
import com.sharebite.backend.repository.MessageRepository;
import com.sharebite.backend.repository.ReportRepository;
import com.sharebite.backend.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReportServiceTest {

    private ReportService reportService;
    private ReportRepository reportRepository;
    private UserRepository userRepository;
    private ListingRequestRepository listingRequestRepository;
    private MessageRepository messageRepository;

    @BeforeEach
    void setUp() {
        reportService = new ReportService();
        reportRepository = Mockito.mock(ReportRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        listingRequestRepository = Mockito.mock(ListingRequestRepository.class);
        messageRepository = Mockito.mock(MessageRepository.class);

        ReflectionTestUtils.setField(reportService, "reportRepository", reportRepository);
        ReflectionTestUtils.setField(reportService, "foodListingRepository", Mockito.mock(FoodListingRepository.class));
        ReflectionTestUtils.setField(reportService, "listingRequestRepository", listingRequestRepository);
        ReflectionTestUtils.setField(reportService, "userRepository", userRepository);
        ReflectionTestUtils.setField(reportService, "messageRepository", messageRepository);
        ReflectionTestUtils.setField(reportService, "objectMapper", new ObjectMapper().findAndRegisterModules());
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
                        new ReportCreateRequest(
                                "LISTING",
                                "Misleading listing",
                                "MISLEADING_LISTING",
                                "HIGH",
                                null,
                                UUID.randomUUID(),
                                null,
                                null
                        )
                )
        );

        assertEquals("Admins cannot create reports", exception.getMessage());
        verify(reportRepository, never()).save(Mockito.any());
    }

    @Test
    void createReport_WhenRequestMessageIsReported_ShouldCaptureModerationMetadata() {
        User reporter = new User();
        reporter.setId(UUID.randomUUID());
        reporter.setUsername("recipient");
        reporter.setEmail("recipient@example.com");
        reporter.setRole(Role.RECIPIENT);
        reporter.setStatus(AccountStatus.ACTIVE);

        User donor = new User();
        donor.setId(UUID.randomUUID());
        donor.setUsername("donor");
        donor.setEmail("donor@example.com");
        donor.setRole(Role.DONOR);
        donor.setStatus(AccountStatus.ACTIVE);

        FoodListing listing = new FoodListing();
        listing.setId(UUID.randomUUID());
        listing.setTitle("Fresh rice meals");
        listing.setDescription("Packed meals");
        listing.setQuantity("10 boxes");
        listing.setExpiryDate(LocalDate.now().plusDays(1));
        listing.setLocation("Yangon");
        listing.setStatus(ListingStatus.AVAILABLE);
        listing.setDonor(donor);

        ListingRequest request = new ListingRequest();
        request.setId(UUID.randomUUID());
        request.setListing(listing);
        request.setRecipient(reporter);
        request.setStatus(RequestStatus.APPROVED);
        request.setRequestDate(LocalDateTime.now().minusHours(2));

        Message reportedMessage = new Message();
        reportedMessage.setId(UUID.randomUUID());
        reportedMessage.setContent("You must pay first.");
        reportedMessage.setTimestamp(LocalDateTime.now().minusHours(1));
        reportedMessage.setSender(donor);
        reportedMessage.setReceiver(reporter);
        reportedMessage.setRequest(request);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(reporter.getUsername(), "secret")
        );

        when(userRepository.findByUsername(reporter.getUsername())).thenReturn(Optional.of(reporter));
        when(listingRequestRepository.findById(request.getId())).thenReturn(Optional.of(request));
        when(reportRepository.existsByReporterIdAndRequestIdAndStatus(
                reporter.getId(), request.getId(), ReportStatus.PENDING
        )).thenReturn(false);
        when(messageRepository.findById(reportedMessage.getId())).thenReturn(Optional.of(reportedMessage));
        when(messageRepository.findByRequestIdOrderByTimestampAsc(request.getId())).thenReturn(List.of(reportedMessage));

        reportService.createReport(
                new ReportCreateRequest(
                        "REQUEST",
                        "Possible scam",
                        "SCAM_FRAUD",
                        "CRITICAL",
                        "The donor asked for money before pickup.",
                        null,
                        request.getId(),
                        reportedMessage.getId()
                )
        );

        ArgumentCaptor<Report> captor = ArgumentCaptor.forClass(Report.class);
        verify(reportRepository).save(captor.capture());

        Report saved = captor.getValue();
        assertEquals(ReportPolicyCategory.SCAM_FRAUD, saved.getPolicyCategory());
        assertEquals(ReportSeverity.CRITICAL, saved.getSeverity());
        assertEquals(reportedMessage.getId(), saved.getReportedMessageId());
        assertNotNull(saved.getEvidenceCapturedAt());
        assertTrue(saved.getEvidenceSnapshot().contains("reportedMessageExcerpt"));
        assertTrue(saved.getEvidenceSnapshot().contains("You must pay first."));
    }

    @Test
    void createReport_WhenReporterTargetsOwnMessage_ShouldReject() {
        User reporter = new User();
        reporter.setId(UUID.randomUUID());
        reporter.setUsername("recipient");
        reporter.setEmail("recipient@example.com");
        reporter.setRole(Role.RECIPIENT);
        reporter.setStatus(AccountStatus.ACTIVE);

        User donor = new User();
        donor.setId(UUID.randomUUID());
        donor.setUsername("donor");
        donor.setEmail("donor@example.com");
        donor.setRole(Role.DONOR);
        donor.setStatus(AccountStatus.ACTIVE);

        FoodListing listing = new FoodListing();
        listing.setId(UUID.randomUUID());
        listing.setTitle("Rice");
        listing.setExpiryDate(LocalDate.now().plusDays(1));
        listing.setLocation("Yangon");
        listing.setStatus(ListingStatus.AVAILABLE);
        listing.setDonor(donor);

        ListingRequest request = new ListingRequest();
        request.setId(UUID.randomUUID());
        request.setListing(listing);
        request.setRecipient(reporter);
        request.setStatus(RequestStatus.APPROVED);

        Message ownMessage = new Message();
        ownMessage.setId(UUID.randomUUID());
        ownMessage.setContent("I sent this.");
        ownMessage.setTimestamp(LocalDateTime.now().minusMinutes(10));
        ownMessage.setSender(reporter);
        ownMessage.setReceiver(donor);
        ownMessage.setRequest(request);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(reporter.getUsername(), "secret")
        );

        when(userRepository.findByUsername(reporter.getUsername())).thenReturn(Optional.of(reporter));
        when(listingRequestRepository.findById(request.getId())).thenReturn(Optional.of(request));
        when(reportRepository.existsByReporterIdAndRequestIdAndStatus(
                reporter.getId(), request.getId(), ReportStatus.PENDING
        )).thenReturn(false);
        when(messageRepository.findById(ownMessage.getId())).thenReturn(Optional.of(ownMessage));

        BadRequestException exception = assertThrows(
                BadRequestException.class,
                () -> reportService.createReport(
                        new ReportCreateRequest(
                                "REQUEST",
                                "Abuse",
                                "ABUSE",
                                "HIGH",
                                "Trying to report my own message should fail.",
                                null,
                                request.getId(),
                                ownMessage.getId()
                        )
                )
        );

        assertEquals("You cannot report your own message", exception.getMessage());
        verify(reportRepository, never()).save(Mockito.any());
    }
}
