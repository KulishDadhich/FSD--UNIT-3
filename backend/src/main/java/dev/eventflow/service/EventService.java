package dev.eventflow.service;

import dev.eventflow.dto.*;
import dev.eventflow.entity.*;
import dev.eventflow.repository.*;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class EventService {
  private final EventRepository events;
  private final ActivityRepository activity;
  private final PublicationRepository publications;

  public EventService(EventRepository e, ActivityRepository a, PublicationRepository p) {
    events = e;
    activity = a;
    publications = p;
  }

  public void log(PostEvent e, String stage, String message) {
    activity.save(new Activity(e, stage, message));
  }

  public PostEvent require(String id) {
    return events
        .findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
  }

  private PostEvent lock(String id) {
    return events
        .lockById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
  }

  @Transactional
  public PostEvent create(CreatePost dto, String mode, int copies) {
    String id = dto.eventId() == null ? UUID.randomUUID().toString() : dto.eventId();
    if (events.existsById(id))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Event ID already exists");
    PostEvent e = new PostEvent();
    e.eventId = id;
    e.postId = UUID.randomUUID().toString();
    e.title = dto.title();
    e.content = dto.content();
    e.platform = dto.platform();
    e.scheduledAt = dto.scheduledAt();
    e.failureMode = mode;
    e.pendingCopies = copies;
    events.saveAndFlush(e);
    log(e, "SCHEDULED", "Saved durably; waiting for scheduled time");
    return e;
  }

  @Transactional
  public PostEvent processNow(String id) {
    PostEvent original = lock(id);
    // A new event leaves the original future schedule intact.
    return create(
        new CreatePost(null, original.title, original.content, original.platform, Instant.now()),
        "NORMAL",
        1);
  }

  @Transactional
  public PostEvent replay(String id) {
    PostEvent e = lock(id);
    if (!e.status.equals("DLQ") || publications.existsById(id))
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Only an uncompleted DLQ event can be replayed");
    e.failureMode = "NORMAL";
    e.status = "SCHEDULED";
    e.generation++;
    e.replays++;
    e.cycleAttempts = 0;
    e.pendingCopies = 1;
    e.nextRetryAt = null;
    e.scheduledAt = Instant.now();
    e.errorDetails = null;
    log(e, "REPLAY", "Failure corrected; same event ID scheduled for Kafka replay");
    return e;
  }

  // Return the failure after committing the audit transaction. The listener throws outside it.
  @Transactional
  public String process(EventMessage m) {
    PostEvent e = lock(m.eventId());
    if (e.generation != m.generation()) {
      log(e, "STALE", "Ignored delivery from an older replay generation");
      return null;
    }
    if (publications.existsById(e.eventId)) {
      e.duplicates++;
      log(e, "DUPLICATE", "Duplicate blocked; publication already exists");
      return null;
    }
    if (e.status.equals("DLQ")) {
      log(e, "STALE", "Ignored delivery for an event awaiting explicit replay");
      return null;
    }
    if (e.scheduledAt.isAfter(Instant.now())) throw new IllegalStateException("Event is not due");
    e.attempts++;
    e.cycleAttempts++;
    e.status = "PROCESSING";
    e.nextRetryAt = null;
    log(e, "PROCESSING", "Consumer received message; attempt " + e.cycleAttempts);
    boolean fail =
        e.failureMode.equals("PERMANENT")
            || (e.failureMode.equals("TRANSIENT") && e.cycleAttempts <= 2);
    if (fail) {
      e.errorDetails =
          e.failureMode.equals("PERMANENT")
              ? "Controlled permanent publication failure"
              : "Controlled temporary publication failure";
      e.status = e.cycleAttempts < 3 ? "RETRYING" : "FAILED";
      if (e.cycleAttempts < 3)
        e.nextRetryAt = Instant.now().plusSeconds(e.cycleAttempts == 1 ? 2 : 4);
      log(e, "FAILED", e.errorDetails);
      if (e.nextRetryAt != null)
        log(e, "RETRYING", "Next attempt after " + (e.cycleAttempts == 1 ? 2 : 4) + " seconds");
      return e.errorDetails;
    }
    publications.saveAndFlush(new Publication(e.eventId));
    e.status = "SUCCESS";
    e.processedAt = Instant.now();
    e.errorDetails = null;
    log(e, "SUCCESS", "Simulated Publication completed exactly once in the database");
    return null;
  }

  @Transactional
  public void deadLetter(EventMessage m) {
    PostEvent e = lock(m.eventId());
    if (e.generation != m.generation()
        || publications.existsById(e.eventId)
        || e.status.equals("DLQ")) return;
    e.status = "DLQ";
    e.dlqAt = Instant.now();
    e.nextRetryAt = null;
    log(e, "DLQ", "Confirmed receipt from scheduled-posts-dlt; ready for inspection");
  }
}
