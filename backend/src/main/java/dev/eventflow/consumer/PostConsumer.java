package dev.eventflow.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.eventflow.dto.EventMessage;
import dev.eventflow.service.EventService;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class PostConsumer {
  private final ObjectMapper json;
  private final EventService service;

  public PostConsumer(ObjectMapper j, EventService s) {
    json = j;
    service = s;
  }

  @KafkaListener(topics = "scheduled-posts")
  public void receive(String payload) throws Exception {
    var m = decode(payload);
    String failure = service.process(m);
    if (failure != null) throw new IllegalStateException(failure);
  }

  @KafkaListener(
      topics = "scheduled-posts-dlt",
      groupId = "eventflow-dlt-v1",
      containerFactory = "dltFactory")
  public void dlt(String payload) throws Exception {
    service.deadLetter(decode(payload));
  }

  private EventMessage decode(String payload) throws Exception {
    var m = json.readValue(payload, EventMessage.class);
    if (m.eventId() == null
        || m.postId() == null
        || m.title() == null
        || m.title().isBlank()
        || m.content() == null
        || m.platform() == null
        || m.scheduledAt() == null
        || m.createdAt() == null
        || m.failureMode() == null) throw new IllegalArgumentException("Invalid event payload");
    return m;
  }
}
