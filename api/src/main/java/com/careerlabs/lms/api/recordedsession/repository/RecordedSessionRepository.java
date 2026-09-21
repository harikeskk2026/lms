package com.careerlabs.lms.api.recordedsession.repository;

import com.careerlabs.lms.api.recordedsession.entity.RecordedSession;
import com.careerlabs.lms.api.recordedsession.entity.RecordedSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface RecordedSessionRepository extends JpaRepository<RecordedSession, Long>, JpaSpecificationExecutor<RecordedSession> {

    List<RecordedSession> findAllByOrderByCreatedAtDesc();

    List<RecordedSession> findByCourseIdAndStatusOrderByCreatedAtDesc(Long courseId, RecordedSessionStatus status);

    List<RecordedSession> findByStatusOrderByCreatedAtDesc(RecordedSessionStatus status);
 
    long countByStatus(RecordedSessionStatus status);

    long countByCreatedBy(Long createdBy);
}
