package com.careerlabs.lms.api.config;

import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Seeds a single login-ready user from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
 * when the table is empty. Controlled by APP_SEED_ENABLED so it can be
 * switched off outside local development.
 */
@Component
public class DevUserSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DevUserSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final boolean seedEnabled;
    private final String seedEmail;
    private final String seedPassword;

    public DevUserSeeder(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          @Value("${app.seed.enabled}") boolean seedEnabled,
                          @Value("${app.seed.admin-email}") String seedEmail,
                          @Value("${app.seed.admin-password}") String seedPassword) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.seedEnabled = seedEnabled;
        this.seedEmail = seedEmail;
        this.seedPassword = seedPassword;
    }

    @Override
    public void run(String... args) {
        if (!seedEnabled || userRepository.count() > 0) {
            return;
        }

        User user = new User();
        user.setName("Admin User");
        user.setEmail(seedEmail);
        user.setPasswordHash(passwordEncoder.encode(seedPassword));
        user.setRole(Role.ADMIN);
        userRepository.save(user);

        log.info("Seeded initial user '{}' for local development", seedEmail);
    }
}
