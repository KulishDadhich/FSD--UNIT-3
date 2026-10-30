package dev.eventflow.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
public class Publication {
  @Id public String eventId;
  public Instant publishedAt = Instant.now();
  public String result = "Simulated Publication";

  public Publication() {}

  public Publication(String id) {
    eventId = id;
  }
}
