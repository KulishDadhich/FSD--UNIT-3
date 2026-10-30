package dev.eventflow.scheduler;

import dev.eventflow.producer.EventDispatcher;
import dev.eventflow.repository.EventRepository;
import java.time.Instant;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.scheduling-enabled", havingValue = "true", matchIfMissing = true)
public class PostScheduler {
  private final EventRepository events;
  private final EventDispatcher dispatcher;

  public PostScheduler(EventRepository e, EventDispatcher d) {
    events = e;
    dispatcher = d;
  }

  @Scheduled(fixedDelay = 1000)
  public void tick() {
    for (var e :
        events.findTop50ByStatusAndScheduledAtLessThanEqualOrderByScheduledAtAsc(
            "SCHEDULED", Instant.now())) {
      try {
        dispatcher.dispatch(e.eventId);
      } catch (Exception ex) {
        LoggerFactory.getLogger(getClass())
            .warn("Kafka dispatch pending for {}; will retry", e.eventId);
        break;
      }
    }
  }
}
