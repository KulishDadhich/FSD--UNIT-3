package dev.eventflow.producer;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.eventflow.dto.EventMessage;
import dev.eventflow.repository.EventRepository;
import dev.eventflow.service.EventService;
import java.time.Instant;
import java.util.concurrent.TimeUnit;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventDispatcher {
  private final EventRepository events;
  private final EventService service;
  private final KafkaTemplate<String, String> kafka;
  private final ObjectMapper json;

  public EventDispatcher(
      EventRepository e, EventService s, KafkaTemplate<String, String> k, ObjectMapper j) {
    events = e;
    service = s;
    kafka = k;
    json = j;
  }

  @Transactional
  public void dispatch(String id) throws Exception {
    var e = events.lockById(id).orElseThrow();
    if (!e.status.equals("SCHEDULED") || e.scheduledAt.isAfter(Instant.now())) return;
    String payload = json.writeValueAsString(EventMessage.from(e));
    for (int i = 0; i < e.pendingCopies; i++)
      kafka.send("scheduled-posts", e.eventId, payload).get(12, TimeUnit.SECONDS);
    e.pendingCopies = 0;
    e.status = "QUEUED";
    service.log(e, "QUEUED", "Producer received Kafka acknowledgement; message queued");
  }
}
