package com.careerlabs.lms.api.placement.repository;

import com.careerlabs.lms.api.placement.entity.StudentSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface StudentSkillRepository extends JpaRepository<StudentSkill, Long> {
    List<StudentSkill> findByStudent_IdOrderByCreatedAtDesc(Long studentId);
}
