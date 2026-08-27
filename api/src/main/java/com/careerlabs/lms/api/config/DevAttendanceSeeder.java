package com.careerlabs.lms.api.config;

import com.careerlabs.lms.api.attendance.entity.Attendance;
import com.careerlabs.lms.api.attendance.entity.AttendanceAlert;
import com.careerlabs.lms.api.attendance.entity.AttendanceCorrection;
import com.careerlabs.lms.api.attendance.entity.AttendanceGoal;
import com.careerlabs.lms.api.attendance.entity.AttendancePolicy;
import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.attendance.entity.ClassStatus;
import com.careerlabs.lms.api.attendance.entity.CorrectionStatus;
import com.careerlabs.lms.api.attendance.entity.DailyClass;
import com.careerlabs.lms.api.attendance.repository.AttendanceAlertRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceCorrectionRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceGoalRepository;
import com.careerlabs.lms.api.attendance.repository.AttendancePolicyRepository;
import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.attendance.repository.DailyClassRepository;
import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.entity.BatchMode;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.entity.Level;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.student.entity.PlacementStatus;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Component
@Order(5)
public class DevAttendanceSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DevAttendanceSeeder.class);

    @Value("${app.seed.enabled:true}")
    private boolean seedEnabled;

    private final CourseRepository courseRepository;
    private final BatchRepository batchRepository;
    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final DailyClassRepository dailyClassRepository;
    private final AttendanceRepository attendanceRepository;
    private final AttendanceGoalRepository attendanceGoalRepository;
    private final AttendanceCorrectionRepository attendanceCorrectionRepository;
    private final AttendanceAlertRepository attendanceAlertRepository;
    private final AttendancePolicyRepository attendancePolicyRepository;
    private final PasswordEncoder passwordEncoder;

    public DevAttendanceSeeder(
            CourseRepository courseRepository,
            BatchRepository batchRepository,
            UserRepository userRepository,
            StudentRepository studentRepository,
            DailyClassRepository dailyClassRepository,
            AttendanceRepository attendanceRepository,
            AttendanceGoalRepository attendanceGoalRepository,
            AttendanceCorrectionRepository attendanceCorrectionRepository,
            AttendanceAlertRepository attendanceAlertRepository,
            AttendancePolicyRepository attendancePolicyRepository,
            PasswordEncoder passwordEncoder) {
        this.courseRepository = courseRepository;
        this.batchRepository = batchRepository;
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.dailyClassRepository = dailyClassRepository;
        this.attendanceRepository = attendanceRepository;
        this.attendanceGoalRepository = attendanceGoalRepository;
        this.attendanceCorrectionRepository = attendanceCorrectionRepository;
        this.attendanceAlertRepository = attendanceAlertRepository;
        this.attendancePolicyRepository = attendancePolicyRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled) {
            log.info("Attendance seeding is disabled via app.seed.enabled=false.");
            return;
        }

        log.info("Seeding / updating test students, daily classes & attendance records across ALL batches...");

        // 1. Ensure at least one Course exists
        Course defaultCourse = courseRepository.findAll().stream().findFirst().orElseGet(() -> {
            Course c = new Course();
            c.setTitle("Full Stack Java Web Development");
            c.setSlug("full-stack-java-dev");
            c.setDescription("Complete end-to-end web development with Spring Boot and React.");
            c.setDuration("12 Weeks");
            c.setLevel(Level.INTERMEDIATE);
            c.setStatus(CourseStatus.PUBLISHED);
            c.setActive(true);
            return courseRepository.save(c);
        });

        // 2. Get all batches (or create one if none exist)
        List<Batch> batches = batchRepository.findAll();
        if (batches.isEmpty()) {
            Batch b = new Batch();
            b.setName("Java Fullstack - Batch 2026-A");
            b.setCourse(defaultCourse);
            b.setStartDate(LocalDate.now().minusDays(45));
            b.setEndDate(LocalDate.now().plusDays(45));
            b.setTiming("10:00 AM - 01:00 PM");
            b.setMode(BatchMode.HYBRID);
            b.setMaxStudents(30);
            b.setActive(true);
            batches = List.of(batchRepository.save(b));
        }

        // Base test users data
        String[][] baseUsers = {
                {"Student User", "student@careerlabs.com", "STU-DEV-001"},
                {"Rahul Sharma", "rahul@careerlabs.com", "STU-DEV-002"},
                {"Priya Patel", "priya@careerlabs.com", "STU-DEV-003"},
                {"Amit Kumar", "amit@careerlabs.com", "STU-DEV-004"}
        };

        String[] classTitles = {
                "Orientation & Setup",
                "Core Java & OOP Principles",
                "Data Modeling & SQL Schema",
                "Spring Boot REST API Basics",
                "Spring Data JPA & Repositories",
                "RESTful Microservices & Security",
                "JWT Authentication Flow",
                "Frontend Integration with Next.js",
                "React Hooks & State Management",
                "Database Indexing & Query Tuning",
                "Testing Spring Boot & JUnit",
                "Docker Containers & CI/CD",
                "Caching Strategies with Redis",
                "System Design Principles",
                "Project Review & Code Refactoring"
        };

        Student primaryStudent = null;

        // Iterate over ALL batches in the database
        for (Batch batch : batches) {
            Course course = batch.getCourse() != null ? batch.getCourse() : defaultCourse;
            List<Student> batchStudents = studentRepository.findByBatchId(batch.getId());

            if (batchStudents.isEmpty()) {
                log.info("Populating test students for batch '{}' (ID={})...", batch.getName(), batch.getId());
                for (int uIdx = 0; uIdx < baseUsers.length; uIdx++) {
                    String[] uData = baseUsers[uIdx];
                    String email = batch.getId() == 1 ? uData[1] : "b" + batch.getId() + "." + uData[1];
                    String name = uData[0] + (batch.getId() == 1 ? "" : " (B" + batch.getId() + ")");
                    String enrollNo = uData[2] + "-B" + batch.getId();

                    User user = userRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
                        User nu = new User();
                        nu.setName(name);
                        nu.setEmail(email);
                        nu.setPasswordHash(passwordEncoder.encode("ChangeMe123!"));
                        nu.setRole(Role.STUDENT);
                        return userRepository.save(nu);
                    });

                    Student student = studentRepository.findByUserId(user.getId()).orElseGet(() -> {
                        Student ns = new Student();
                        ns.setUser(user);
                        ns.setEnrollmentNo(enrollNo);
                        ns.setPlacementStatus(PlacementStatus.SEEKING);
                        return ns;
                    });
                    student.setBatch(batch);
                    student.setCourse(course);
                    Student savedStudent = studentRepository.save(student);
                    batchStudents.add(savedStudent);

                    if (email.equalsIgnoreCase("student@careerlabs.com")) {
                        primaryStudent = savedStudent;
                    }
                }
            } else {
                for (Student s : batchStudents) {
                    if (s.getUser().getEmail().equalsIgnoreCase("student@careerlabs.com")) {
                        primaryStudent = s;
                    }
                }
            }

            // Ensure daily classes exist for this batch
            List<DailyClass> batchClasses = dailyClassRepository.findByBatchIdOrderByDateDesc(batch.getId());
            if (batchClasses.isEmpty()) {
                log.info("Populating daily classes for batch '{}'...", batch.getName());
                LocalDateTime baseDate = LocalDateTime.now().minusDays(28);

                for (int i = 0; i < classTitles.length; i++) {
                    LocalDateTime classDate = baseDate.plusDays(i * 2L);

                    DailyClass dailyClass = new DailyClass();
                    dailyClass.setBatch(batch);
                    dailyClass.setDate(classDate);
                    dailyClass.setTitle(classTitles[i]);
                    dailyClass.setNotes("Lesson covering " + classTitles[i]);
                    dailyClass.setStatus(ClassStatus.COMPLETED);
                    dailyClass.setMeetLink("https://meet.google.com/abc-defg-hij");
                    dailyClass.setRecordingUrl("https://storage.careerlabs.com/recordings/session-" + (i + 1) + ".mp4");
                    batchClasses.add(dailyClassRepository.save(dailyClass));
                }

                // Add 1 Scheduled Today class
                DailyClass todayClass = new DailyClass();
                todayClass.setBatch(batch);
                todayClass.setDate(LocalDateTime.now());
                todayClass.setTitle("Advanced Microservices & Security Workshop");
                todayClass.setNotes("Live interactive class scheduled for today.");
                todayClass.setStatus(ClassStatus.SCHEDULED);
                todayClass.setMeetLink("https://meet.google.com/xyz-uvwx-rst");
                batchClasses.add(dailyClassRepository.save(todayClass));
            }

            // Ensure attendance records exist for this batch's students across completed classes
            for (DailyClass dClass : batchClasses) {
                if (dClass.getStatus() != ClassStatus.COMPLETED) continue;

                for (int sIdx = 0; sIdx < batchStudents.size(); sIdx++) {
                    Student student = batchStudents.get(sIdx);
                    if (attendanceRepository.findByStudentIdAndDailyClassId(student.getId(), dClass.getId()).isEmpty()) {
                        AttendStatus status;
                        if (sIdx == 0) {
                            int classIdx = batchClasses.indexOf(dClass);
                            status = (classIdx == 3 || classIdx == 9) ? AttendStatus.ABSENT : (classIdx == 6 ? AttendStatus.LATE : AttendStatus.PRESENT);
                        } else if (sIdx == 1) {
                            status = AttendStatus.PRESENT;
                        } else if (sIdx == 2) {
                            status = AttendStatus.LATE;
                        } else {
                            status = AttendStatus.ABSENT;
                        }

                        Attendance att = new Attendance();
                        att.setDailyClass(dClass);
                        att.setStudent(student);
                        att.setStatus(status);
                        att.setMarkedAt(Instant.now());
                        attendanceRepository.save(att);
                    }
                }
            }
        }

        // Primary Student Goal, Corrections & Alerts
        if (primaryStudent != null) {
            if (attendanceGoalRepository.findByStudentId(primaryStudent.getId()).isEmpty()) {
                AttendanceGoal goal = new AttendanceGoal();
                goal.setStudentId(primaryStudent.getId());
                goal.setTargetPercentage(85);
                attendanceGoalRepository.save(goal);
            }

            List<Attendance> primaryAtts = attendanceRepository.findByStudentId(primaryStudent.getId());
            if (!primaryAtts.isEmpty() && attendanceCorrectionRepository.findByStudentIdOrderByCreatedAtDesc(primaryStudent.getId()).isEmpty()) {
                Attendance absentRecord = primaryAtts.stream().filter(a -> a.getStatus() == AttendStatus.ABSENT).findFirst().orElse(primaryAtts.get(0));
                AttendanceCorrection correction1 = new AttendanceCorrection();
                correction1.setAttendance(absentRecord);
                correction1.setStudent(primaryStudent);
                correction1.setRequestedStatus(AttendStatus.EXCUSED);
                correction1.setReason("Medical Emergency");
                correction1.setComment("Medical prescription attached.");
                correction1.setDocumentUrl("https://storage.careerlabs.com/documents/medical-cert-01.pdf");
                correction1.setStatus(CorrectionStatus.PENDING);
                attendanceCorrectionRepository.save(correction1);

                Attendance lateRecord = primaryAtts.stream().filter(a -> a.getStatus() == AttendStatus.LATE).findFirst().orElse(primaryAtts.get(0));
                AttendanceCorrection correction2 = new AttendanceCorrection();
                correction2.setAttendance(lateRecord);
                correction2.setStudent(primaryStudent);
                correction2.setRequestedStatus(AttendStatus.PRESENT);
                correction2.setReason("Network Issue");
                correction2.setComment("Power outage.");
                correction2.setStatus(CorrectionStatus.APPROVED);
                correction2.setReviewedBy(1L);
                correction2.setReviewedAt(Instant.now().minus(1, ChronoUnit.DAYS));
                attendanceCorrectionRepository.save(correction2);
            }
        }

        // Seed Attendance Policy if missing
        if (attendancePolicyRepository.findByBatchIdIsNullAndCourseIdIsNull().isEmpty()) {
            AttendancePolicy policy = new AttendancePolicy();
            policy.setHealthyThreshold(75);
            policy.setAtRiskThreshold(65);
            attendancePolicyRepository.save(policy);
        }

        log.info("Batch & attendance data update complete across all {} batches!", batches.size());
    }
}
