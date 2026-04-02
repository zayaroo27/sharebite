package com.sharebite.backend.service;

import com.sharebite.backend.dto.MessageSendRequest;
import com.sharebite.backend.entity.FoodListing;
import com.sharebite.backend.entity.ListingRequest;
import com.sharebite.backend.entity.RequestStatus;
import com.sharebite.backend.entity.Role;
import com.sharebite.backend.entity.User;
import com.sharebite.backend.exception.BadRequestException;
import com.sharebite.backend.repository.ListingRequestRepository;
import com.sharebite.backend.repository.MessageRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MessageServiceTest {

    private MessageService messageService;
    private MessageRepository messageRepository;
    private ListingRequestRepository listingRequestRepository;
    private UserRepository userRepository;
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        messageService = new MessageService();
        messageRepository = Mockito.mock(MessageRepository.class);
        listingRequestRepository = Mockito.mock(ListingRequestRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        notificationService = Mockito.mock(NotificationService.class);

        ReflectionTestUtils.setField(messageService, "messageRepository", messageRepository);
        ReflectionTestUtils.setField(messageService, "listingRequestRepository", listingRequestRepository);
        ReflectionTestUtils.setField(messageService, "userRepository", userRepository);
        ReflectionTestUtils.setField(messageService, "notificationService", notificationService);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void sendMessage_WhenRequestCompleted_ShouldRejectAsArchivedConversation() {
        User donor = createUser("donor", Role.DONOR);
        User recipient = createUser("recipient", Role.RECIPIENT);

        FoodListing listing = new FoodListing();
        listing.setId(UUID.randomUUID());
        listing.setDonor(donor);

        ListingRequest request = new ListingRequest();
        request.setId(UUID.randomUUID());
        request.setListing(listing);
        request.setRecipient(recipient);
        request.setStatus(RequestStatus.COMPLETED);

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(donor.getUsername(), "secret")
        );

        when(userRepository.findByUsername(donor.getUsername())).thenReturn(Optional.of(donor));
        when(listingRequestRepository.findById(request.getId())).thenReturn(Optional.of(request));

        BadRequestException exception = assertThrows(
                BadRequestException.class,
                () -> messageService.sendMessage(request.getId(), new MessageSendRequest("Can we still coordinate?"))
        );

        assertEquals("Cannot send messages for closed requests", exception.getMessage());
        verify(messageRepository, never()).save(any());
        verify(notificationService, never()).createNotification(any(), any(), any(), any());
    }

    private User createUser(String username, Role role) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setUsername(username);
        user.setRole(role);
        return user;
    }
}
