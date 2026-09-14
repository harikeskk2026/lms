package com.careerlabs.lms.api.placement.service.impl;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.placement.dto.request.CreateMockInterviewRequest;
import com.careerlabs.lms.api.placement.dto.request.MockCandidateFeedbackRequest;
import com.careerlabs.lms.api.placement.dto.request.UpdateMockInterviewRequest;
import com.careerlabs.lms.api.placement.dto.response.MockInterviewResponse;
import com.careerlabs.lms.api.placement.entity.*;
import com.careerlabs.lms.api.placement.repository.MockInterviewCandidateRepository;
import com.careerlabs.lms.api.placement.repository.MockInterviewRepository;
import com.careerlabs.lms.api.placement.repository.PreparationMaterialRepository;
import com.careerlabs.lms.api.placement.service.MockInterviewService;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class MockInterviewServiceImpl implements MockInterviewService {

    private static final int MAX_DURATION_MINUTES = 600;

    private final MockInterviewRepository mockInterviewRepository;
    private final MockInterviewCandidateRepository candidateRepository;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final PreparationMaterialRepository preparationMaterialRepository;

    public MockInterviewServiceImpl(MockInterviewRepository mockInterviewRepository,
                                    MockInterviewCandidateRepository candidateRepository,
                                    StudentRepository studentRepository,
                                    EnrollmentRepository enrollmentRepository,
                                    PreparationMaterialRepository preparationMaterialRepository) {
        this.mockInterviewRepository = mockInterviewRepository;
        this.candidateRepository = candidateRepository;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.preparationMaterialRepository = preparationMaterialRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MockInterviewResponse> listAll() {
        return mockInterviewRepository.findAllByOrderByScheduledAtDesc().stream()
                .map(MockInterviewResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public MockInterviewResponse create(CreateMockInterviewRequest request) {
        if (request.getMode() == null) {
            throw new BadRequestException("Mode is required (ONLINE or OFFLINE)");
        }

        Instant scheduledAt = parseScheduledAt(request.getScheduledAt(), true);
        Integer duration = validateDuration(request.getDurationMinutes());
        validateLocationForMode(request.getMode(), request.getMeetLink(), request.getLocation());

        List<Student> selected = resolveStudents(request.getSelectionType(), request.getStudentIds(),
                request.getBatchIds(), request.getCourseIds(), request.getRandomCount());
        if (selected.isEmpty()) {
            throw new BadRequestException("No students selected for the mock interview");
        }

        MockInterview mock = new MockInterview();
        mock.setMode(request.getMode());
        mock.setScheduledAt(scheduledAt);
        mock.setDurationMinutes(duration);
        mock.setInterviewerName(blankToNull(request.getInterviewerName()));
        mock.setMeetLink(request.getMode() == MockInterviewMode.ONLINE ? request.getMeetLink().trim() : null);
        mock.setLocation(request.getMode() == MockInterviewMode.OFFLINE ? request.getLocation().trim() : null);
        mock.setStatus(MockInterviewStatus.SCHEDULED);
        mock.setSyllabus(blankToNull(request.getSyllabus()));
        mock.setInstructions(blankToNull(request.getInstructions()));
        mock.setPreparationMaterials(resolvePreparationMaterials(request.getPreparationMaterialIds()));

        List<MockInterviewCandidate> candidates = new ArrayList<>();
        for (Student s : selected) {
            MockInterviewCandidate c = new MockInterviewCandidate();
            c.setMockInterview(mock);
            c.setStudent(s);
            c.setStatus(MockInterviewCandidateStatus.SCHEDULED);
            candidates.add(c);
        }
        mock.setCandidates(candidates);

        return MockInterviewResponse.from(mockInterviewRepository.save(mock));
    }

    @Override
    @Transactional
    public MockInterviewResponse update(Long id, UpdateMockInterviewRequest request) {
        MockInterview mock = mockInterviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mock interview not found: " + id));

        if (request.mode() != null) {
            mock.setMode(request.mode());
        }
        if (request.scheduledAt() != null && !request.scheduledAt().isBlank()) {
            Instant scheduledAt = parseScheduledAt(request.scheduledAt(), true);
            mock.setScheduledAt(scheduledAt);
        }
        if (request.durationMinutes() != null) {
            mock.setDurationMinutes(validateDuration(request.durationMinutes()));
        }
        if (request.interviewerName() != null) {
            mock.setInterviewerName(blankToNull(request.interviewerName()));
        }
        if (request.meetLink() != null) {
            mock.setMeetLink(blankToNull(request.meetLink()));
        }
        if (request.location() != null) {
            mock.setLocation(blankToNull(request.location()));
        }
        if (request.syllabus() != null) {
            mock.setSyllabus(blankToNull(request.syllabus()));
        }
        if (request.instructions() != null) {
            mock.setInstructions(blankToNull(request.instructions()));
        }
        if (request.preparationMaterialIds() != null) {
            mock.setPreparationMaterials(resolvePreparationMaterials(request.preparationMaterialIds()));
        }
        if (request.status() != null) {
            mock.setStatus(request.status());
            if (request.status() == MockInterviewStatus.CANCELLED) {
                mock.getCandidates().forEach(c -> c.setStatus(MockInterviewCandidateStatus.CANCELLED));
            } else if (request.status() == MockInterviewStatus.COMPLETED) {
                mock.getCandidates().forEach(c -> {
                    if (c.getStatus() == MockInterviewCandidateStatus.SCHEDULED) {
                        c.setStatus(MockInterviewCandidateStatus.COMPLETED);
                    }
                });
            }
        }

        validateLocationForMode(mock.getMode(), mock.getMeetLink(), mock.getLocation());

        return MockInterviewResponse.from(mockInterviewRepository.save(mock));
    }

    @Override
    @Transactional
    public MockInterviewResponse updateCandidate(Long mockInterviewId, Long candidateId, MockCandidateFeedbackRequest request) {
        MockInterviewCandidate candidate = candidateRepository.findById(candidateId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found: " + candidateId));

        if (!candidate.getMockInterview().getId().equals(mockInterviewId)) {
            throw new ResourceNotFoundException("Candidate not found: " + candidateId);
        }

        MockInterviewCandidateStatus status = request.status() != null ? request.status() : candidate.getStatus();
        if (status == MockInterviewCandidateStatus.COMPLETED) {
            if (request.rating() == null || request.rating() < 1 || request.rating() > 5) {
                throw new BadRequestException("Rating is required (1-5) when completing a mock interview");
            }
            if (request.feedback() == null || request.feedback().isBlank()) {
                throw new BadRequestException("Feedback is required when completing a mock interview");
            }
        }
        if (request.rating() != null && (request.rating() < 1 || request.rating() > 5)) {
            throw new BadRequestException("Rating must be between 1 and 5");
        }

        candidate.setStatus(status);
        candidate.setRating(request.rating());
        candidate.setFeedback(blankToNull(request.feedback()));
        candidate.setStrengths(joinList(request.strengths()));
        candidate.setImprovements(joinList(request.improvements()));

        MockInterview mock = candidate.getMockInterview();
        if (status == MockInterviewCandidateStatus.COMPLETED && mock.getStatus() == MockInterviewStatus.SCHEDULED) {
            mock.setStatus(MockInterviewStatus.COMPLETED);
        }

        return MockInterviewResponse.from(mockInterviewRepository.save(mock));
    }

    private List<Student> resolveStudents(MockInterviewSelection selection, List<Long> studentIds,
                                          List<Long> batchIds, List<Long> courseIds, Integer randomCount) {
        MockInterviewSelection sel = selection != null ? selection : MockInterviewSelection.MANUAL;
        LinkedHashSet<Student> pool = new LinkedHashSet<>();

        switch (sel) {
            case BATCH -> {
                if (batchIds == null || batchIds.isEmpty()) {
                    throw new BadRequestException("Select at least one batch");
                }
                List<Student> students = enrollmentRepository.findActiveStudentsByBatchIdIn(batchIds).stream()
                        .filter(s -> s.getUser() != null && s.getUser().isActive())
                        .toList();
                pool.addAll(students);
            }
            case COURSE -> {
                if (courseIds == null || courseIds.isEmpty()) {
                    throw new BadRequestException("Select at least one course");
                }
                pool.addAll(studentRepository.findByUser_ActiveTrueAndCourseIdIn(courseIds));
            }
            case RANDOM -> {
                List<Student> source = new ArrayList<>();
                boolean hasBatchFilter = batchIds != null && !batchIds.isEmpty();
                boolean hasCourseFilter = courseIds != null && !courseIds.isEmpty();
                if (hasBatchFilter) {
                    source.addAll(enrollmentRepository.findActiveStudentsByBatchIdIn(batchIds).stream()
                            .filter(s -> s.getUser() != null && s.getUser().isActive())
                            .toList());
                } else if (hasCourseFilter) {
                    source.addAll(studentRepository.findByUser_ActiveTrueAndCourseIdIn(courseIds));
                } else {
                    source.addAll(studentRepository.findByUser_ActiveTrue());
                }
                if (randomCount == null || randomCount <= 0) {
                    throw new BadRequestException("Random selection requires a positive count");
                }
                Collections.shuffle(source);
                pool.addAll(source.subList(0, Math.min(randomCount, source.size())));
            }
            default -> {
                if (studentIds == null || studentIds.isEmpty()) {
                    throw new BadRequestException("Select at least one student");
                }
                for (Long studentId : new LinkedHashSet<>(studentIds)) {
                    pool.add(studentRepository.findById(studentId)
                            .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + studentId)));
                }
            }
        }
        return new ArrayList<>(pool);
    }

    private Set<PreparationMaterial> resolvePreparationMaterials(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return new HashSet<>();
        }
        Set<PreparationMaterial> result = new HashSet<>();
        for (Long id : new LinkedHashSet<>(ids)) {
            PreparationMaterial material = preparationMaterialRepository.findById(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Preparation material not found: " + id));
            if (material.getStatus() != PreparationMaterialStatus.PUBLISHED) {
                throw new BadRequestException("Only published preparation materials can be attached: " + id);
            }
            result.add(material);
        }
        return result;
    }

    private Instant parseScheduledAt(String raw, boolean requireFuture) {
        if (raw == null || raw.isBlank()) {
            if (requireFuture) {
                throw new BadRequestException("Scheduled date and time is required");
            }
            return null;
        }
        Instant scheduledAt = parseLenient(raw);
        if (scheduledAt == null) {
            throw new BadRequestException("Invalid date and time format");
        }
        if (requireFuture && scheduledAt.isBefore(Instant.now().minusSeconds(60))) {
            throw new BadRequestException("Mock interview cannot be scheduled in the past");
        }
        return scheduledAt;
    }

    private Instant parseLenient(String raw) {
        try {
            return Instant.parse(raw);
        } catch (Exception e1) {
            try {
                if (raw.length() == 16) {
                    return java.time.LocalDateTime.parse(raw, java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"))
                            .atZone(java.time.ZoneId.systemDefault()).toInstant();
                }
                return java.time.LocalDateTime.parse(raw, java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        .atZone(java.time.ZoneId.systemDefault()).toInstant();
            } catch (Exception e2) {
                return null;
            }
        }
    }

    private void validateLocationForMode(MockInterviewMode mode, String meetLink, String location) {
        if (mode == MockInterviewMode.ONLINE) {
            if (meetLink == null || meetLink.isBlank()) {
                throw new BadRequestException("Meeting link is required for online mock interviews");
            }
            String link = meetLink.trim();
            if (!(link.startsWith("http://") || link.startsWith("https://"))) {
                throw new BadRequestException("Meeting link must be a valid URL starting with http:// or https://");
            }
            if (location != null && !location.isBlank()) {
                // Location is optional for online mocks but usable as a note.
            }
        } else if (mode == MockInterviewMode.OFFLINE) {
            if (location == null || location.isBlank()) {
                throw new BadRequestException("Location is required for offline mock interviews");
            }
        }
    }

    private Integer validateDuration(Integer duration) {
        if (duration == null) {
            return 30;
        }
        if (duration < 1 || duration > MAX_DURATION_MINUTES) {
            throw new BadRequestException("Duration must be between 1 and " + MAX_DURATION_MINUTES + " minutes");
        }
        return duration;
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String joinList(List<String> values) {
        if (values == null) {
            return null;
        }
        return values.stream()
                .filter(v -> v != null && !v.isBlank())
                .map(String::trim)
                .reduce((a, b) -> a + ", " + b)
                .orElse(null);
    }
}