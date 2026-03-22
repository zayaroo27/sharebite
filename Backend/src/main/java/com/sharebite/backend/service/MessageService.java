package com.sharebite.backend.service;

import com.sharebite.backend.dto.MessageResponse;
import com.sharebite.backend.dto.MessageSendRequest;
import com.sharebite.backend.entity.*;
import com.sharebite.backend.exception.BadRequestException;
import com.sharebite.backend.exception.ForbiddenException;
import com.sharebite.backend.exception.NotFoundException;
import com.sharebite.backend.repository.ListingRequestRepository;
import com.sharebite.backend.repository.MessageRepository;
import com.sharebite.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class MessageService {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private ListingRequestRepository listingRequestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    public MessageResponse sendMessage(UUID requestId, MessageSendRequest body) {
        User currentUser = getCurrentUser();
        ListingRequest request = listingRequestRepository.findById(requestId)
                .orElseThrow(() -> new NotFoundException("Request not found"));

        User donor = request.getListing().getDonor();
        User recipient = request.getRecipient();

        // Check if current user is participant
        if (!currentUser.getId().equals(donor.getId()) && !currentUser.getId().equals(recipient.getId())) {
            throw new ForbiddenException("You are not authorized to send messages in this conversation");
        }

        // Optional: check request status and listing status
        if (request.getStatus() == RequestStatus.REJECTED || request.getStatus() == RequestStatus.CANCELED) {
            throw new BadRequestException("Cannot send messages for closed requests");
        }
        if (request.getListing().getStatus() == ListingStatus.EXPIRED) {
            throw new BadRequestException("Cannot send messages for expired listings");
        }
        if (body.content().length() > 1000) {
    throw new BadRequestException("Message too long");
}

        // Determine sender and receiver
        User sender = currentUser;
        User receiver = sender.getId().equals(donor.getId()) ? recipient : donor;

        Message message = new Message();
        message.setContent(body.content());
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setRequest(request);
        // timestamp set by @PrePersist

        Message saved = messageRepository.save(message);

        // Create notification for receiver
        notificationService.createNotification(
                receiver,
                "New message",
                "You have received a new message regarding '" + request.getListing().getTitle() + "'.",
                NotificationType.NEW_MESSAGE
        );

        return mapToResponse(saved);
    }

    public List<MessageResponse> getConversation(UUID requestId) {
        User currentUser = getCurrentUser();
        ListingRequest request = listingRequestRepository.findById(requestId)
                .orElseThrow(() -> new NotFoundException("Request not found"));

        User donor = request.getListing().getDonor();
        User recipient = request.getRecipient();

        // Check if current user is participant
        if (!currentUser.getId().equals(donor.getId()) && !currentUser.getId().equals(recipient.getId())) {
            throw new ForbiddenException("You are not authorized to view this conversation");
        }

        List<Message> messages = messageRepository.findByRequestIdOrderByTimestampAsc(requestId);
        return messages.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    private User getCurrentUser() {
        String usernameOrEmail = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(usernameOrEmail)
            .or(() -> userRepository.findByEmail(usernameOrEmail))
                .orElseThrow(() -> new NotFoundException("Authenticated user not found"));
    }
    

    private MessageResponse mapToResponse(Message message) {
        return new MessageResponse(
                message.getId(),
                message.getContent(),
                message.getTimestamp(),
                message.getSender().getUsername(),
                message.getSender().getRole().name()
        );
    }
}