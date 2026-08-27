package com.careerlabs.lms.api.session.repository;

import com.careerlabs.lms.api.session.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SessionRepository extends JpaRepository<Session, Long> {

    List<Session> findAllByTopicIdOrderByOrderIndexAsc(Long topicId);

    List<Session> findAllByTopicIdInOrderByOrderIndexAsc(List<Long> topicIds);

    int countByTopicId(Long topicId);

    void deleteAllByTopicId(Long topicId);

    void deleteAllByTopicIdIn(List<Long> topicIds);
}
