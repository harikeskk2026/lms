package com.careerlabs.lms.api.recordedsession.repository;

import com.careerlabs.lms.api.recordedsession.entity.PlaybackSession;
import com.careerlabs.lms.api.recordedsession.entity.PlaybackSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PlaybackSessionRepository extends JpaRepository<PlaybackSession, Long> {

    List<PlaybackSession> findByStudentIdAndStatus(Long studentId, PlaybackSessionStatus status);

    /**
     * Returns a List, not a single row: a past race between two near-simultaneous
     * start requests (e.g. a double-fired client call) could have inserted more
     * than one ACTIVE row for the same (student, recording, device) — callers
     * must tolerate and heal that rather than assume uniqueness.
     */
    List<PlaybackSession> findByStudentIdAndRecordedSessionIdAndDeviceIdAndStatus(
            Long studentId, Long recordedSessionId, String deviceId, PlaybackSessionStatus status);

    Optional<PlaybackSession> findFirstByStudentIdAndRecordedSessionIdOrderByStartedAtDesc(Long studentId, Long recordedSessionId);

    List<PlaybackSession> findByRecordedSessionId(Long recordedSessionId);

    List<PlaybackSession> findByRecordedSessionIdOrderByStartedAtDesc(Long recordedSessionId);

    long countByRecordedSessionId(Long recordedSessionId);

    long countByRecordedSessionIdAndStatus(Long recordedSessionId, PlaybackSessionStatus status);

    long countByRecordedSessionIdAndCompletionPercentageGreaterThanEqual(Long recordedSessionId, int completionPercentage);

    @Query("SELECT COUNT(DISTINCT p.studentId) FROM PlaybackSession p WHERE p.recordedSession.id = :recordedSessionId")
    long countDistinctStudentsByRecordedSessionId(@Param("recordedSessionId") Long recordedSessionId);
}
