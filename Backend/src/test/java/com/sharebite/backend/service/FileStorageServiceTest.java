package com.sharebite.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import com.sharebite.backend.exception.BadRequestException;

import static org.junit.jupiter.api.Assertions.*;

class FileStorageServiceTest {

    private FileStorageService fileStorageService;

    private String uploadDir = "/tmp/testuploads";

    @BeforeEach
    void setUp() throws IOException {
        fileStorageService = new FileStorageService();
        fileStorageService.setUploadDir(uploadDir);
        // Create directory if not exists
        Path path = Paths.get(uploadDir);
        if (!Files.exists(path)) {
            Files.createDirectories(path);
        }
    }

    @Test
    void storeFile_ValidImage_ShouldStoreSuccessfully() throws IOException {
        // Create a mock image file
        byte[] content = "fake image content".getBytes();
        MultipartFile file = new MockMultipartFile("image", "test.jpg", "image/jpeg", content);

        String filename = fileStorageService.storeFile(file);

        assertNotNull(filename);
        assertTrue(filename.startsWith("/uploads/"));
        assertTrue(filename.endsWith(".jpg"));
        // Check if file exists at the correct path
        String actualFilename = filename.substring(8); // remove "/uploads/"
        assertTrue(Files.exists(Paths.get(uploadDir, actualFilename)));
    }

    @Test
    void storeFile_InvalidFileType_ShouldThrowException() {
        // Create a mock text file
        byte[] content = "text content".getBytes();
        MultipartFile file = new MockMultipartFile("file", "test.txt", "text/plain", content);

        assertThrows(BadRequestException.class, () -> fileStorageService.storeFile(file));
    }

    @Test
    void storeFile_EmptyFile_ShouldThrowException() {
        MultipartFile file = new MockMultipartFile("image", "empty.jpg", "image/jpeg", new byte[0]);

        assertThrows(BadRequestException.class, () -> fileStorageService.storeFile(file));
    }
}