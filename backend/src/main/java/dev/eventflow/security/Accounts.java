package dev.eventflow.security;

import org.springframework.data.jpa.repository.JpaRepository;

public interface Accounts extends JpaRepository<Account, String> {}
