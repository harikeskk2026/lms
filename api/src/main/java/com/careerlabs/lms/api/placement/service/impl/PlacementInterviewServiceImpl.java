package com.careerlabs.lms.api.placement.service.impl;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.notification.entity.NotificationType;
import com.careerlabs.lms.api.notification.service.NotificationService;
import com.careerlabs.lms.api.placement.dto.request.CompleteInterviewRequest;
import com.careerlabs.lms.api.placement.dto.request.CreateEvaluationRequest;
import com.careerlabs.lms.api.placement.dto.request.CreateInterviewRoundRequest;
import com.careerlabs.lms.api.placement.dto.request.ScheduleInterviewRequest;
import com.careerlabs.lms.api.placement.dto.response.InterviewEvaluationResponse;
import com.careerlabs.lms.api.placement.dto.response.InterviewRoundResponse;
import com.careerlabs.lms.api.placement.dto.response.PlacementInterviewPageResponse;
import com.careerlabs.lms.api.placement.dto.response.PlacementInterviewResponse;
import com.careerlabs.lms.api.placement.entity.Drive;
import com.careerlabs.lms.api.placement.entity.DriveApplication;
import com.careerlabs.lms.api.placement.entity.DriveApplicationStatus;
import com.careerlabs.lms.api.placement.entity.InterviewEvaluation;
import com.careerlabs.lms.api.placement.entity.InterviewResult;
import com.careerlabs.lms.api.placement.entity.InterviewRound;
import com.careerlabs.lms.api.placement.entity.InterviewRoundType;
import com.careerlabs.lms.api.placement.entity.InterviewStatus;
import com.careerlabs.lms.api.placement.entity.PlacementInterview;
import com.careerlabs.lms.api.placement.repository.DriveApplicationRepository;
import com.careerlabs.lms.api.placement.repository.DriveRepository;
import com.careerlabs.lms.api.placement.repository.InterviewEvaluationRepository;
import com.careerlabs.lms.api.placement.repository.InterviewRoundRepository;
import com.careerlabs.lms.api.placement.repository.PlacementInterviewRepository;
import com.careerlabs.lms.api.placement.service.PlacementInterviewService;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
public class PlacementInterviewServiceImpl implements PlacementInterviewService {

    private static final Set<DriveApplicationStatus> CAN_SCHEDULE_STATUSES = Set.of(
            DriveApplicationStatus.SHORTLISTED,
            DriveApplicationStatus.RESUME_SHARED,
            DriveApplicationStatus.SELECTED);

    private final DriveRepository driveRepository;
    private final InterviewRoundRepository roundRepository;
    private final PlacementInterviewRepository interviewRepository;
    private final InterviewEvaluationRepository evaluationRepository;
    private final DriveApplicationRepository driveApplicationRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public PlacementInterviewServiceImpl(DriveRepository driveRepository,
                                         InterviewRoundRepository roundRepository,
                                         PlacementInterviewRepository interviewRepository,
                                         InterviewEvaluationRepository evaluationRepository,
                                         DriveApplicationRepository driveApplicationRepository,
                                         StudentRepository studentRepository,
                                         UserRepository userRepository,
                                         NotificationService notificationService) {
        this.driveRepository = driveRepository;
        this.roundRepository = roundRepository;
        this.interviewRepository = interviewRepository;
        this.evaluationRepository = evaluationRepository;
        this.driveApplicationRepository = driveApplicationRepository;
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional
    public InterviewRoundResponse createRound(Long driveId, CreateInterviewRoundRequest request, Long adminUserId) {
        Drive drive = requireDrive(driveId);

        if (roundRepository.findByDrive_IdOrderBySequenceAsc(driveId).stream()
                .anyMatch(r -> r.getSequence().equals(request.sequence()))) {
            throw new ConflictException("A round with sequence " + request.sequence() + " already exists for this drive");
        }

        if (request.minimumScore() != null && request.maxScore() != null
                && request.minimumScore() > request.maxScore()) {
            throw new BadRequestException("Minimum score cannot be greater than maximum score");
        }

        InterviewRound round = new InterviewRound();
        round.setDrive(drive);
        round.setName(request.name());
        round.setRoundType(request.roundType() != null ? request.roundType() : InterviewRoundType.TECHNICAL);
        round.setSequence(request.sequence());
        round.setDescription(request.description());
        round.setMinimumScore(request.minimumScore());
        round.setMaxScore(request.maxScore());
        round.setDurationMinutes(request.durationMinutes());
        round.setOnline(request.online() != null ? request.online() : true);
        round.setLocationLink(request.locationLink());
        round.setCreatedBy(adminUserId);
        round = roundRepository.save(round);

        return InterviewRoundResponse.from(round);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InterviewRoundResponse> listRounds(Long driveId) {
        requireDrive(driveId);
        return roundRepository.findByDrive_IdOrderBySequenceAsc(driveId).stream()
                .map(InterviewRoundResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public void deleteRound(Long driveId, Long roundId, Long adminUserId) {
        requireDrive(driveId);
        InterviewRound round = roundRepository.findById(roundId)
                .filter(r -> r.getDrive().getId().equals(driveId))
                .orElseThrow(() -> new ResourceNotFoundException("Round not found: " + roundId));

        if (!interviewRepository.findByRound_IdOrderByScheduledAtAsc(roundId).isEmpty()) {
            throw new ConflictException("Cannot delete a round that has scheduled interviews");
        }
        roundRepository.delete(round);
    }

    @Override
    @Transactional
    public PlacementInterviewResponse schedule(Long driveId, ScheduleInterviewRequest request, Long adminUserId) {
        Drive drive = requireDrive(driveId);

        InterviewRound round = roundRepository.findById(request.roundId())
                .filter(r -> r.getDrive().getId().equals(driveId))
                .orElseThrow(() -> new ResourceNotFoundException("Round not found: " + request.roundId()));

        Student student = studentRepository.findById(request.studentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + request.studentId()));

        DriveApplication application = driveApplicationRepository
                .findByDrive_IdAndStudent_Id(driveId, student.getId())
                .orElseThrow(() -> new BadRequestException("Student has no application for this drive"));
        if (!CAN_SCHEDULE_STATUSES.contains(application.getStatus())) {
            throw new BadRequestException("Interviews can only be scheduled for shortlisted candidates (current status: "
                    + application.getStatus() + ")");
        }

        List<PlacementInterview> existing = interviewRepository.findByStudent_IdAndDrive_IdOrderByScheduledAtAsc(student.getId(), driveId);
        if (existing.stream().anyMatch(i -> i.getRound().getId().equals(round.getId())
                && (i.getStatus() == InterviewStatus.SCHEDULED || i.getStatus() == InterviewStatus.RESCHEDULED))) {
            throw new ConflictException("An active interview already exists for this student on round '" + round.getName() + "'");
        }

        PlacementInterview interview = new PlacementInterview();
        interview.setDrive(drive);
        interview.setRound(round);
        interview.setStudent(student);
        interview.setScheduledAt(request.scheduledAt());
        interview.setMeetingLink(request.meetingLink());
        interview.setLocation(request.location());
        interview.setOnline(request.online() != null ? request.online() : Boolean.TRUE.equals(round.getOnline()));
        interview.setNotes(request.notes());
        interview.setStatus(InterviewStatus.SCHEDULED);
        if (request.interviewerId() != null) {
            interview.setInterviewer(requireUser(request.interviewerId()));
        }
        interview.setCreatedBy(adminUserId);
        interview = interviewRepository.save(interview);

        notificationService.notifyUser(student.getUser().getId(),
                "📅 Interview Scheduled",
                "Your " + round.getName() + " round for " + drive.getCompanyName() + " (" + drive.getRole() + ") has been scheduled.",
                NotificationType.INTERVIEW, "/student/placement");

        return PlacementInterviewResponse.from(interview);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PlacementInterviewResponse> listForDrive(Long driveId) {
        requireDrive(driveId);
        return interviewRepository.findByDrive_IdOrderByScheduledAtAsc(driveId).stream()
                .map(PlacementInterviewResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PlacementInterviewPageResponse pageForDrive(Long driveId, String search, String status, int page, int limit) {
        requireDrive(driveId);
        int safePage = Math.max(page, 1) - 1;
        int safeLimit = limit <= 0 ? 20 : Math.min(limit, 100);
        Page<PlacementInterview> result = interviewRepository.findAll(buildSpecification(driveId, search, status),
                PageRequest.of(safePage, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<PlacementInterviewResponse> items = result.getContent().stream()
                .map(PlacementInterviewResponse::from)
                .toList();
        return new PlacementInterviewPageResponse(items, result.getTotalElements(), result.getTotalPages(),
                result.getNumber() + 1);
    }

    private Specification<PlacementInterview> buildSpecification(Long driveId, String search, String status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("drive").get("id"), driveId));
            if (status != null && !status.isBlank()) {
                try {
                    predicates.add(cb.equal(root.get("status"), InterviewStatus.valueOf(status.trim().toUpperCase())));
                } catch (IllegalArgumentException e) {
                    throw new BadRequestException("Invalid interview status: " + status.trim()
                            + ". Valid values: SCHEDULED, RESCHEDULED, COMPLETED, CANCELLED, ABSENT");
                }
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search.trim().toLowerCase() + "%";
                Join<PlacementInterview, Student> student = root.join("student", JoinType.LEFT);
                Join<Student, User> user = student.join("user", JoinType.LEFT);
                Join<PlacementInterview, InterviewRound> round = root.join("round", JoinType.LEFT);
                predicates.add(cb.or(
                        cb.like(cb.lower(user.get("name")), like),
                        cb.like(cb.lower(user.get("email")), like),
                        cb.like(cb.lower(round.get("name")), like)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    @Override
    @Transactional(readOnly = true)
    public List<PlacementInterviewResponse> listForStudent(Long studentUserId) {
        Student student = studentRepository.findByUserId(studentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for this account"));
        return interviewRepository.findByStudent_IdOrderByScheduledAtDesc(student.getId()).stream()
                .map(PlacementInterviewResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PlacementInterviewPageResponse pageForStudent(Long studentUserId, String search, int page, int limit) {
        Student student = studentRepository.findByUserId(studentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for this account"));
        String q = search == null ? "" : search.trim().toLowerCase();
        List<PlacementInterview> filtered = interviewRepository.findByStudent_IdOrderByScheduledAtDesc(student.getId()).stream()
                .filter(iv -> {
                    if (q.isEmpty()) {
                        return true;
                    }
                    String round = iv.getRound() != null && iv.getRound().getName() != null
                            ? iv.getRound().getName().toLowerCase() : "";
                    String company = iv.getDrive() != null && iv.getDrive().getCompanyName() != null
                            ? iv.getDrive().getCompanyName().toLowerCase() : "";
                    String role = iv.getDrive() != null && iv.getDrive().getRole() != null
                            ? iv.getDrive().getRole().toLowerCase() : "";
                    return (round + " " + company + " " + role).contains(q);
                })
                .toList();
        int safePage = Math.max(page, 1);
        int safeLimit = limit <= 0 ? 20 : Math.min(limit, 100);
        long total = filtered.size();
        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / safeLimit);
        int from = Math.min((safePage - 1) * safeLimit, filtered.size());
        int to = Math.min(from + safeLimit, filtered.size());
        List<PlacementInterviewResponse> items = filtered.subList(from, to).stream()
                .map(PlacementInterviewResponse::from)
                .toList();
        return new PlacementInterviewPageResponse(items, total, totalPages, safePage);
    }

    @Override
    @Transactional
    public PlacementInterviewResponse complete(Long driveId, Long interviewId, CompleteInterviewRequest request, Long adminUserId) {
        PlacementInterview interview = interviewRepository.findById(interviewId)
                .filter(i -> i.getDrive().getId().equals(driveId))
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found: " + interviewId));

        InterviewStatus newStatus;
        try {
            newStatus = InterviewStatus.valueOf(request.status());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid interview status: " + request.status());
        }

        interview.setStatus(newStatus);
        if (request.scheduledAt() != null) {
            interview.setScheduledAt(request.scheduledAt());
        }

        if (request.result() != null) {
            interview.setResult(request.result());
            interview.setScore(request.score());
        }
        if (request.feedback() != null) {
            interview.setFeedback(request.feedback());
        }
        if (request.notes() != null) {
            interview.setNotes(request.notes());
        }
        interview = interviewRepository.save(interview);

        if (newStatus == InterviewStatus.COMPLETED && request.result() == InterviewResult.PASS) {
            advanceOnPass(interview);
        } else if (newStatus == InterviewStatus.COMPLETED && request.result() == InterviewResult.FAIL) {
            markNotSelected(interview);
        }

        return PlacementInterviewResponse.from(interview);
    }

    @Override
    @Transactional
    public InterviewEvaluationResponse evaluate(Long driveId, CreateEvaluationRequest request, Long adminUserId) {
        PlacementInterview interview = interviewRepository.findById(request.interviewId())
                .filter(i -> i.getDrive().getId().equals(driveId))
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found: " + request.interviewId()));

        if (request.overallScore() != null && (request.overallScore() < 0 || request.overallScore() > 100)) {
            throw new BadRequestException("overallScore must be between 0 and 100");
        }

        User evaluator = requireUser(adminUserId);

        InterviewEvaluation evaluation = new InterviewEvaluation();
        evaluation.setInterview(interview);
        evaluation.setStudent(interview.getStudent());
        evaluation.setEvaluator(evaluator);
        evaluation.setTechnicalScore(request.technicalScore());
        evaluation.setCommunicationScore(request.communicationScore());
        evaluation.setProblemSolvingScore(request.problemSolvingScore());
        evaluation.setCodingScore(request.codingScore());
        evaluation.setDomainScore(request.domainScore());
        evaluation.setOverallScore(request.overallScore());
        evaluation.setRecommendation(request.recommendation());
        evaluation.setComments(request.comments());
        evaluation = evaluationRepository.save(evaluation);

        return InterviewEvaluationResponse.from(evaluation);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InterviewEvaluationResponse> listEvaluations(Long driveId, Long interviewId) {
        requireDrive(driveId);
        interviewRepository.findByIdAndDriveId(interviewId, driveId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found: " + interviewId));
        return evaluationRepository.findByInterview_IdOrderByCreatedAtDesc(interviewId).stream()
                .map(InterviewEvaluationResponse::from)
                .toList();
    }

    /**
     * If the passed round is the last configured round for the drive, the
     * candidate's application advances to SELECTED automatically; otherwise it
     * stays put awaiting further rounds.
     */
    private void advanceOnPass(PlacementInterview interview) {
        List<InterviewRound> rounds = roundRepository.findByDrive_IdOrderBySequenceAsc(interview.getDrive().getId());
        int maxSequence = rounds.stream().mapToInt(InterviewRound::getSequence).max().orElse(1);
        if (interview.getRound().getSequence() < maxSequence) {
            return;
        }

        driveApplicationRepository.findByDrive_IdAndStudent_Id(
                        interview.getDrive().getId(), interview.getStudent().getId())
                .ifPresent(application -> {
                    if (application.getStatus() == DriveApplicationStatus.RESUME_SHARED
                            || application.getStatus() == DriveApplicationStatus.SHORTLISTED
                            || application.getStatus() == DriveApplicationStatus.UNDER_REVIEW) {
                        application.setStatus(DriveApplicationStatus.SELECTED);
                        driveApplicationRepository.save(application);
                        notificationService.notifyUser(application.getStudent().getUser().getId(),
                                "🎉 You've Been Selected!",
                                "Congratulations! You've cleared the interview process for "
                                        + interview.getDrive().getCompanyName() + " (" + interview.getDrive().getRole() + ").",
                                NotificationType.SUCCESS, "/student/placement");
                    }
                });
    }

    private void markNotSelected(PlacementInterview interview) {
        driveApplicationRepository.findByDrive_IdAndStudent_Id(
                        interview.getDrive().getId(), interview.getStudent().getId())
                .ifPresent(application -> {
                    if (application.getStatus() != DriveApplicationStatus.ACCEPTED) {
                        application.setStatus(DriveApplicationStatus.NOT_SELECTED);
                        driveApplicationRepository.save(application);
                        notificationService.notifyUser(application.getStudent().getUser().getId(),
                                "Application Update",
                                "You were not selected after the " + interview.getRound().getName() + " round with "
                                        + interview.getDrive().getCompanyName() + ".",
                                NotificationType.WARNING, "/student/placement");
                    }
                });
    }

    private Drive requireDrive(Long driveId) {
        return driveRepository.findById(driveId)
                .orElseThrow(() -> new ResourceNotFoundException("Drive not found: " + driveId));
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }
}