package com.careerlabs.lms.api.course.service.impl;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.dto.response.BulkImportResponse;
import com.careerlabs.lms.api.common.dto.response.ImportRowError;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.util.CsvParser;
import com.careerlabs.lms.api.course.dto.request.CourseRequest;
import com.careerlabs.lms.api.course.dto.response.CourseResponse;
import com.careerlabs.lms.api.course.dto.response.CourseStatusCountsResponse;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.entity.Level;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.course.service.CourseService;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.material.repository.MaterialRepository;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.syllabus.entity.SyllabusModule;
import com.careerlabs.lms.api.syllabus.repository.SyllabusModuleRepository;
import com.careerlabs.lms.api.syllabus.service.SyllabusService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final CourseCodeGenerator courseCodeGenerator;
    private final CourseAccessGuard accessGuard;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final SyllabusModuleRepository moduleRepository;
    private final SyllabusService syllabusService;
    private final MaterialRepository materialRepository;
    private final BatchRepository batchRepository;
    private final TransactionTemplate transactionTemplate;

    public CourseServiceImpl(CourseRepository courseRepository, CourseCodeGenerator courseCodeGenerator,
                              CourseAccessGuard accessGuard, StudentRepository studentRepository,
                              EnrollmentRepository enrollmentRepository, SyllabusModuleRepository moduleRepository,
                              SyllabusService syllabusService, MaterialRepository materialRepository,
                              BatchRepository batchRepository, PlatformTransactionManager transactionManager) {
        this.courseRepository = courseRepository;
        this.courseCodeGenerator = courseCodeGenerator;
        this.accessGuard = accessGuard;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.moduleRepository = moduleRepository;
        this.syllabusService = syllabusService;
        this.materialRepository = materialRepository;
        this.batchRepository = batchRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseResponse> list(JwtUserPrincipal principal) {
        return list(principal, null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseResponse> list(JwtUserPrincipal principal, String search) {
        return list(principal, search, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CourseResponse> list(JwtUserPrincipal principal, String search, CourseStatus status) {
        List<CourseResponse> responses;
        if (accessGuard.isAdmin(principal)) {
            if (status != null) {
                responses = courseRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                        .map(CourseResponse::from)
                        .toList();
            } else {
                responses = courseRepository.findAllByOrderByCreatedAtDesc().stream()
                        .map(CourseResponse::from)
                        .toList();
            }
        } else if (accessGuard.isTrainer(principal)) {
            responses = courseRepository.findCoursesByTrainerId(principal.id()).stream()
                    .filter(c -> status == null || c.getStatus() == status)
                    .map(c -> CourseResponse.from(c, true))
                    .toList();
        } else if (accessGuard.isStudent(principal)) {
            Set<Long> enrolledIds = enrolledCourseIds(principal);
            responses = courseRepository.findByStatusOrderByCreatedAtDesc(CourseStatus.PUBLISHED).stream()
                    .filter(c -> status == null || c.getStatus() == status)
                    .map(c -> CourseResponse.from(c, enrolledIds.contains(c.getId())))
                    .toList();
        } else {
            responses = List.of();
        }

        String normalized = search == null ? null : search.trim();
        if (normalized == null || normalized.isEmpty()) {
            return responses;
        }
        String needle = normalized.toLowerCase(Locale.ROOT);
        return responses.stream()
                .filter(c -> containsIgnoreCase(c.title(), needle)
                        || containsIgnoreCase(c.courseCode(), needle))
                .toList();
    }

    @Override
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERADMIN')")
    public CourseStatusCountsResponse statusCounts() {
        long published = courseRepository.countByStatus(CourseStatus.PUBLISHED);
        long draft = courseRepository.countByStatus(CourseStatus.DRAFT);
        long archived = courseRepository.countByStatus(CourseStatus.ARCHIVED);
        return CourseStatusCountsResponse.of(published, draft, archived);
    }

    private boolean containsIgnoreCase(String value, String lowerCaseNeedle) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(lowerCaseNeedle);
    }

    @Override
    @Transactional(readOnly = true)
    public CourseResponse get(Long id, JwtUserPrincipal principal) {
        Course course = findOrThrow(id);
        accessGuard.requireVisible(principal, course);
        return CourseResponse.from(course, accessGuard.isEnrolled(principal, id));
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public CourseResponse create(CourseRequest request) {
        if (request.getStatus() == CourseStatus.ARCHIVED) {
            throw new BadRequestException("Courses cannot be created directly as ARCHIVED. Archive is available after the course is created.");
        }
        if (request.getStatus() == CourseStatus.PUBLISHED) {
            throw new BadRequestException("Courses must be created as DRAFT before publishing.");
        }
        if (courseRepository.existsByTitleIgnoreCase(request.getTitle().trim())) {
            throw new BadRequestException("A course with this title already exists: " + request.getTitle().trim());
        }
        Course course = new Course();
        applyRequest(course, request, true);
        if (course.getStatus() == null) {
            course.setStatus(CourseStatus.DRAFT);
        }
        if (course.getCourseCode() == null || course.getCourseCode().isBlank()) {
            course.setCourseCode(courseCodeGenerator.generateUnique(request.getTitle()));
        } else {
            if (courseRepository.existsByCourseCode(course.getCourseCode().trim())) {
                throw new BadRequestException("Course code is already in use: " + course.getCourseCode().trim());
            }
        }
        return CourseResponse.from(courseRepository.save(course));
    }

    private static final Pattern DURATION_PATTERN =
            Pattern.compile("^[1-9]\\d*\\s+(days?|weeks?|months?|years?)$", Pattern.CASE_INSENSITIVE);

    @Override
    public BulkImportResponse<CourseResponse> bulkImportCourses(MultipartFile file) {
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
            throw new BadRequestException("CSV file contains no course data rows");
        }
        if (rows.size() > 1000) {
            throw new BadRequestException("CSV file exceeds maximum limit of 1000 rows");
        }

        boolean hasTitleHeader = parseResult.getHeaders().stream()
                .map(CsvParser::normalizeHeaderKey)
                .anyMatch(h -> h.contains("title"));
        if (!hasTitleHeader) {
            throw new BadRequestException("CSV file must contain a 'Title' column");
        }

        List<CourseResponse> importedCourses = new ArrayList<>();
        List<ImportRowError> errors = new ArrayList<>();

        for (CsvParser.ParsedRow row : rows) {
            int rowNum = row.getRowNumber();

            String title = row.get("title", "coursetitle", "course_title", "name");
            if (title == null || title.trim().length() < 3 || title.trim().length() > 150) {
                errors.add(new ImportRowError(rowNum, title != null ? title : "", "Title is required (3 to 150 characters)"));
                continue;
            }
            title = title.trim();

            String courseCode = row.get("coursecode", "course_code", "code");
            if (courseCode != null && courseCode.isBlank()) {
                courseCode = null;
            }

            String description = row.get("description", "desc", "about", "coursedescription");
            if (description == null || description.trim().isEmpty()) {
                errors.add(new ImportRowError(rowNum, title, "Description is required"));
                continue;
            }
            description = description.trim();
            if (description.length() > 5000) {
                errors.add(new ImportRowError(rowNum, title, "Description must not exceed 5000 characters"));
                continue;
            }

            String duration = row.get("duration", "courseduration", "durationweeks", "durationmonths");
            if (duration == null || duration.trim().isEmpty()) {
                errors.add(new ImportRowError(rowNum, title, "Duration is required (e.g. \"6 months\", \"12 weeks\")"));
                continue;
            }
            duration = duration.trim();
            if (!DURATION_PATTERN.matcher(duration).matches()) {
                errors.add(new ImportRowError(rowNum, title, "Invalid duration '" + duration + "'. Use a number followed by days/weeks/months/years, e.g. \"6 months\""));
                continue;
            }
            duration = normalizeDuration(duration);

            String rawLevel = row.get("level", "difficulty", "courselevel");
            if (rawLevel == null || rawLevel.isBlank()) {
                errors.add(new ImportRowError(rowNum, title, "Level is required. Allowed: BEGINNER, INTERMEDIATE, ADVANCED"));
                continue;
            }
            Level level;
            try {
                level = Level.valueOf(rawLevel.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                errors.add(new ImportRowError(rowNum, title, "Invalid level '" + rawLevel + "'. Allowed: BEGINNER, INTERMEDIATE, ADVANCED"));
                continue;
            }

            String rawStatus = row.get("status", "coursestatus");
            if (rawStatus != null && !rawStatus.isBlank()
                    && !"DRAFT".equalsIgnoreCase(rawStatus.trim())) {
                errors.add(new ImportRowError(rowNum, title, "Invalid status '" + rawStatus + "'. Courses must be imported as DRAFT and published afterwards"));
                continue;
            }

            final String fTitle = title;
            final String fCode = courseCode;
            final String fDescription = description;
            final String fDuration = duration;
            final Level fLevel = level;

            try {
                CourseResponse created = transactionTemplate.execute(status -> {
                    CourseRequest request = new CourseRequest();
                    request.setTitle(fTitle);
                    request.setCourseCode(fCode);
                    request.setDescription(fDescription);
                    request.setDuration(fDuration);
                    request.setLevel(fLevel);
                    request.setStatus(CourseStatus.DRAFT);
                    return create(request);
                });
                if (created != null) {
                    importedCourses.add(created);
                }
            } catch (Exception ex) {
                errors.add(new ImportRowError(rowNum, fTitle, "Failed to create course: " + ex.getMessage()));
            }
        }

        return new BulkImportResponse<>(rows.size(), importedCourses.size(), errors.size(), importedCourses, errors);
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public CourseResponse update(Long id, CourseRequest request) {
        Course course = findOrThrow(id);
        if (request.getStatus() != null && request.getStatus() != course.getStatus()) {
            validateTransition(course.getStatus(), request.getStatus());
        }
        if (!course.getTitle().equalsIgnoreCase(request.getTitle().trim())
                && courseRepository.existsByTitleIgnoreCaseAndIdNot(request.getTitle().trim(), id)) {
            throw new BadRequestException("A course with this title already exists: " + request.getTitle().trim());
        }
        applyRequest(course, request, false);
        if (request.getCourseCode() != null && !request.getCourseCode().isBlank()) {
            String code = request.getCourseCode().trim();
            if (!code.equals(course.getCourseCode()) && courseRepository.existsByCourseCode(code)) {
                throw new BadRequestException("Course code is already in use: " + code);
            }
        }
        return CourseResponse.from(courseRepository.save(course));
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public CourseResponse updateStatus(Long id, CourseStatus status) {
        Course course = findOrThrow(id);
        if (status == course.getStatus()) {
            return CourseResponse.from(course);
        }
        if (status == CourseStatus.ARCHIVED) {
            long activeStudents = enrollmentRepository.countByCourseIdAndActiveTrue(id);
            if (activeStudents > 0) {
                throw new ConflictException(String.format(
                        "Cannot archive course: %d active student(s) are still enrolled in '%s'. Reassign or remove them before archiving.",
                        activeStudents, course.getTitle()));
            }
        }
        validateTransition(course.getStatus(), status);
        course.setStatus(status);
        return CourseResponse.from(courseRepository.save(course));
    }

    private void validateTransition(CourseStatus current, CourseStatus requested) {
        if (current == requested) {
            return;
        }
        boolean allowed = (current == CourseStatus.DRAFT && requested == CourseStatus.PUBLISHED)
                || (current == CourseStatus.PUBLISHED && requested == CourseStatus.ARCHIVED)
                || (current == CourseStatus.ARCHIVED && requested == CourseStatus.PUBLISHED);
        if (!allowed) {
            throw new BadRequestException(
                    String.format("Invalid status transition from %s to %s. Allowed transitions are DRAFT -> PUBLISHED, PUBLISHED -> ARCHIVED, and ARCHIVED -> PUBLISHED. A course cannot be moved back to DRAFT once published or archived.", current, requested));
        }
    }

    @Override
    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public void delete(Long id) {
        Course course = findOrThrow(id);

        List<Batch> referencingBatches = batchRepository.findByCourseId(id);
        if (!referencingBatches.isEmpty()) {
            LocalDate today = LocalDate.now();
            List<Batch> activeBatches = referencingBatches.stream()
                    .filter(b -> b.isActive() && (b.getEndDate() == null || !b.getEndDate().isBefore(today)))
                    .toList();
            List<Batch> historicalBatches = referencingBatches.stream()
                    .filter(b -> !b.isActive() || (b.getEndDate() != null && b.getEndDate().isBefore(today)))
                    .toList();

            StringBuilder msg = new StringBuilder("Cannot delete course: ");
            if (!activeBatches.isEmpty() && !historicalBatches.isEmpty()) {
                msg.append(String.format("%d active/ongoing batch(es) (%s) and %d historical/inactive batch(es) (%s) still reference it. ",
                        activeBatches.size(), formatBatchNames(activeBatches),
                        historicalBatches.size(), formatBatchNames(historicalBatches)));
                msg.append("Please reassign, conclude, or delete referencing batches before deleting this course.");
            } else if (!activeBatches.isEmpty()) {
                msg.append(String.format("%d active/ongoing batch(es) (%s) still reference it. ",
                        activeBatches.size(), formatBatchNames(activeBatches)));
                msg.append("Please reassign or conclude active batches before deleting this course.");
            } else {
                msg.append(String.format("%d historical/inactive batch(es) (%s) still reference it. ",
                        historicalBatches.size(), formatBatchNames(historicalBatches)));
                msg.append("Please remove historical/archived batch records before deleting this course.");
            }
            throw new ConflictException(msg.toString());
        }

        for (SyllabusModule module : moduleRepository.findAllByCourseIdOrderByOrderIndexAsc(id)) {
            syllabusService.deleteModule(module.getId());
        }
        materialRepository.deleteAllByCourseId(id);
        enrollmentRepository.deleteAllByCourseId(id);

        courseRepository.delete(course);
    }

    private String formatBatchNames(List<Batch> batches) {
        if (batches.size() <= 3) {
            return batches.stream().map(b -> "'" + b.getName() + "'").collect(Collectors.joining(", "));
        }
        String top3 = batches.stream().limit(3).map(b -> "'" + b.getName() + "'").collect(Collectors.joining(", "));
        return top3 + " and " + (batches.size() - 3) + " more";
    }

    private Course findOrThrow(Long id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + id));
    }

    private void applyRequest(Course course, CourseRequest request, boolean isCreate) {
        course.setTitle(request.getTitle());
        course.setDescription(request.getDescription());
        course.setDuration(normalizeDuration(request.getDuration()));
        course.setLevel(request.getLevel());
        course.setThumbnail(request.getThumbnail());
        course.setStatus(request.getStatus());
        course.setCourseCode(request.getCourseCode() != null && !request.getCourseCode().isBlank() ? request.getCourseCode().trim() : null);
    }

    private static final Pattern DURATION_NORMALIZER = Pattern.compile(
            "^\\s*(\\d+)\\s+(day|days|week|weeks|month|months|year|years)\\s*$",
            Pattern.CASE_INSENSITIVE);

    private String normalizeDuration(String raw) {
        if (raw == null || raw.isBlank()) return raw;
        Matcher m = DURATION_NORMALIZER.matcher(raw.trim());
        if (!m.matches()) return raw;
        String value = m.group(1);
        String unit = m.group(2).toLowerCase();
        if (unit.endsWith("y") && !unit.endsWith("ys")) {
            unit = unit + "s";
        } else if (!unit.endsWith("s")) {
            unit = unit + "s";
        }
        return value + " " + unit;
    }

    private Set<Long> enrolledCourseIds(JwtUserPrincipal principal) {
        if (principal == null) {
            return Set.of();
        }
        return studentRepository.findByUserId(principal.id())
                .map(student -> {
                    Set<Long> ids = new HashSet<>();
                    if (student.getId() != null) {
                        enrollmentRepository.findAllByStudentIdAndActiveTrueOrderByEnrolledAtDesc(student.getId())
                                .stream()
                                .map(com.careerlabs.lms.api.enrollment.entity.Enrollment::getCourse)
                                .filter(java.util.Objects::nonNull)
                                .forEach(c -> ids.add(c.getId()));
                    }
                    return ids;
                })
                .orElseGet(Set::of);
    }
}
