package dev.eventflow;

import org.springframework.boot.SpringApplication;
import org.springframework.kafka.test.EmbeddedKafkaKraftBroker;

/** Optional local verification harness, not part of the packaged application. */
public class LocalVerificationServer {
  public static void main(String[] args) {
    var broker = new EmbeddedKafkaKraftBroker(1, 3, "scheduled-posts", "scheduled-posts-dlt");
    broker.afterPropertiesSet();
    System.setProperty("spring.kafka.bootstrap-servers", broker.getBrokersAsString());
    System.setProperty(
        "spring.datasource.url", "jdbc:h2:mem:browsercheck;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=15000");
    Runtime.getRuntime().addShutdownHook(new Thread(broker::destroy));
    SpringApplication.run(EventFlowApplication.class, args);
  }
}
