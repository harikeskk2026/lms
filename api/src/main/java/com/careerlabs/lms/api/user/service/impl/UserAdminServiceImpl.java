package com.careerlabs.lms.api.user.service.impl;

import com.careerlabs.lms.api.announcement.entity.Announcement;
import com.careerlabs.lms.api.announcement.repository.AnnouncementAcknowledgmentRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementCommentRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementTemplateRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementVersionRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementViewRepository;
import com.careerlabs.lms.api.common.dto.response.BulkImportResponse;
import com.careerlabs.lms.api.common.dto.response.ImportRowError;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.util.CsvParser;
import com.careerlabs.lms.api.common.util.ImportValidators;
import com.careerlabs.lms.api.auth.repository.RevokedTokenRepository;
import com.careerlabs.lms.api.meeting.repository.MeetingLinkRepository;
import com.careerlabs.lms.api.notification.repository.NotificationRepository;
import com.careerlabs.lms.api.placement.repository.DriveApplicationStatusHistoryRepository;
import com.careerlabs.lms.api.placement.repository.DriveRepository;
import com.careerlabs.lms.api.placement.repository.InterviewEvaluationRepository;
import com.careerlabs.lms.api.placement.repository.PlacementInterviewRepository;
import com.careerlabs.lms.api.placement.repository.PreparationMaterialRepository;
import com.careerlabs.lms.api.quiz.repository.AptitudeTipRepository;
import com.careerlabs.lms.api.quiz.repository.InterviewQuestionRepository;
import com.careerlabs.lms.api.quiz.repository.InterviewResourceRepository;
import com.careerlabs.lms.api.quiz.repository.QuestionRepository;
import com.careerlabs.lms.api.quiz.repository.QuizRepository;
import com.careerlabs.lms.api.recordedsession.repository.RecordedSessionRepository;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.security.TokenRevocationService;
import com.careerlabs.lms.api.user.dto.request.AdminCreateRequest;
import com.careerlabs.lms.api.user.dto.request.AdminUpdateRequest;
import com.careerlabs.lms.api.user.dto.response.AdminPageResponse;
import com.careerlabs.lms.api.user.dto.response.AdminResponse;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import com.careerlabs.lms.api.user.service.UserAdminService;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class UserAdminServiceImpl implements UserAdminService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenRevocationService tokenRevocationService;
    private final TransactionTemplate transactionTemplate;

    // Content that would take student-owned data down with it if cascaded -
    // deletion is blocked outright if any of this exists (see deleteAdmin()).
    private final DriveRepository driveRepository;
    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final RecordedSessionRepository recordedSessionRepository;
    private final MeetingLinkRepository meetingLinkRepository;
    private final InterviewEvaluationRepository interviewEvaluationRepository;

    // Shared platform content - reassigned to the deleting SUPERADMIN rather
    // than deleted, since it's reference material other admins/students still use.
    private final AnnouncementTemplateRepository announcementTemplateRepository;
    private final AptitudeTipRepository aptitudeTipRepository;
    private final InterviewQuestionRepository interviewQuestionRepository;
    private final InterviewResourceRepository interviewResourceRepository;
    private final PreparationMaterialRepository preparationMaterialRepository;

    // Cross-references on content NOT owned by the admin being deleted (e.g.
    // they approved/commented/evaluated something someone else created).
    private final AnnouncementRepository announcementRepository;
    private final AnnouncementVersionRepository announcementVersionRepository;
    private final AnnouncementCommentRepository announcementCommentRepository;
    private final AnnouncementAcknowledgmentRepository announcementAcknowledgmentRepository;
    private final AnnouncementViewRepository announcementViewRepository;
    private final DriveApplicationStatusHistoryRepository driveApplicationStatusHistoryRepository;
    private final PlacementInterviewRepository placementInterviewRepository;

    // Purely the admin's own account data - deleted outright.
    private final NotificationRepository notificationRepository;
    private final RevokedTokenRepository revokedTokenRepository;

    public UserAdminServiceImpl(UserRepository userRepository,
                                PasswordEncoder passwordEncoder,
                                TokenRevocationService tokenRevocationService,
                                PlatformTransactionManager transactionManager,
                                DriveRepository driveRepository,
                                QuizRepository quizRepository,
                                QuestionRepository questionRepository,
                                RecordedSessionRepository recordedSessionRepository,
                                MeetingLinkRepository meetingLinkRepository,
                                InterviewEvaluationRepository interviewEvaluationRepository,
                                AnnouncementTemplateRepository announcementTemplateRepository,
                                AptitudeTipRepository aptitudeTipRepository,
                                InterviewQuestionRepository interviewQuestionRepository,
                                InterviewResourceRepository interviewResourceRepository,
                                PreparationMaterialRepository preparationMaterialRepository,
                                AnnouncementRepository announcementRepository,
                                AnnouncementVersionRepository announcementVersionRepository,
                                AnnouncementCommentRepository announcementCommentRepository,
                                AnnouncementAcknowledgmentRepository announcementAcknowledgmentRepository,
                                AnnouncementViewRepository announcementViewRepository,
                                DriveApplicationStatusHistoryRepository driveApplicationStatusHistoryRepository,
                                PlacementInterviewRepository placementInterviewRepository,
                                NotificationRepository notificationRepository,
                                RevokedTokenRepository revokedTokenRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenRevocationService = tokenRevocationService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.driveRepository = driveRepository;
        this.quizRepository = quizRepository;
        this.questionRepository = questionRepository;
        this.recordedSessionRepository = recordedSessionRepository;
        this.meetingLinkRepository = meetingLinkRepository;
        this.interviewEvaluationRepository = interviewEvaluationRepository;
        this.announcementTemplateRepository = announcementTemplateRepository;
        this.aptitudeTipRepository = aptitudeTipRepository;
        this.interviewQuestionRepository = interviewQuestionRepository;
        this.interviewResourceRepository = interviewResourceRepository;
        this.preparationMaterialRepository = preparationMaterialRepository;
        this.announcementRepository = announcementRepository;
        this.announcementVersionRepository = announcementVersionRepository;
        this.announcementCommentRepository = announcementCommentRepository;
        this.announcementAcknowledgmentRepository = announcementAcknowledgmentRepository;
        this.announcementViewRepository = announcementViewRepository;
        this.driveApplicationStatusHistoryRepository = driveApplicationStatusHistoryRepository;
        this.placementInterviewRepository = placementInterviewRepository;
        this.notificationRepository = notificationRepository;
        this.revokedTokenRepository = revokedTokenRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public AdminPageResponse listAdmins(String search, String status, int page, int limit) {
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("role"), Role.ADMIN));
            if (search != null && !search.trim().isEmpty()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("email")), pattern)
                ));
            }
            if ("active".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(root.get("active"), true));
            } else if ("inactive".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(root.get("active"), false));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Page<User> userPage = userRepository.findAll(spec, pageable);
        List<AdminResponse> admins = userPage.getContent().stream().map(AdminResponse::from).toList();
        return new AdminPageResponse(admins, userPage.getTotalElements(), userPage.getTotalPages(), userPage.getNumber() + 1);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminResponse getAdmin(Long adminId) {
        User user = userRepository.findById(adminId)
                .filter(u -> u.getRole() == Role.ADMIN)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found with ID: " + adminId));
        return AdminResponse.from(user);
    }

    @Override
    @Transactional
    public AdminResponse createAdmin(AdminCreateRequest request) {
        if (userRepository.findByEmailIgnoreCase(request.getEmail()).isPresent()) {
            throw new ConflictException("User already exists with email: " + request.getEmail());
        }
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.ADMIN);
        user.setActive(true);
        user.setPhone(request.getPhone());
        user.setDesignation(request.getDesignation());
        user.setDepartment(request.getDepartment());
        User saved = userRepository.save(user);
        return AdminResponse.from(saved);
    }

    @Override
    public BulkImportResponse<AdminResponse> bulkImportAdmins(MultipartFile file, String defaultPassword) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Uploaded CSV file is empty");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new BadRequestException("CSV file size exceeds the 5MB limit");
        }

        CsvParser.ParseResult parseResult;
        try {
            parseResult = CsvParser.parse(file.getInputStream());
        } catch (IOException e) {
            throw new BadRequestException("Failed to read CSV file: " + e.getMessage());
        }

        List<CsvParser.ParsedRow> rows = parseResult.getRows();
        if (rows.isEmpty()) {
            throw new BadRequestException("CSV file contains no admin data rows");
        }
        if (rows.size() > 1000) {
            throw new BadRequestException("CSV file exceeds maximum limit of 1000 rows");
        }

        boolean hasNameHeader = parseResult.getHeaders().stream()
                .map(CsvParser::normalizeHeaderKey)
                .anyMatch(h -> h.contains("name"));
        boolean hasEmailHeader = parseResult.getHeaders().stream()
                .map(CsvParser::normalizeHeaderKey)
                .anyMatch(h -> h.contains("email"));
        if (!hasNameHeader || !hasEmailHeader) {
            throw new BadRequestException("CSV file must contain 'Name' and 'Email' columns");
        }

        String resolvedDefaultPassword = (defaultPassword == null || defaultPassword.isBlank())
                ? "Admin@123"
                : defaultPassword.trim();
        if (!ImportValidators.isValidPasswordStrength(resolvedDefaultPassword)) {
            throw new BadRequestException("Default password must be 8-128 characters and contain at least one uppercase letter, one lowercase letter, one digit, and one special character (no spaces)");
        }

        Set<String> seenEmailsInCsv = new HashSet<>();
        List<AdminResponse> importedAdmins = new ArrayList<>();
        List<ImportRowError> errors = new ArrayList<>();

        for (CsvParser.ParsedRow row : rows) {
            int rowNum = row.getRowNumber();

            String name = row.get("name", "adminname", "fullname", "admin_name");
            if (name == null || name.trim().length() < 2 || name.trim().length() > 150) {
                errors.add(new ImportRowError(rowNum, name != null ? name : "", "Name is required (2 to 150 characters)"));
                continue;
            }
            name = name.trim();

            String rawEmail = row.get("email", "adminemail", "emailaddress", "admin_email");
            if (rawEmail == null || rawEmail.trim().isEmpty()) {
                errors.add(new ImportRowError(rowNum, name, "Email is required"));
                continue;
            }
            String email = rawEmail.trim().toLowerCase(Locale.ROOT);
            if (!ImportValidators.isValidEmail(email)) {
                errors.add(new ImportRowError(rowNum, name, "Invalid email address format"));
                continue;
            }
            if (!seenEmailsInCsv.add(email)) {
                errors.add(new ImportRowError(rowNum, name, "Duplicate email '" + email + "' found within this CSV sheet"));
                continue;
            }
            if (userRepository.existsByEmailIgnoreCase(email)) {
                errors.add(new ImportRowError(rowNum, name, "Email '" + email + "' is already registered in the system"));
                continue;
            }

            String phone = row.get("phone", "phonenumber", "mobile", "contact", "mobile_number");
            if (phone != null) {
                phone = phone.replaceAll("\\D", "").trim();
                if (phone.isEmpty()) {
                    phone = null;
                } else if (!ImportValidators.isValidPhone(phone)) {
                    errors.add(new ImportRowError(rowNum, name, "Phone number must be a valid 10-digit number starting with 6-9"));
                    continue;
                }
            }

            String password = row.get("password");
            if (password == null || password.trim().isEmpty()) {
                password = resolvedDefaultPassword;
            } else {
                password = password.trim();
                if (!ImportValidators.isValidPasswordStrength(password)) {
                    errors.add(new ImportRowError(rowNum, name, "Password must be 8-128 characters and contain at least one uppercase letter, one lowercase letter, one digit, and one special character (no spaces)"));
                    continue;
                }
            }

            final String fName = name;
            final String fEmail = email;
            final String fPhone = phone;
            final String fPassword = password;
            final String designation = row.get("designation", "designationtitle", "role");
            final String department = row.get("department", "dept", "departmentname");

            try {
                AdminResponse created = transactionTemplate.execute(status -> {
                    User user = new User();
                    user.setName(fName);
                    user.setEmail(fEmail);
                    user.setPasswordHash(passwordEncoder.encode(fPassword));
                    user.setRole(Role.ADMIN);
                    user.setActive(true);
                    user.setPhone(fPhone);
                    user.setDesignation(designation);
                    user.setDepartment(department);
                    return AdminResponse.from(userRepository.save(user));
                });
                if (created != null) {
                    importedAdmins.add(created);
                }
            } catch (Exception ex) {
                errors.add(new ImportRowError(rowNum, fName, "Failed to create admin: " + ex.getMessage()));
            }
        }

        return new BulkImportResponse<>(rows.size(), importedAdmins.size(), errors.size(), importedAdmins, errors);
    }

    @Override
    @Transactional
    public AdminResponse updateAdmin(Long adminId, AdminUpdateRequest request) {
        User user = userRepository.findById(adminId)
                .filter(u -> u.getRole() == Role.ADMIN)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found with ID: " + adminId));

        if (!user.getEmail().equalsIgnoreCase(request.getEmail()) &&
                userRepository.findByEmailIgnoreCase(request.getEmail()).isPresent()) {
            throw new ConflictException("User already exists with email: " + request.getEmail());
        }

        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setDesignation(request.getDesignation());
        user.setDepartment(request.getDepartment());

        User saved = userRepository.save(user);
        return AdminResponse.from(saved);
    }

    @Override
    @Transactional
    public AdminResponse toggleAdminStatus(Long adminId, JwtUserPrincipal principal) {
        if (principal.id().equals(adminId)) {
            throw new BadRequestException("You cannot deactivate your own account");
        }
        User user = userRepository.findById(adminId)
                .filter(u -> u.getRole() == Role.ADMIN)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found with ID: " + adminId));
        user.setActive(!user.isActive());
        User saved = userRepository.save(user);
        if (!saved.isActive()) {
            tokenRevocationService.revokeAllUserTokens(saved.getId());
        }
        return AdminResponse.from(saved);
    }

    /**
     * Permanently removes an admin account and everything it owns. Unlike
     * {@link #toggleAdminStatus}, this is irreversible, so every table with a
     * foreign key to this admin's User row has to be resolved first, in
     * dependency order, or the final delete throws a constraint violation.
     *
     * <p>Three different resolutions are used depending on what the row
     * actually represents (see the AskUserQuestion decision this followed):
     * <ul>
     *   <li><b>Block</b> - content whose deletion would take irreplaceable
     *       student-owned data with it (placement drives, quizzes/questions
     *       and their attempts, recorded sessions and watch history, meeting
     *       links and attendance-proxy records, interview evaluations). The
     *       admin must reassign/remove this first.</li>
     *   <li><b>Reassign</b> - shared platform content (announcement
     *       templates, aptitude tips, interview prep Q&amp;A/resources,
     *       preparation materials) and pure attribution/audit metadata on
     *       content this admin doesn't own (approvals, edit history,
     *       comments, application-status audit trail, interview assignment).
     *       Reassigned to the SUPERADMIN performing the deletion.</li>
     *   <li><b>Cascade delete</b> - content this admin exclusively owns with
     *       no student-owned dependents: their own announcements and that
     *       announcement's acknowledgment/view/comment/version rows, their
     *       notifications, their revoked-token history.</li>
     * </ul>
     */
    @Override
    @Transactional
    public void deleteAdmin(Long adminId, JwtUserPrincipal principal) {
        if (principal.id().equals(adminId)) {
            throw new BadRequestException("You cannot delete your own account");
        }
        User admin = userRepository.findById(adminId)
                .filter(u -> u.getRole() == Role.ADMIN)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found with ID: " + adminId));

        Long systemOwnerId = principal.id();

        // 1. Block outright if any content exists whose deletion would destroy
        // student-owned data (placements, quiz/question attempts, watch
        // history, attendance-proxy records, interview evaluations).
        List<String> blockers = new ArrayList<>();
        long driveCount = driveRepository.countByCreatedBy(adminId);
        if (driveCount > 0) {
            blockers.add(driveCount + " placement drive(s)");
        }
        long quizCount = quizRepository.countByCreatedBy(adminId);
        if (quizCount > 0) {
            blockers.add(quizCount + " quiz(zes)");
        }
        long questionCount = questionRepository.countByCreatedBy(adminId);
        if (questionCount > 0) {
            blockers.add(questionCount + " quiz bank question(s)");
        }
        long recordedSessionCount = recordedSessionRepository.countByCreatedBy(adminId);
        if (recordedSessionCount > 0) {
            blockers.add(recordedSessionCount + " recorded session(s)");
        }
        long meetingLinkCount = meetingLinkRepository.countByCreatedBy(adminId);
        if (meetingLinkCount > 0) {
            blockers.add(meetingLinkCount + " meeting link(s)");
        }
        long evaluationCount = interviewEvaluationRepository.countByEvaluator_Id(adminId);
        if (evaluationCount > 0) {
            blockers.add(evaluationCount + " interview evaluation(s)");
        }
        if (!blockers.isEmpty()) {
            throw new ConflictException("Cannot delete admin: they have created " + String.join(", ", blockers) +
                    ". Reassign or remove this content before deleting the account.");
        }

        // 2. Reassign shared platform content to the deleting SUPERADMIN.
        announcementTemplateRepository.reassignCreatedBy(adminId, systemOwnerId);
        aptitudeTipRepository.reassignCreatedBy(adminId, systemOwnerId);
        interviewQuestionRepository.reassignCreatedBy(adminId, systemOwnerId);
        interviewResourceRepository.reassignCreatedBy(adminId, systemOwnerId);
        preparationMaterialRepository.reassignPublishedBy(adminId, systemOwnerId);

        // 3. Resolve cross-references on content this admin doesn't own.
        announcementRepository.clearApprovedByUserId(adminId);
        announcementVersionRepository.reassignChangedBy(adminId, systemOwnerId);
        announcementCommentRepository.reassignUser(adminId, systemOwnerId);
        driveApplicationStatusHistoryRepository.reassignChangedBy(adminId, systemOwnerId);
        placementInterviewRepository.clearInterviewerByUserId(adminId);

        // 4. Delete this admin's own account data outright.
        notificationRepository.deleteAllByUser_Id(adminId);
        revokedTokenRepository.deleteByUserId(adminId);

        // 5. Cascade-delete this admin's own announcements and everything
        // scoped to them (ack/view/comment/version rows), breaking the
        // comment self-reference first so a reply is never left dangling.
        List<Announcement> ownAnnouncements = announcementRepository.findByCreatedBy_Id(adminId);
        for (Announcement announcement : ownAnnouncements) {
            Long announcementId = announcement.getId();
            announcementAcknowledgmentRepository.deleteAllByAnnouncementId(announcementId);
            announcementViewRepository.deleteAllByAnnouncementId(announcementId);
            announcementCommentRepository.clearParentCommentsByAnnouncementId(announcementId);
            announcementCommentRepository.deleteAllByAnnouncementId(announcementId);
            announcementVersionRepository.deleteAllByAnnouncementId(announcementId);
        }
        if (!ownAnnouncements.isEmpty()) {
            announcementRepository.deleteAll(ownAnnouncements);
        }

        // 6. Finally, the account itself.
        userRepository.delete(admin);
    }

    @Override
    @Transactional
    public void resetPassword(JwtUserPrincipal principal, Long targetUserId, String newPassword) {
        if (principal.id().equals(targetUserId)) {
            throw new BadRequestException("You cannot reset your own password via this endpoint. Use Profile to change your own password.");
        }
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + targetUserId));

        Role requesterRole = Role.valueOf(principal.role());
        Role targetRole = target.getRole();

        if (requesterRole == Role.ADMIN) {
            if (targetRole != Role.TRAINER && targetRole != Role.STUDENT) {
                throw new ForbiddenException("ADMIN can only reset passwords for TRAINER and STUDENT accounts.");
            }
        } else if (requesterRole == Role.SUPERADMIN) {
            if (targetRole != Role.ADMIN && targetRole != Role.TRAINER && targetRole != Role.STUDENT) {
                throw new ForbiddenException("SUPERADMIN can only reset passwords for ADMIN, TRAINER and STUDENT accounts.");
            }
            if (targetRole == Role.SUPERADMIN) {
                throw new ForbiddenException("Cannot reset another SUPERADMIN's password via this endpoint.");
            }
        } else {
            throw new ForbiddenException("You do not have permission to reset passwords.");
        }

        target.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(target);
        tokenRevocationService.revokeAllUserTokens(targetUserId);
    }
}
