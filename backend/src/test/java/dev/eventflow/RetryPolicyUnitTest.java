package dev.eventflow;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;

class RetryPolicyUnitTest {
  @Test
  void exactlyTwoIncreasingDelays() {
    var execution = dev.eventflow.config.KafkaConfig.retryBackOff().start();
    assertThat(execution.nextBackOff()).isEqualTo(2000);
    assertThat(execution.nextBackOff()).isEqualTo(4000);
    assertThat(execution.nextBackOff()).isEqualTo(-1);
  }

  @Test
  void validationRejectsUnknownPlatform() {
    try (var factory = jakarta.validation.Validation.buildDefaultValidatorFactory()) {
      var post =
          new dev.eventflow.dto.CreatePost(
              null, "title", "body", "unknown", java.time.Instant.now());
      assertThat(factory.getValidator().validate(post)).isNotEmpty();
    }
  }
}
