package com.sharebite.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharebite.backend.dto.AdminReportDetailResponse;
import com.sharebite.backend.dto.AdminReportReviewRequest;
import com.sharebite.backend.dto.AdminReportResponse;
import com.sharebite.backend.entity.AccountStatus;
import com.sharebite.backend.entity.FoodListing;
import com.sharebite.backend.entity.ListingStatus;
import com.sharebite.backend.entity.ModerationActionTargetType;
import com.sharebite.backend.entity.ModerationActionType;
import com.sharebite.backend.entity.Report;
import com.sharebite.backend.entity.ReportPolicyCategory;
import com.sharebite.backend.entity.ReportSeverity;
import com.sharebite.backend.entity.ReportStatus;
import com.sharebite.backend.entity.ReportType;
import com.sharebite.backend.entity.Role;
import com.sharebite.backend.entity.User;
import com.sharebite.backend.entity.NotificationType;
import com.sharebite.backend.repository.CategoryRepository;
import com.sharebite.backend.repository.FoodListingRepository;
import com.sharebite.backend.repository.ListingRequestRepository;
import com.sharebite.backend.repository.MessageRepository;
import com.sharebite.backend.repository.NotificationRepository;
import com.sharebite.backend.repository.ReportRepository;
import com.sharebite.backend.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class AdminServiceTest {

    private AdminService adminService;
    private ReportRepository reportRepository;
    private UserRepository userRepository;
    private NotificationService notificationService;
    private FoodListingRepository foodListingRepository;

    @BeforeEach
    void setUp() {
        adminService = new AdminService();
        reportRepository = Mockito.mock(ReportRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        notificationService = Mockito.mock(NotificationService.class);
        foodListingRepository = Mockito.mock(FoodListingRepository.class);

        ReflectionTestUtils.setField(adminService, "userRepository", userRepository);
        ReflectionTestUtils.setField(adminService, "foodListingRepository", foodListingRepository);
        ReflectionTestUtils.setField(adminService, "listingRequestRepository", Mockito.mock(ListingRequestRepository.class));
        ReflectionTestUtils.setField(adminService, "messageRepository", Mockito.mock(MessageRepository.class));
        ReflectionTestUtils.setField(adminService, "categoryRepository", Mockito.mock(CategoryRepository.class));
        ReflectionTestUtils.setField(adminService, "notificationRepository", Mockito.mock(NotificationRepository.class));
        ReflectionTestUtils.setField(adminService, "notificationService", notificationService);
        ReflectionTestUtils.setField(adminService, "reportRepository", reportRepository);
        ReflectionTestUtils.setField(adminService, "objectMapper", new ObjectMapper().findAndRegisterModules());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getReportDetail_ShouldPreferSnapshotEvidenceAndExposeCurrentStateSeparately() {
        UUID reportId = UUID.randomUUID();
        UUID listingId = UUID.randomUUID();

        User reporter = new User();
        reporter.setId(UUID.randomUUID());
        reporter.setUsername("reporter");
        reporter.setEmail("reporter@example.com");
        reporter.setRole(Role.RECIPIENT);
        reporter.setStatus(AccountStatus.ACTIVE);

        User liveDonor = new User();
        liveDonor.setId(UUID.randomUUID());
        liveDonor.setUsername("live_donor");
        liveDonor.setEmail("donor@example.com");
        liveDonor.setRole(Role.DONOR);
        liveDonor.setStatus(AccountStatus.ACTIVE);

        FoodListing liveListing = new FoodListing();
        liveListing.setId(listingId);
        liveListing.setTitle("Edited live title");
        liveListing.setDescription("Edited description");
        liveListing.setQuantity("4 trays");
        liveListing.setExpiryDate(LocalDate.now().plusDays(2));
        liveListing.setLocation("Downtown");
        liveListing.setStatus(ListingStatus.RESERVED);
        liveListing.setDonor(liveDonor);

        Report report = new Report();
        report.setId(reportId);
        report.setType(ReportType.LISTING);
        report.setStatus(ReportStatus.PENDING);
        report.setReason("Looks misleading");
        report.setPolicyCategory(ReportPolicyCategory.MISLEADING_LISTING);
        report.setSeverity(ReportSeverity.HIGH);
        report.setCreatedAt(LocalDateTime.now().minusHours(4));
        report.setEvidenceCapturedAt(LocalDateTime.now().minusHours(4));
        report.setReporter(reporter);
        report.setListing(liveListing);
        report.setEvidenceSnapshot(
                """
                {
                  "kind": "LISTING",
                  "capturedAt": "2026-04-25T07:00:00",
                  "listing": {
                    "id": "%s",
                    "title": "Original reported title",
                    "description": "Original reported description",
                    "categoryName": "Meals",
                    "quantity": "10 boxes",
                    "expiryDate": "2026-04-26",
                    "location": "North district",
                    "imageUrl": "https://example.com/original.jpg",
                    "status": "AVAILABLE"
                  },
                  "donor": {
                    "id": "%s",
                    "username": "snapshot_donor",
                    "displayName": "Snapshot Donor",
                    "email": "snapshot@example.com",
                    "role": "DONOR",
                    "organisationName": "Snapshot Org"
                  }
                }
                """.formatted(listingId, liveDonor.getId())
        );

        when(reportRepository.findById(reportId)).thenReturn(Optional.of(report));

        AdminReportDetailResponse detail = adminService.getReportDetail(reportId);

        assertEquals("Original reported title", detail.listingEvidence().title());
        assertTrue(detail.listingEvidence().fromSnapshot());
        assertEquals("Edited live title", detail.currentListingEvidence().title());
        assertEquals("Snapshot Donor", detail.listingEvidence().donor().displayName());
    }

    @Test
    void resolveReport_ShouldPersistDecisionNoteAndModerationAction() {
        UUID reportId = UUID.randomUUID();
        UUID listingId = UUID.randomUUID();

        User admin = new User();
        admin.setId(UUID.randomUUID());
        admin.setUsername("moderator");
        admin.setEmail("moderator@example.com");
        admin.setRole(Role.ADMIN);
        admin.setStatus(AccountStatus.ACTIVE);

        Report report = new Report();
        report.setId(reportId);
        report.setType(ReportType.LISTING);
        report.setStatus(ReportStatus.PENDING);
        report.setReason("Unsafe listing");

        User donor = new User();
        donor.setId(UUID.randomUUID());
        donor.setUsername("listingdonor");
        donor.setEmail("listingdonor@example.com");
        donor.setRole(Role.DONOR);
        donor.setStatus(AccountStatus.ACTIVE);

        FoodListing listing = new FoodListing();
        listing.setId(listingId);
        listing.setDonor(donor);
        listing.setTitle("Unsafe listing");
        listing.setStatus(ListingStatus.AVAILABLE);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin.getUsername(), "secret")
        );

        when(userRepository.findByUsername(admin.getUsername())).thenReturn(Optional.of(admin));
        when(foodListingRepository.findById(listingId)).thenReturn(Optional.of(listing));
        when(foodListingRepository.save(any(FoodListing.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(reportRepository.findById(reportId)).thenReturn(Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminReportResponse response = adminService.resolveReport(
                reportId,
                new AdminReportReviewRequest(
                        "Confirmed misleading and unsafe listing details.",
                        "REMOVE_LISTING",
                        "LISTING",
                        listingId
                )
        );

        assertEquals("RESOLVED", response.status());
        assertEquals("REMOVE_LISTING", response.actionTaken());
        assertEquals(ModerationActionType.REMOVE_LISTING, report.getActionTaken());
        assertEquals(ModerationActionTargetType.LISTING, report.getActionTargetType());
        assertEquals(listingId, report.getActionTargetId());
        assertEquals("Confirmed misleading and unsafe listing details.", report.getDecisionNote());
        assertEquals(admin, report.getReviewedByAdmin());
        assertNotNull(report.getReviewedAt());
        assertNotNull(report.getActionTakenAt());
    }

    @Test
    void resolveReport_ShouldWarnTargetUserAutomatically() {
        UUID reportId = UUID.randomUUID();
        UUID targetUserId = UUID.randomUUID();

        User admin = new User();
        admin.setId(UUID.randomUUID());
        admin.setUsername("moderator");
        admin.setEmail("moderator@example.com");
        admin.setRole(Role.ADMIN);
        admin.setStatus(AccountStatus.ACTIVE);

        User targetUser = new User();
        targetUser.setId(targetUserId);
        targetUser.setUsername("recipient1");
        targetUser.setEmail("recipient1@example.com");
        targetUser.setRole(Role.RECIPIENT);
        targetUser.setStatus(AccountStatus.ACTIVE);

        Report report = new Report();
        report.setId(reportId);
        report.setType(ReportType.REQUEST);
        report.setStatus(ReportStatus.PENDING);
        report.setReason("Harassment");

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin.getUsername(), "secret")
        );

        when(userRepository.findByUsername(admin.getUsername())).thenReturn(Optional.of(admin));
        when(userRepository.findById(targetUserId)).thenReturn(Optional.of(targetUser));
        when(reportRepository.findById(reportId)).thenReturn(Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));

        adminService.resolveReport(
                reportId,
                new AdminReportReviewRequest(
                        "The evidence shows abusive behaviour in the conversation.",
                        "WARN_USER",
                        "USER",
                        targetUserId
                )
        );

        verify(notificationService).createNotification(
                eq(targetUser),
                eq("Account warning"),
                eq("An admin issued a warning on your ShareBite account. Reason: The evidence shows abusive behaviour in the conversation."),
                eq(NotificationType.MODERATION_WARNING)
        );
    }

    @Test
    void resolveReport_ShouldSuspendTargetUserAutomatically() {
        UUID reportId = UUID.randomUUID();
        UUID targetUserId = UUID.randomUUID();

        User admin = new User();
        admin.setId(UUID.randomUUID());
        admin.setUsername("moderator");
        admin.setEmail("moderator@example.com");
        admin.setRole(Role.ADMIN);
        admin.setStatus(AccountStatus.ACTIVE);

        User targetUser = new User();
        targetUser.setId(targetUserId);
        targetUser.setUsername("donor1");
        targetUser.setEmail("donor1@example.com");
        targetUser.setRole(Role.DONOR);
        targetUser.setStatus(AccountStatus.ACTIVE);

        Report report = new Report();
        report.setId(reportId);
        report.setType(ReportType.LISTING);
        report.setStatus(ReportStatus.PENDING);
        report.setReason("Unsafe listing");

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin.getUsername(), "secret")
        );

        when(userRepository.findByUsername(admin.getUsername())).thenReturn(Optional.of(admin));
        when(userRepository.findById(targetUserId)).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(reportRepository.findById(reportId)).thenReturn(Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));

        adminService.resolveReport(
                reportId,
                new AdminReportReviewRequest(
                        "Repeated unsafe behaviour requires account suspension.",
                        "SUSPEND_USER",
                        "USER",
                        targetUserId
                )
        );

        assertEquals(AccountStatus.SUSPENDED, targetUser.getStatus());
        verify(notificationService).createNotification(
                eq(targetUser),
                eq("Account suspended"),
                eq("An admin suspended your ShareBite account. Reason: Repeated unsafe behaviour requires account suspension."),
                eq(NotificationType.ACCOUNT_SUSPENDED)
        );
    }

    @Test
    void resolveReport_ShouldPersistMonitoringFlagAndNotifyUser() {
        UUID reportId = UUID.randomUUID();
        UUID targetUserId = UUID.randomUUID();

        User admin = new User();
        admin.setId(UUID.randomUUID());
        admin.setUsername("moderator");
        admin.setEmail("moderator@example.com");
        admin.setRole(Role.ADMIN);
        admin.setStatus(AccountStatus.ACTIVE);

        User targetUser = new User();
        targetUser.setId(targetUserId);
        targetUser.setUsername("recipient2");
        targetUser.setEmail("recipient2@example.com");
        targetUser.setRole(Role.RECIPIENT);
        targetUser.setStatus(AccountStatus.ACTIVE);

        Report report = new Report();
        report.setId(reportId);
        report.setType(ReportType.REQUEST);
        report.setStatus(ReportStatus.PENDING);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin.getUsername(), "secret")
        );

        when(userRepository.findByUsername(admin.getUsername())).thenReturn(Optional.of(admin));
        when(userRepository.findById(targetUserId)).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(reportRepository.findById(reportId)).thenReturn(Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));

        adminService.resolveReport(
                reportId,
                new AdminReportReviewRequest(
                        "This account should be watched for repeated borderline behaviour.",
                        "MONITOR_ACCOUNT",
                        "USER",
                        targetUserId
                )
        );

        assertNotNull(targetUser.getMonitoredAt());
        verify(notificationService).createNotification(
                eq(targetUser),
                eq("Account under monitoring"),
                eq("An admin placed your ShareBite account under monitoring. Reason: This account should be watched for repeated borderline behaviour."),
                eq(NotificationType.ACCOUNT_MONITORED)
        );
    }

    @Test
    void resolveReport_ShouldRemoveListingFromPublicVisibilityAndNotifyDonor() {
        UUID reportId = UUID.randomUUID();
        UUID listingId = UUID.randomUUID();

        User admin = new User();
        admin.setId(UUID.randomUUID());
        admin.setUsername("moderator");
        admin.setEmail("moderator@example.com");
        admin.setRole(Role.ADMIN);
        admin.setStatus(AccountStatus.ACTIVE);

        User donor = new User();
        donor.setId(UUID.randomUUID());
        donor.setUsername("donor2");
        donor.setEmail("donor2@example.com");
        donor.setRole(Role.DONOR);
        donor.setStatus(AccountStatus.ACTIVE);

        FoodListing listing = new FoodListing();
        listing.setId(listingId);
        listing.setDonor(donor);
        listing.setStatus(ListingStatus.AVAILABLE);
        listing.setTitle("Unsafe fruit listing");

        Report report = new Report();
        report.setId(reportId);
        report.setType(ReportType.LISTING);
        report.setStatus(ReportStatus.PENDING);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin.getUsername(), "secret")
        );

        when(userRepository.findByUsername(admin.getUsername())).thenReturn(Optional.of(admin));
        when(foodListingRepository.findById(listingId)).thenReturn(Optional.of(listing));
        when(foodListingRepository.save(any(FoodListing.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(reportRepository.findById(reportId)).thenReturn(Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));

        adminService.resolveReport(
                reportId,
                new AdminReportReviewRequest(
                        "The listing contains unsafe and misleading information.",
                        "REMOVE_LISTING",
                        "LISTING",
                        listingId
                )
        );

        assertNotNull(listing.getRemovedByModerationAt());
        verify(notificationService).createNotification(
                eq(donor),
                eq("Listing removed by moderation"),
                eq("An admin removed one of your ShareBite listings from public visibility. Reason: The listing contains unsafe and misleading information."),
                eq(NotificationType.LISTING_REMOVED)
        );
    }

    @Test
    void resolveReport_ShouldNotifyOtherAdminsWhenEscalated() {
        UUID reportId = UUID.randomUUID();
        UUID requestId = UUID.randomUUID();

        User reviewingAdmin = new User();
        reviewingAdmin.setId(UUID.randomUUID());
        reviewingAdmin.setUsername("moderator");
        reviewingAdmin.setEmail("moderator@example.com");
        reviewingAdmin.setRole(Role.ADMIN);
        reviewingAdmin.setStatus(AccountStatus.ACTIVE);

        User secondAdmin = new User();
        secondAdmin.setId(UUID.randomUUID());
        secondAdmin.setUsername("admin2");
        secondAdmin.setEmail("admin2@example.com");
        secondAdmin.setRole(Role.ADMIN);
        secondAdmin.setStatus(AccountStatus.ACTIVE);

        User suspendedAdmin = new User();
        suspendedAdmin.setId(UUID.randomUUID());
        suspendedAdmin.setUsername("admin3");
        suspendedAdmin.setEmail("admin3@example.com");
        suspendedAdmin.setRole(Role.ADMIN);
        suspendedAdmin.setStatus(AccountStatus.SUSPENDED);

        Report report = new Report();
        report.setId(reportId);
        report.setType(ReportType.REQUEST);
        report.setStatus(ReportStatus.PENDING);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(reviewingAdmin.getUsername(), "secret")
        );

        when(userRepository.findByUsername(reviewingAdmin.getUsername())).thenReturn(Optional.of(reviewingAdmin));
        when(userRepository.findAll()).thenReturn(java.util.List.of(reviewingAdmin, secondAdmin, suspendedAdmin));
        when(reportRepository.findById(reportId)).thenReturn(Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));

        adminService.resolveReport(
                reportId,
                new AdminReportReviewRequest(
                        "This case should be reviewed by another admin before closure.",
                        "ESCALATE",
                        "REQUEST",
                        requestId
                )
        );

        verify(notificationService).createNotification(
                eq(secondAdmin),
                eq("Report escalated for follow-up"),
                eq("A moderation case was escalated and needs additional admin attention. Report ID: " + reportId + " Reason: This case should be reviewed by another admin before closure."),
                eq(NotificationType.REPORT_ESCALATED)
        );
    }
}
