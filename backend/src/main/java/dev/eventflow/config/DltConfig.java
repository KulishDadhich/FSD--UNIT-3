package dev.eventflow.config;

import org.springframework.context.annotation.*;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.listener.*;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
public class DltConfig {
  @Bean
  ConcurrentKafkaListenerContainerFactory<String, String> dltFactory(
      ConsumerFactory<String, String> cf,
      @org.springframework.beans.factory.annotation.Value(
              "${spring.kafka.listener.auto-startup:true}")
          boolean autoStart) {
    var f = new ConcurrentKafkaListenerContainerFactory<String, String>();
    f.setConsumerFactory(cf);
    f.setAutoStartup(autoStart);
    f.getContainerProperties().setAckMode(ContainerProperties.AckMode.RECORD);
    // A database outage must not cause a dead-letter record to be acknowledged or recursively
    // republished.
    f.setCommonErrorHandler(
        new DefaultErrorHandler(new FixedBackOff(2000, FixedBackOff.UNLIMITED_ATTEMPTS)));
    return f;
  }
}
