package com.careerlabs.lms.api.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;

/**
 * Seeds the Super Admin, Admin, Trainer, and Student login accounts on startup when app.seed.enabled
 * is true. Credentials are fixed (not read from configuration) and idempotent. Drops legacy check
 * constraints if the database schema was generated before new roles were added.
 */
@Component
@Order(0)
public class AdminAccountSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminAccountSeeder.class);

    @Value("${app.seed.enabled:false}")
    private boolean seedEnabled;

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    public AdminAccountSeeder(UserRepository userRepository, StudentRepository studentRepository,
                               PasswordEncoder passwordEncoder, JdbcTemplate jdbcTemplate) {
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!seedEnabled) {
            return;
        }

        try {
            jdbcTemplate.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
            jdbcTemplate.execute("ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_status_check");
            jdbcTemplate.execute("ALTER TABLE assignment_submissions DROP CONSTRAINT IF EXISTS assignment_submissions_status_check");
            jdbcTemplate.execute("ALTER TABLE assignment_submissions ALTER COLUMN notes TYPE text");
            jdbcTemplate.execute("ALTER TABLE assignment_submissions ALTER COLUMN rejection_reason TYPE text");
            jdbcTemplate.execute("ALTER TABLE announcements ALTER COLUMN expires_at TYPE TIMESTAMP WITH TIME ZONE USING expires_at::timestamp with time zone");
        } catch (Exception e) {
            log.warn("Could not execute table constraint/column adjustments: {}", e.getMessage());
        }

        seedAccount("Super Admin", "superadmin@careerlabs.com", "Superadmin@123", Role.SUPERADMIN);
        seedAccount("Admin", "admin@careerlabs.com", "Admin@123", Role.ADMIN);
        seedAccount("Demo Trainer", "trainer@careerlabs.com", "ChangeMe123!", Role.TRAINER);
        seedStudentAccount("Student", "student@careerlabs.com", "Student@123");
    }

    private User seedAccount(String name, String email, String rawPassword, Role role) {
        User user = userRepository.findByEmailIgnoreCase(email).orElseGet(User::new);
        user.setName(name);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setRole(role);
        user.setActive(true);
        User saved = userRepository.save(user);

        log.info("Seeded {} account: {}", name, email);
        return saved;
    }

    private void seedStudentAccount(String name, String email, String rawPassword) {
        User user = seedAccount(name, email, rawPassword, Role.STUDENT);

        if (studentRepository.findByUserId(user.getId()).isEmpty()) {
            Student student = new Student();
            student.setUser(user);
            student.setEnrollmentNo("STU-DEMO-001");
            studentRepository.save(student);
        }
    }
}
