package com.sharebite.backend.controller;

import com.sharebite.backend.dto.MessageResponse;
import com.sharebite.backend.dto.MessageSendRequest;
import com.sharebite.backend.service.MessageService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/requests/{requestId}/messages")
public class MessageController {

    @Autowired
    private MessageService messageService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MessageResponse> sendMessage(
            @PathVariable UUID requestId,
            @Valid @RequestBody MessageSendRequest request) {
        MessageResponse response = messageService.sendMessage(requestId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<MessageResponse>> getConversation(@PathVariable UUID requestId) {
        List<MessageResponse> responses = messageService.getConversation(requestId);
        return ResponseEntity.ok(responses);
    }
}