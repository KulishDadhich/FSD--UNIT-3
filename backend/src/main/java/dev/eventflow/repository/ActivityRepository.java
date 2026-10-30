package dev.eventflow.repository;

import dev.eventflow.entity.Activity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityRepository extends JpaRepository<Activity, Long> {
  List<Activity> findTop100ByOrderByIdDesc();

  List<Activity> findByEventIdOrderByIdAsc(String eventId);
}
