package com.careerlabs.lms.api.config;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.ErrorCode;
import org.flywaydb.core.api.MigrationInfo;
import org.flywaydb.core.api.exception.FlywayValidateException;
import org.flywaydb.core.api.output.ValidateOutput;
import org.flywaydb.core.api.output.ValidateResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

/**
 * Flyway configuration to support existing developer databases while preserving
 * strict validation and migration immutability.
 *
 * Background:
 * Historical V6 migration (V6__standardize_course_duration.sql) was committed in 937fc4e
 * (resolved checksum 891134358). Some teammate developer databases applied a local variant
 * (checksum 860137096 / 42575461) prior to V12 being introduced in 1d2a6fa.
 *
 * This migration strategy performs strict Flyway validation on all applied migrations.
 * If and only if the sole validation discrepancy is a recognized legacy teammate V6 checksum,
 * it safely proceeds with migration to the latest version without modifying flyway_schema_history
 * or calling repair. Any other validation discrepancy (tampered V1-V5, V7-V12, missing migrations,
 * unknown checksums) immediately fails startup.
 */
@Configuration
public class FlywayConfig {

    private static final Logger log = LoggerFactory.getLogger(FlywayConfig.class);

    // Supported legacy/teammate database checksums for migration V6:
    // 891134358: Canonical committed repository checksum
    // 860137096: Teammate database applied checksum
    // 42575461: Alternate local resolved checksum
    public static final Set<Integer> SUPPORTED_V6_CHECKSUMS = Set.of(
            891134358,
            860137096,
            42575461
    );

    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return flyway -> {
            // Validate all applied migrations, ignoring pending migrations which are scheduled to run
            Flyway validatorFlyway = Flyway.configure()
                    .configuration(flyway.getConfiguration())
                    .ignoreMigrationPatterns("*:pending", "*:ignored")
                    .load();

            ValidateResult validateResult = validatorFlyway.validateWithResult();

            if (validateResult.validationSuccessful) {
                log.info("Flyway validation successful. Executing migrations...");
                flyway.migrate();
                return;
            }

            // Inspect validation failures
            Integer appliedV6Checksum = null;
            for (MigrationInfo info : flyway.info().applied()) {
                if (info.getVersion() != null && "6".equals(info.getVersion().getVersion())) {
                    appliedV6Checksum = info.getChecksum();
                    break;
                }
            }

            boolean onlyRecognizedV6Variance = !validateResult.invalidMigrations.isEmpty();
            for (ValidateOutput invalid : validateResult.invalidMigrations) {
                if ("6".equals(invalid.version) &&
                        invalid.errorDetails != null &&
                        invalid.errorDetails.errorCode == ErrorCode.CHECKSUM_MISMATCH &&
                        appliedV6Checksum != null &&
                        SUPPORTED_V6_CHECKSUMS.contains(appliedV6Checksum)) {
                    // This is a known, supported legacy teammate V6 checksum
                    continue;
                }
                onlyRecognizedV6Variance = false;
                break;
            }

            if (!onlyRecognizedV6Variance) {
                log.error("Flyway validation failed with unexpected migration issues: {}",
                        validateResult.getAllErrorMessages());
                throw new FlywayValidateException(validateResult.errorDetails, validateResult.getAllErrorMessages());
            }

            log.warn("Detected teammate database with supported legacy V6 applied checksum {} (resolved: 891134358). " +
                    "Proceeding with migration to latest schema without altering migration history or calling repair.",
                    appliedV6Checksum);

            // Execute migration using the existing Flyway configuration with validateOnMigrate disabled
            // for this specific run, since all migrations were strictly validated above.
            Flyway tolerantFlyway = Flyway.configure()
                    .configuration(flyway.getConfiguration())
                    .validateOnMigrate(false)
                    .load();

            tolerantFlyway.migrate();
        };
    }
}
