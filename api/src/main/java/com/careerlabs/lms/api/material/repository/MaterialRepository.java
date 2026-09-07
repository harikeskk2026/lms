package com.careerlabs.lms.api.material.repository;

import com.careerlabs.lms.api.material.entity.Material;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MaterialRepository extends JpaRepository<Material, Long> {

    List<Material> findAllByCourseIdAndModuleIdIsNullAndTopicIdIsNullAndSessionIdIsNullOrderByOrderIndexAsc(Long courseId);

    List<Material> findAllByModuleIdOrderByOrderIndexAsc(Long moduleId);

    List<Material> findAllByModuleIdInOrderByOrderIndexAsc(java.util.Collection<Long> moduleIds);

    List<Material> findAllByTopicIdOrderByOrderIndexAsc(Long topicId);

    List<Material> findAllByTopicIdInOrderByOrderIndexAsc(java.util.Collection<Long> topicIds);

    List<Material> findAllBySessionIdOrderByOrderIndexAsc(Long sessionId);

    List<Material> findAllBySessionIdInOrderByOrderIndexAsc(java.util.Collection<Long> sessionIds);

    int countByCourseIdAndModuleIdIsNullAndTopicIdIsNullAndSessionIdIsNull(Long courseId);

    int countByModuleId(Long moduleId);

    int countByTopicId(Long topicId);

    int countBySessionId(Long sessionId);

    void deleteAllByCourseId(Long courseId);

    void deleteAllByModuleIdIn(List<Long> moduleIds);

    void deleteAllByTopicIdIn(List<Long> topicIds);

    void deleteAllBySessionIdIn(List<Long> sessionIds);
}
