package dev.eventflow.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.common.TopicPartition;
import org.springframework.context.annotation.*;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.*;
import org.springframework.kafka.support.ExponentialBackOffWithMaxRetries;

@Configuration
public class KafkaConfig {
  @Bean
  NewTopic posts() {
    return TopicBuilder.name("scheduled-posts").partitions(3).replicas(1).build();
  }

  @Bean
  NewTopic dlt() {
    return TopicBuilder.name("scheduled-posts-dlt").partitions(3).replicas(1).build();
  }

  public static ExponentialBackOffWithMaxRetries retryBackOff() {
    var backoff = new ExponentialBackOffWithMaxRetries(2);
    backoff.setInitialInterval(2000);
    backoff.setMultiplier(2);
    backoff.setMaxInterval(4000);
    return backoff;
  }

  @Bean
  DefaultErrorHandler errorHandler(KafkaTemplate<String, String> template) {
    var recoverer =
        new DeadLetterPublishingRecoverer(
            template,
            (record, error) -> new TopicPartition("scheduled-posts-dlt", record.partition()));
    recoverer.setFailIfSendResultIsError(true);
    var handler = new DefaultErrorHandler(recoverer, retryBackOff());
    handler.setResetStateOnRecoveryFailure(true);
    return handler;
  }
}
