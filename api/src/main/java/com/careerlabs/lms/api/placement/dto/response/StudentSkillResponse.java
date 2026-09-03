package com.careerlabs.lms.api.placement.dto.response;

import com.careerlabs.lms.api.placement.entity.StudentSkill;
import java.time.Instant;

public record StudentSkillResponse(
    Long id,
    String name,
    Integer level,
    String category,
    Instant createdAt
) {
    public static StudentSkillResponse from(StudentSkill s) {
        return new StudentSkillResponse(
            s.getId(),
            s.getSkillName(),
            s.getProficiencyLevel(),
            s.getCategory(),
            s.getCreatedAt()
        );
    }
}
