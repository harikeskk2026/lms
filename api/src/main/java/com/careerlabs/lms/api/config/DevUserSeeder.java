package com.careerlabs.lms.api.config;

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

import java.util.Optional;

/**
 * Seeds a single login-ready user from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
 * when the table is empty. Controlled by APP_SEED_ENABLED so it can be
 * switched off outside local development.
 */
@Component
@Order(1)
public class DevUserSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DevUserSeeder.class);

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;
    private final boolean seedEnabled;
    private final String seedEmail;
    private final String seedPassword;

    public DevUserSeeder(UserRepository userRepository,
                          StudentRepository studentRepository,
                          PasswordEncoder passwordEncoder,
                          @Value("${app.seed.enabled}") boolean seedEnabled,
                          @Value("${app.seed.admin-email}") String seedEmail,
                          @Value("${app.seed.admin-password}") String seedPassword) {
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.passwordEncoder = passwordEncoder;
        this.seedEnabled = seedEnabled;
        this.seedEmail = seedEmail;
        this.seedPassword = seedPassword;
    }

    @Override
    public void run(String... args) {
        if (!seedEnabled) {
            return;
        }

        if (userRepository.findByEmailIgnoreCase(seedEmail).isEmpty()) {
            User admin = new User();
            admin.setName("Admin User");
            admin.setEmail(seedEmail);
            admin.setPasswordHash(passwordEncoder.encode(seedPassword));
            admin.setRole(Role.ADMIN);
            userRepository.save(admin);
            log.info("Seeded initial admin user '{}' for local development", seedEmail);
        }

        String studentEmail = "student@careerlabs.com";
        Optional<User> existingStudentUser = userRepository.findByEmailIgnoreCase(studentEmail);
        User studentUser;
        if (existingStudentUser.isEmpty()) {
            User student = new User();
            student.setName("Student User");
            student.setEmail(studentEmail);
            student.setPasswordHash(passwordEncoder.encode("ChangeMe123!"));
            student.setRole(Role.STUDENT);
            studentUser = userRepository.save(student);
            log.info("Seeded initial student user '{}' for local development", studentEmail);
        } else {
            studentUser = existingStudentUser.get();
        }

        if (studentRepository.findByUserId(studentUser.getId()).isEmpty()) {
            Student studentEntity = new Student();
            studentEntity.setUser(studentUser);
            studentEntity.setEnrollmentNo("STU-DEV-001");
            studentRepository.save(studentEntity);
            log.info("Seeded initial student profile entity for user '{}'", studentEmail);
        }
    }
}
