package com.careerlabs.lms.api.syllabus.repository;

import com.careerlabs.lms.api.syllabus.entity.SyllabusTopic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SyllabusTopicRepository extends JpaRepository<SyllabusTopic, Long> {

    List<SyllabusTopic> findAllByModuleIdOrderByOrderIndexAsc(Long moduleId);

    List<SyllabusTopic> findAllByModuleIdInOrderByOrderIndexAsc(List<Long> moduleIds);

    int countByModuleId(Long moduleId);

    void deleteAllByModuleId(Long moduleId);
}
