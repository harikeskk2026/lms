package com.careerlabs.lms.api.announcement.service;

import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;
import com.careerlabs.lms.api.student.entity.Student;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/** Resolves {{placeholder}} tokens in announcement title/body text. Pure string substitution, no AI involved. */
@Component
public class AnnouncementPlaceholderResolver {

    private static final Pattern TOKEN = Pattern.compile("\\{\\{\\s*([a-zA-Z0-9_]+)\\s*\\}\\}");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd MMM yyyy");

    private final AttendanceRepository attendanceRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final BatchRepository batchRepository;

    @Autowired
    public AnnouncementPlaceholderResolver(AttendanceRepository attendanceRepository,
                                           EnrollmentRepository enrollmentRepository,
                                           CourseRepository courseRepository,
                                           BatchRepository batchRepository) {
        this.attendanceRepository = attendanceRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.courseRepository = courseRepository;
        this.batchRepository = batchRepository;
    }

    public AnnouncementPlaceholderResolver(AttendanceRepository attendanceRepository,
                                           EnrollmentRepository enrollmentRepository) {
        this(attendanceRepository, enrollmentRepository, null, null);
    }

    public AnnouncementPlaceholderResolver(AttendanceRepository attendanceRepository) {
        this(attendanceRepository, null, null, null);
    }

    /** Generic substitution using an explicit variable map (used for admin template application). */
    public String resolve(String text, Map<String, String> variables) {
        if (text == null || variables == null || variables.isEmpty()) {
            return text;
        }
        Matcher matcher = TOKEN.matcher(text);
        StringBuilder out = new StringBuilder();
        while (matcher.find()) {
            String key = matcher.group(1);
            String value = variables.get(key);
            matcher.appendReplacement(out, Matcher.quoteReplacement(value != null ? value : matcher.group(0)));
        }
        matcher.appendTail(out);
        return out.toString();
    }

    /** Builds the auto-fillable variables for a specific student, used to personalize their announcement feed. */
    public Map<String, String> variablesFor(Student student) {
        Map<String, String> vars = new HashMap<>();
        List<com.careerlabs.lms.api.batch.entity.Batch> activeBatches = (enrollmentRepository != null && student.getId() != null)
                ? enrollmentRepository.findActiveBatchesByStudentId(student.getId())
                : List.of();
        String batchNames = activeBatches.stream().map(com.careerlabs.lms.api.batch.entity.Batch::getName).collect(Collectors.joining(", "));
        vars.put("batchName", batchNames);

        Set<String> courses = new LinkedHashSet<>();
        if (enrollmentRepository != null && student.getId() != null) {
            List<String> enrolled = enrollmentRepository.findActiveCourseTitlesByStudentId(student.getId());
            if (enrolled == null || enrolled.isEmpty()) {
                enrolled = enrollmentRepository.findAllCourseTitlesByStudentId(student.getId());
            }
            if (enrolled != null) {
                for (String t : enrolled) {
                    if (t != null && !t.isBlank()) {
                        courses.add(t.trim());
                    }
                }
            }
        }
        if (student.getCourse() != null && student.getCourse().getTitle() != null && !student.getCourse().getTitle().isBlank()) {
            courses.add(student.getCourse().getTitle().trim());
        }
        vars.put("courseName", String.join(", ", courses));
        vars.put("date", LocalDate.now().format(DATE_FORMAT));

        long total = attendanceRepository.countByStudentId(student.getId());
        if (total > 0) {
            long present = attendanceRepository.countByStudentIdAndStatus(student.getId(), AttendStatus.PRESENT);
            vars.put("attendancePercentage", String.valueOf(Math.round(present * 100.0 / total)));
        } else {
            vars.put("attendancePercentage", "N/A");
        }
        return vars;
    }

    /** Fixed mock values so an admin can preview how placeholders resolve without a real student. */
    public Map<String, String> sampleVariables() {
        return sampleVariables(null, null);
    }

    /** Context-aware preview for announcement creation when admin selects target course or batch. */
    public Map<String, String> sampleVariables(Long courseId, Long batchId) {
        Map<String, String> vars = new HashMap<>();
        vars.put("studentName", "Jane Student");

        String sampleBatch = "Demo Batch";
        if (batchId != null && batchRepository != null) {
            sampleBatch = batchRepository.findById(batchId)
                    .map(Batch::getName)
                    .filter(n -> n != null && !n.isBlank())
                    .orElse(sampleBatch);
        }
        vars.put("batchName", sampleBatch);

        String sampleCourse = resolveSampleCourses(courseId);
        if (sampleCourse == null || sampleCourse.isBlank()) {
            sampleCourse = "Java, Python";
        }
        vars.put("courseName", sampleCourse);
        vars.put("attendancePercentage", "82");
        vars.put("date", LocalDate.now().format(DATE_FORMAT));
        return vars;
    }

    private String resolveSampleCourses(Long courseId) {
        if (courseId != null && courseRepository != null) {
            String target = courseRepository.findById(courseId)
                    .map(Course::getTitle)
                    .filter(t -> t != null && !t.isBlank())
                    .map(String::trim)
                    .orElse(null);
            if (target != null) {
                return target;
            }
        }

        // When "All Courses" (courseId == null) or unspecified, provide all active course names
        if (courseRepository != null) {
            List<String> titles = courseRepository.findAll().stream()
                    .map(Course::getTitle)
                    .filter(t -> t != null && !t.isBlank())
                    .map(String::trim)
                    .distinct()
                    .toList();
            if (!titles.isEmpty()) {
                return String.join(", ", titles);
            }
        }

        return "Sample Course";
    }
}
