package com.careerlabs.lms.api.recordedsession.repository;

import com.careerlabs.lms.api.recordedsession.entity.RecordedSessionAccessBlock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecordedSessionAccessBlockRepository extends JpaRepository<RecordedSessionAccessBlock, Long> {

    boolean existsByRecordedSessionIdAndStudentUserId(Long recordedSessionId, Long studentUserId);

    Optional<RecordedSessionAccessBlock> findByRecordedSessionIdAndStudentUserId(Long recordedSessionId, Long studentUserId);

    List<RecordedSessionAccessBlock> findByRecordedSessionId(Long recordedSessionId);
}
