package dev.eventflow;

import static org.assertj.core.api.Assertions.*;

import java.sql.DriverManager;
import java.util.*;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.utility.DockerImageName;

@org.springframework.boot.test.context.SpringBootTest(properties={"app.scheduling-enabled=false","spring.flyway.enabled=true","spring.jpa.hibernate.ddl-auto=validate"})
@Testcontainers
@EnabledIfEnvironmentVariable(named = "RUN_CONTAINERS", matches = "true")
class ContainerInfrastructureTest {
 @org.springframework.test.context.DynamicPropertySource
 static void infrastructure(org.springframework.test.context.DynamicPropertyRegistry r){
 r.add("spring.datasource.url",db::getJdbcUrl);r.add("spring.datasource.username",db::getUsername);r.add("spring.datasource.password",db::getPassword);r.add("spring.kafka.bootstrap-servers",kafka::getBootstrapServers);
 }
 @org.springframework.beans.factory.annotation.Autowired dev.eventflow.service.EventService events;
 @org.springframework.beans.factory.annotation.Autowired dev.eventflow.producer.EventDispatcher dispatcher;
 @Test void applicationProcessesAgainstRealContainers() throws Exception {
 var event=events.create(new dev.eventflow.dto.CreatePost(null,"Container integration","payload","X",java.time.Instant.now()),"NORMAL",1);
 dispatcher.dispatch(event.eventId);
 org.awaitility.Awaitility.await().atMost(java.time.Duration.ofSeconds(30)).until(()->events.require(event.eventId).status.equals("SUCCESS"));
 }

  @Container static PostgreSQLContainer<?> db = new PostgreSQLContainer<>("postgres:16.6-alpine");

  @Container
  static KafkaContainer kafka =
      new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.8.0"));

  @Test
  void persistentDatabaseAndKafkaRoundTrip() throws Exception {
    try (var c = DriverManager.getConnection(db.getJdbcUrl(), db.getUsername(), db.getPassword());
        var s = c.createStatement()) {
      s.execute("create table contract_check(id varchar(80) primary key)");
      s.execute("insert into contract_check values ('event-1')");
      try (var r = s.executeQuery("select count(*) from contract_check")) {
        r.next();
        assertThat(r.getInt(1)).isEqualTo(1);
      }
    }
    var pp = new Properties();
    pp.put("bootstrap.servers", kafka.getBootstrapServers());
    pp.put("key.serializer", StringSerializer.class);
    pp.put("value.serializer", StringSerializer.class);
    try (var producer = new KafkaProducer<String, String>(pp)) {
      producer.send(new ProducerRecord<>("roundtrip", "event-1", "payload")).get();
    }
    var cp = new Properties();
    cp.put("bootstrap.servers", kafka.getBootstrapServers());
    cp.put("group.id", "test");
    cp.put("auto.offset.reset", "earliest");
    cp.put("key.deserializer", StringDeserializer.class);
    cp.put("value.deserializer", StringDeserializer.class);
    try (var consumer = new KafkaConsumer<String, String>(cp)) {
      consumer.subscribe(List.of("roundtrip"));
      long deadline = System.currentTimeMillis() + 20000;
      boolean found = false;
      while (System.currentTimeMillis() < deadline && !found) {
        for (var record : consumer.poll(java.time.Duration.ofSeconds(1)))
          found |= record.value().equals("payload");
      }
      assertThat(found).isTrue();
    }
  }
}
