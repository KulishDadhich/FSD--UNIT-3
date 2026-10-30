package dev.eventflow.repository;

import dev.eventflow.entity.PostEvent;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface EventRepository extends JpaRepository<PostEvent, String> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from PostEvent e where e.eventId=:id")
  Optional<PostEvent> lockById(String id);

  List<PostEvent> findTop50ByStatusAndScheduledAtLessThanEqualOrderByScheduledAtAsc(
      String status, Instant due);

  List<PostEvent> findAllByOrderByCreatedAtDesc();
}
