package dev.eventflow.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class BootstrapAdmin implements CommandLineRunner {
  private final Accounts a;
  private final BCryptPasswordEncoder p;

  @Value("${ADMIN_EMAIL:}")
  String email;

  @Value("${ADMIN_PASSWORD:}")
  String password;

  public BootstrapAdmin(Accounts a, BCryptPasswordEncoder p) {
    this.a = a;
    this.p = p;
  }

  public void run(String... args) {
    if (email.isBlank() || a.existsById(email.toLowerCase())) return;
    if (password.length() < 12)
      throw new IllegalArgumentException("ADMIN_PASSWORD requires 12 characters");
    var u = new Account();
    u.email = email.toLowerCase();
    u.passwordHash = p.encode(password);
    u.role = "ADMIN";
    try { a.save(u); }
    catch (org.springframework.dao.DataIntegrityViolationException collision) {
      if (!a.existsById(u.email)) throw collision;
    }
  }
}
