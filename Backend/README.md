# ShareBite Backend

A Spring Boot 3.x Java 21 Maven backend for ShareBite with layered architecture.

## Features

- Stateless JWT authentication
- Role-based authorization (DONOR, RECIPIENT, ADMIN)
- Global exception handling
- DTOs using Java 21 records
- UUID primary keys

## Dependencies

- Spring Web
- Spring Security
- Spring Data JPA
- PostgreSQL Driver
- Validation (jakarta.validation)
- Lombok
- JJWT

## Setup

1. Install Java 21 and Maven.
2. Set up PostgreSQL database.
3. Update `application.properties` with your database credentials.
4. Run `mvn spring-boot:run`

## API Endpoints

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me