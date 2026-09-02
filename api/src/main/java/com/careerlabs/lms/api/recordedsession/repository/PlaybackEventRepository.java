package com.careerlabs.lms.api.recordedsession.repository;

import com.careerlabs.lms.api.recordedsession.entity.PlaybackEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaybackEventRepository extends JpaRepository<PlaybackEvent, Long> {
}
