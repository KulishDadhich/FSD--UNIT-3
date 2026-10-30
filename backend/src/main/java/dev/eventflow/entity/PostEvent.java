package dev.eventflow.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
public class PostEvent {
  @Id public String eventId;

  @Column(nullable = false, unique = true)
  public String postId;

  public String title;

  @Column(length = 5000)
  public String content;

  public String platform;
  public String eventType = "SCHEDULED_POST";
  public String topic = "scheduled-posts";
  public String failureMode;
  public String status = "SCHEDULED";
  public Instant scheduledAt;
  public Instant createdAt = Instant.now();
  public Instant processedAt;
  public Instant nextRetryAt;
  public Instant dlqAt;
  public int attempts;
  public int cycleAttempts;
  public int generation;
  public int replays;
  public int duplicates;
  public int pendingCopies = 1;

  @Column(length = 1000)
  public String errorDetails;

  @Version public long version;

  public PostEvent() {}
}
