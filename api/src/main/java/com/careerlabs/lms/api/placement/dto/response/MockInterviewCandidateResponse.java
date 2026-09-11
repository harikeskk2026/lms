package com.careerlabs.lms.api.placement.dto.response;

import com.careerlabs.lms.api.placement.entity.MockInterviewCandidate;
import com.careerlabs.lms.api.placement.entity.MockInterviewCandidateStatus;
import com.careerlabs.lms.api.student.entity.Student;
import org.hibernate.Hibernate;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

public record MockInterviewCandidateResponse(
    Long id,
    StudentRef student,
    MockInterviewCandidateStatus status,
    Integer rating,
    String feedback,
    List<String> strengths,
    List<String> improvements,
    Instant createdAt
) {
    public static MockInterviewCandidateResponse from(MockInterviewCandidate c) {
        Student s = c.getStudent();
        MockInterviewResponse.UserRef uRef = null;
        try {
            if (s != null && s.getUser() != null) {
                uRef = new MockInterviewResponse.UserRef(s.getUser().getId(), s.getUser().getName(), s.getUser().getEmail());
            }
        } catch (Exception e) {
            uRef = (s != null && s.getUser() != null) ? new MockInterviewResponse.UserRef(s.getUser().getId(), null, null) : null;
        }
        StudentRef sRef = new StudentRef(s.getId(), uRef);

        List<String> strList = split(c.getStrengths());
        List<String> impList = split(c.getImprovements());

        return new MockInterviewCandidateResponse(
                c.getId(),
                sRef,
                c.getStatus(),
                c.getRating(),
                c.getFeedback(),
                strList,
                impList,
                c.getCreatedAt()
        );
    }

    private static List<String> split(String raw) {
        if (raw != null && !raw.isBlank()) {
            return Arrays.stream(raw.split(",")).map(String::trim).filter(st -> !st.isEmpty()).toList();
        }
        return List.of();
    }

    public record StudentRef(Long id, MockInterviewResponse.UserRef user) {}
}