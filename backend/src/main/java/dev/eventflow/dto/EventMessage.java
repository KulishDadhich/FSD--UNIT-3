package dev.eventflow.dto;

import dev.eventflow.entity.PostEvent;
import java.time.Instant;

public record EventMessage(
    String eventId,
    String postId,
    String title,
    String content,
    String platform,
    Instant scheduledAt,
    Instant createdAt,
    String failureMode,
    int generation) {
  public static EventMessage from(PostEvent e) {
    return new EventMessage(
        e.eventId,
        e.postId,
        e.title,
        e.content,
        e.platform,
        e.scheduledAt,
        e.createdAt,
        e.failureMode,
        e.generation);
  }
}
