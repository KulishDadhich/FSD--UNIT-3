package dev.eventflow.dto;

import jakarta.validation.constraints.*;
import java.time.Instant;

public record CreatePost(
    @Pattern(regexp = "[a-zA-Z0-9_-]{1,80}") String eventId,
    @NotBlank @Size(max = 160) String title,
    @NotBlank @Size(max = 5000) String content,
    @NotNull @Pattern(regexp = "Instagram|LinkedIn|X|Facebook") String platform,
    @NotNull Instant scheduledAt) {}
