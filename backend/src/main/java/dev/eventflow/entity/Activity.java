package dev.eventflow.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
public class Activity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  public String eventId;
  public String stage;
  public int attempt;
  public int generation;
  public Instant timestamp = Instant.now();

  @Column(length = 1000)
  public String message;

  public Activity() {}

  public Activity(PostEvent e, String stage, String message) {
    this.eventId = e.eventId;
    this.stage = stage;
    this.message = message;
    this.attempt = e.cycleAttempts;
    this.generation = e.generation;
  }
}
