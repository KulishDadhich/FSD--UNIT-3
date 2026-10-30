package dev.eventflow;

import au.com.dius.pact.provider.junit5.*;
import au.com.dius.pact.provider.junitsupport.*;
import au.com.dius.pact.provider.junitsupport.loader.PactFolder;
import dev.eventflow.security.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
      "spring.datasource.url=jdbc:h2:mem:pact;DB_CLOSE_DELAY=-1",
      "app.scheduling-enabled=false",
      "spring.kafka.listener.auto-startup=false",
      "spring.kafka.admin.auto-create=false"
    })
@Provider("EventFlowApi")
@PactFolder("../frontend/pacts")
@EnabledIfEnvironmentVariable(named = "RUN_CONTRACTS", matches = "true")
class ContractProviderTest {
  @LocalServerPort int port;
  @Autowired Accounts accounts;
  @Autowired BCryptPasswordEncoder encoder;

  @BeforeEach
  void target(PactVerificationContext context) {
    context.setTarget(new HttpTestTarget("localhost", port));
  }

  @State("a viewer exists")
  void viewer() {
    var a = new Account();
    a.email = "contract@example.com";
    a.passwordHash = encoder.encode("contract-password-123");
    accounts.save(a);
  }

  @TestTemplate
  @ExtendWith(PactVerificationInvocationContextProvider.class)
  void verify(PactVerificationContext context) {
    context.verifyInteraction();
  }
}
