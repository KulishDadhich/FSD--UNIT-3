package dev.eventflow;

import static org.assertj.core.api.Assertions.*;
import static org.awaitility.Awaitility.await;

import dev.eventflow.config.KafkaConfig;
import dev.eventflow.dto.*;
import dev.eventflow.entity.PostEvent;
import dev.eventflow.producer.EventDispatcher;
import dev.eventflow.repository.*;
import dev.eventflow.service.EventService;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.util.backoff.BackOffExecution;

@SpringBootTest(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:test;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=15000",
      "spring.jpa.hibernate.ddl-auto=create-drop",
      "app.scheduling-enabled=false",
      "logging.level.root=ERROR"
    })
@EmbeddedKafka(
    partitions = 3,
    topics = {"scheduled-posts", "scheduled-posts-dlt"},
    bootstrapServersProperty = "spring.kafka.bootstrap-servers")
class ReliabilityTest {
  @Autowired EventService service;
  @Autowired EventDispatcher dispatcher;
  @Autowired EventRepository events;
  @Autowired ActivityRepository activity;
  @Autowired PublicationRepository publications;

  PostEvent create(String mode, int copies, Instant when) {
    return service.create(
        new CreatePost(null, "Test " + mode, "Test content", "LinkedIn", when), mode, copies);
  }

  PostEvent waitFor(String id, String status) {
    await()
        .atMost(Duration.ofSeconds(40))
        .until(() -> events.findById(id).orElseThrow().status.equals(status));
    return events.findById(id).orElseThrow();
  }

  @Test
  void backoffHasExactlyTwoRetries() {
    var b = KafkaConfig.retryBackOff().start();
    assertThat(b.nextBackOff()).isEqualTo(2000);
    assertThat(b.nextBackOff()).isEqualTo(4000);
    assertThat(b.nextBackOff()).isEqualTo(BackOffExecution.STOP);
  }

  @Test
  void successfulKafkaDelivery() throws Exception {
    var e = create("NORMAL", 1, Instant.now());
    dispatcher.dispatch(e.eventId);
    var done = waitFor(e.eventId, "SUCCESS");
    assertThat(done.attempts).isEqualTo(1);
    assertThat(publications.existsById(e.eventId)).isTrue();
  }

  @Test
  void transientRetriesTwiceAndRecovers() throws Exception {
    var e = create("TRANSIENT", 1, Instant.now());
    dispatcher.dispatch(e.eventId);
    var done = waitFor(e.eventId, "SUCCESS");
    assertThat(done.attempts).isEqualTo(3);
    var attempts =
        activity.findByEventIdOrderByIdAsc(e.eventId).stream()
            .filter(a -> a.stage.equals("PROCESSING"))
            .toList();
    assertThat(attempts).hasSize(3);
    assertThat(Duration.between(attempts.get(0).timestamp, attempts.get(1).timestamp).toMillis())
        .isGreaterThanOrEqualTo(1900);
    assertThat(Duration.between(attempts.get(1).timestamp, attempts.get(2).timestamp).toMillis())
        .isGreaterThanOrEqualTo(3900);
  }

  @Test
  void permanentFailureReachesDltThenReplaysSameId() throws Exception {
    var e = create("PERMANENT", 1, Instant.now());
    dispatcher.dispatch(e.eventId);
    var dlq = waitFor(e.eventId, "DLQ");
    assertThat(dlq.attempts).isEqualTo(3);
    assertThat(publications.existsById(e.eventId)).isFalse();
    service.replay(e.eventId);
    dispatcher.dispatch(e.eventId);
    var done = waitFor(e.eventId, "SUCCESS");
    assertThat(done.eventId).isEqualTo(e.eventId);
    assertThat(done.attempts).isEqualTo(4);
    assertThat(done.replays).isEqualTo(1);
    service.deadLetter(EventMessage.from(e));
    assertThat(events.findById(e.eventId).orElseThrow().status).isEqualTo("SUCCESS");
    assertThatThrownBy(() -> service.replay(e.eventId))
        .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
  }

  @Test
  void duplicateKafkaDeliveriesHaveOnePublication() throws Exception {
    var e = create("NORMAL", 2, Instant.now());
    dispatcher.dispatch(e.eventId);
    waitFor(e.eventId, "SUCCESS");
    await()
        .atMost(Duration.ofSeconds(20))
        .until(() -> events.findById(e.eventId).orElseThrow().duplicates == 1);
    assertThat(events.findById(e.eventId).orElseThrow().attempts).isEqualTo(1);
    assertThat(publications.findById(e.eventId)).isPresent();
  }

  @Test
  void concurrentProcessingIsProtectedByDatabaseLock() throws Exception {
    var e = create("NORMAL", 1, Instant.now());
    var message = EventMessage.from(e);
    var executor = Executors.newFixedThreadPool(8);
    var start = new CountDownLatch(1);
    try {
      var tasks = new ArrayList<Future<String>>();
      for (int i = 0; i < 8; i++)
        tasks.add(
            executor.submit(
                () -> {
                  start.await();
                  return service.process(message);
                }));
      start.countDown();
      for (var task : tasks) assertThat(task.get(20, TimeUnit.SECONDS)).isNull();
    } finally {
      executor.shutdownNow();
    }
    var done = events.findById(e.eventId).orElseThrow();
    assertThat(done.attempts).isEqualTo(1);
    assertThat(done.duplicates).isEqualTo(7);
    assertThat(publications.existsById(e.eventId)).isTrue();
  }

  @Test
  void futureScheduleIsNotDispatchedAndProcessNowCreatesNewId() throws Exception {
    var future = Instant.now().plusSeconds(120);
    var e = create("NORMAL", 1, future);
    dispatcher.dispatch(e.eventId);
    var saved = events.findById(e.eventId).orElseThrow();
    assertThat(saved.status).isEqualTo("SCHEDULED");
    assertThat(saved.attempts).isZero();
    assertThat(activity.findByEventIdOrderByIdAsc(e.eventId))
        .noneMatch(a -> a.stage.equals("QUEUED"));
    var now = service.processNow(e.eventId);
    assertThat(now.eventId).isNotEqualTo(e.eventId);
    assertThat(now.scheduledAt).isBeforeOrEqualTo(Instant.now());
    dispatcher.dispatch(now.eventId);
    waitFor(now.eventId, "SUCCESS");
    assertThat(events.findById(e.eventId).orElseThrow().status).isEqualTo("SCHEDULED");
  }

  @Test
  void duplicateIdentifiersAreRejected() {
    var e = create("NORMAL", 1, Instant.now());
    assertThatThrownBy(
            () ->
                service.create(
                    new CreatePost(e.eventId, "Another", "Content", "X", Instant.now()),
                    "NORMAL",
                    1))
        .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
  }
}
