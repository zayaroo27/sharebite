package com.sharebite.backend.service;

import com.sharebite.backend.dto.CategoryRequest;
import com.sharebite.backend.dto.CategoryResponse;
import com.sharebite.backend.entity.Category;
import com.sharebite.backend.exception.ConflictException;
import com.sharebite.backend.exception.NotFoundException;
import com.sharebite.backend.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    public CategoryResponse createCategory(CategoryRequest request) {
        if (categoryRepository.existsByName(request.name())) {
            throw new ConflictException("Category with name '" + request.name() + "' already exists");
        }
        Category category = new Category();
        category.setName(request.name());
        category.setDescription(request.description());
        category = categoryRepository.save(category);
        return mapToResponse(category);
    }

    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public CategoryResponse updateCategory(UUID id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Category not found"));
        if (!category.getName().equals(request.name()) && categoryRepository.existsByName(request.name())) {
            throw new ConflictException("Category with name '" + request.name() + "' already exists");
        }
        category.setName(request.name());
        category.setDescription(request.description());
        category = categoryRepository.save(category);
        return mapToResponse(category);
    }

    public void deleteCategory(UUID id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Category not found"));
        categoryRepository.delete(category);
    }

    private CategoryResponse mapToResponse(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getDescription(),
                category.getCreatedAt()
        );
    }
}