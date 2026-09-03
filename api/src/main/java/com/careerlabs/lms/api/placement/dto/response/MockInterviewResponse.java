package com.careerlabs.lms.api.placement.dto.response;

import com.careerlabs.lms.api.placement.entity.MockInterview;
import com.careerlabs.lms.api.placement.entity.MockInterviewStatus;
import com.careerlabs.lms.api.student.entity.Student;
import org.hibernate.Hibernate;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

public record MockInterviewResponse(
    Long id,
    StudentRef student,
    Instant scheduledAt,
    String interviewerName,
    String meetLink,
    MockInterviewStatus status,
    Integer rating,
    String feedback,
    List<String> strengths,
    List<String> improvements,
    Instant createdAt
) {
    public record StudentRef(Long id, UserRef user) {}
    public record UserRef(Long id, String name, String email) {}

    public static MockInterviewResponse from(MockInterview m) {
        StudentRef sRef = null;
        if (m.getStudent() != null) {
            Student s = m.getStudent();
            UserRef uRef = null;
            try {
                if (s.getUser() != null) {
                    if (Hibernate.isInitialized(s.getUser())) {
                        uRef = new UserRef(s.getUser().getId(), s.getUser().getName(), s.getUser().getEmail());
                    } else {
                        uRef = new UserRef(s.getUser().getId(), null, null);
                    }
                }
            } catch (Exception e) {
                uRef = null;
            }
            sRef = new StudentRef(s.getId(), uRef);
        }

        List<String> strList = m.getStrengths() != null && !m.getStrengths().isBlank()
                ? Arrays.stream(m.getStrengths().split(",")).map(String::trim).filter(st -> !st.isEmpty()).toList()
                : List.of();

        List<String> impList = m.getImprovements() != null && !m.getImprovements().isBlank()
                ? Arrays.stream(m.getImprovements().split(",")).map(String::trim).filter(st -> !st.isEmpty()).toList()
                : List.of();

        return new MockInterviewResponse(
                m.getId(),
                sRef,
                m.getScheduledAt(),
                m.getInterviewerName(),
                m.getMeetLink(),
                m.getStatus(),
                m.getRating(),
                m.getFeedback(),
                strList,
                impList,
                m.getCreatedAt()
        );
    }
}
