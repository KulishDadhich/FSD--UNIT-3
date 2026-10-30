package dev.eventflow.controller;

import dev.eventflow.dto.CreatePost;
import dev.eventflow.entity.PostEvent;
import dev.eventflow.repository.*;
import dev.eventflow.service.EventService;
import jakarta.validation.Valid;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.TimeUnit;
import org.apache.kafka.clients.admin.AdminClient;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaAdmin;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class ApiController {
  private final EventService service;
  private final EventRepository events;
  private final ActivityRepository activity;
  private final KafkaAdmin admin;

  public ApiController(EventService s, EventRepository e, ActivityRepository a, KafkaAdmin k) {
    service = s;
    events = e;
    activity = a;
    admin = k;
  }

  private Map<String, Object> ok(Object data) {
    return Map.of("data", data);
  }

  @PostMapping("/posts")
  @ResponseStatus(HttpStatus.CREATED)
  public Object create(@Valid @RequestBody CreatePost p) {
    return ok(service.create(p, "NORMAL", 1));
  }

  @GetMapping("/posts")
  public Object posts() {
    return ok(events.findAllByOrderByCreatedAtDesc());
  }

  @PostMapping("/posts/{id}/process-now")
  @ResponseStatus(HttpStatus.CREATED)
  public Object now(@PathVariable String id) {
    return ok(service.processNow(id));
  }

  @PostMapping("/demo/{scenario}")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public Object demo(@PathVariable String scenario) {
    String mode =
        switch (scenario) {
          case "success", "duplicate" -> "NORMAL";
          case "transient-failure" -> "TRANSIENT";
          case "permanent-failure" -> "PERMANENT";
          default ->
              throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown demonstration");
        };
    return ok(
        service.create(
            new CreatePost(
                null,
                "Demo · " + scenario,
                "A classroom demonstration of reliable event processing.",
                "LinkedIn",
                Instant.now()),
            mode,
            scenario.equals("duplicate") ? 2 : 1));
  }

  @GetMapping("/events/activity")
  public Object activity() {
    return ok(activity.findTop100ByOrderByIdDesc());
  }

  @GetMapping("/events/{id}")
  public Object detail(@PathVariable String id) {
    return ok(
        Map.of("event", service.require(id), "history", activity.findByEventIdOrderByIdAsc(id)));
  }

  @GetMapping("/events")
  public Object events(
      @RequestParam(defaultValue = "") String search,
      @RequestParam(defaultValue = "") String status,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "desc") String order,
      @RequestParam(defaultValue = "createdAt") String sort) {
    if (page < 0 || size < 1 || size > 100)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid page or size");
    Comparator<PostEvent> comparator =
        switch (sort) {
          case "status" -> Comparator.comparing(e -> e.status);
          case "attempts" -> Comparator.comparingInt(e -> e.attempts);
          default -> Comparator.comparing(e -> e.createdAt);
        };
    var list =
        events.findAll().stream()
            .filter(e -> status.isEmpty() || e.status.equals(status))
            .filter(
                e ->
                    (e.eventId + " " + e.title + " " + e.failureMode)
                        .toLowerCase()
                        .contains(search.toLowerCase()))
            .sorted(order.equals("asc") ? comparator : comparator.reversed())
            .toList();
    return ok(
        Map.of(
            "items",
            list.stream().skip((long) page * size).limit(size).toList(),
            "total",
            list.size(),
            "page",
            page,
            "size",
            size));
  }

  @GetMapping("/dlq")
  public Object dlq() {
    return ok(
        events.findAllByOrderByCreatedAtDesc().stream()
            .filter(e -> e.status.equals("DLQ"))
            .toList());
  }

  @PostMapping("/dlq/{id}/reprocess")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public Object replay(@PathVariable String id) {
    return ok(service.replay(id));
  }

  @GetMapping("/dashboard/stats")
  public Object stats() {
    var list = events.findAll();
    long success = list.stream().filter(e -> e.status.equals("SUCCESS")).count();
    var logs = activity.findAll();
    return ok(
        Map.of(
            "total",
            list.size(),
            "success",
            success,
            "retries",
            logs.stream().filter(a -> a.stage.equals("PROCESSING") && a.attempt > 1).count(),
            "failed",
            list.stream().filter(e -> Set.of("FAILED", "DLQ").contains(e.status)).count(),
            "dlq",
            list.stream().filter(e -> e.status.equals("DLQ")).count(),
            "duplicates",
            list.stream().mapToInt(e -> e.duplicates).sum(),
            "successRate",
            list.isEmpty() ? 0 : Math.round(1000.0 * success / list.size()) / 10.0));
  }

  @GetMapping("/analytics")
  public Object analytics() {
    var list = events.findAll();
    var series = new ArrayList<Map<String, Object>>();
    Instant end = Instant.now().truncatedTo(ChronoUnit.MINUTES);
    for (int i = 11; i >= 0; i--) {
      Instant start = end.minus(i, ChronoUnit.MINUTES);
      Instant stop = start.plus(1, ChronoUnit.MINUTES);
      series.add(
          Map.of(
              "time",
              start.toString(),
              "success",
              list.stream()
                  .filter(
                      e ->
                          e.processedAt != null
                              && !e.processedAt.isBefore(start)
                              && e.processedAt.isBefore(stop))
                  .count(),
              "failed",
              list.stream()
                  .filter(
                      e -> e.dlqAt != null && !e.dlqAt.isBefore(start) && e.dlqAt.isBefore(stop))
                  .count()));
    }
    return ok(
        Map.of(
            "series",
            series,
            "attempts",
            List.of(
                Map.of(
                    "name",
                    "1 attempt",
                    "value",
                    list.stream().filter(e -> e.attempts == 1).count()),
                Map.of(
                    "name",
                    "2 attempts",
                    "value",
                    list.stream().filter(e -> e.attempts == 2).count()),
                Map.of(
                    "name",
                    "3+ attempts",
                    "value",
                    list.stream().filter(e -> e.attempts >= 3).count()))));
  }

  private volatile long checkedAt;
  private volatile boolean connected;

  @GetMapping("/system/health")
  public synchronized Object health() {
    if (System.currentTimeMillis() - checkedAt > 5000) {
      try (var client = AdminClient.create(admin.getConfigurationProperties())) {
        connected = !client.describeCluster().nodes().get(2, TimeUnit.SECONDS).isEmpty();
      } catch (Exception e) {
        connected = false;
      }
      checkedAt = System.currentTimeMillis();
    }
    boolean db;
    try {
      events.count();
      db = true;
    } catch (Exception ex) {
      db = false;
    }
    return ok(
        Map.of(
            "kafka",
            connected,
            "database",
            db,
            "api",
            true,
            "checkedAt",
            Instant.ofEpochMilli(checkedAt).toString()));
  }
}
