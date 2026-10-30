package dev.eventflow.repository;

import dev.eventflow.entity.Publication;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PublicationRepository extends JpaRepository<Publication, String> {}
