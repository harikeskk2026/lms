package com.careerlabs.lms.api.recordedsession.repository;

import com.careerlabs.lms.api.recordedsession.entity.RecordedSessionAsset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RecordedSessionAssetRepository extends JpaRepository<RecordedSessionAsset, Long> {

    Optional<RecordedSessionAsset> findByRecordedSessionId(Long recordedSessionId);

    void deleteByRecordedSessionId(Long recordedSessionId);
}
