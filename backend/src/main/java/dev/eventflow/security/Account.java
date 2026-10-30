package dev.eventflow.security;

import jakarta.persistence.*;

@Entity
public class Account {
  @Id public String email;

  @Column(nullable = false)
  public String passwordHash;

  public String role = "VIEWER";

  public Account() {}
}
