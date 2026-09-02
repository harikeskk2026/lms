package com.careerlabs.lms.api.syllabus.repository;

import com.careerlabs.lms.api.syllabus.entity.SyllabusModule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SyllabusModuleRepository extends JpaRepository<SyllabusModule, Long> {

    List<SyllabusModule> findAllByCourseIdOrderByOrderIndexAsc(Long courseId);

    List<SyllabusModule> findAllByCourseIdInOrderByOrderIndexAsc(List<Long> courseIds);

    int countByCourseId(Long courseId);
}
