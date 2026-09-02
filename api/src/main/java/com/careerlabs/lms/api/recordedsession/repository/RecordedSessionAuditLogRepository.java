package com.careerlabs.lms.api.recordedsession.repository;

import com.careerlabs.lms.api.recordedsession.entity.RecordedSessionAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecordedSessionAuditLogRepository extends JpaRepository<RecordedSessionAuditLog, Long> {

    List<RecordedSessionAuditLog> findByRecordedSessionIdOrderByCreatedAtDesc(Long recordedSessionId);
}
