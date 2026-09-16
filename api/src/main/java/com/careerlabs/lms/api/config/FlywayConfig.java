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
 * V6 itself is preserved exactly as originally applied to every developer database.
 * Production databases could carry courses.duration NOT NULL (set by a former Hibernate
 * ddl-auto=update mapping), which made V6's NULL-flagging fail in a restart loop. The new
 * V5.1 migration (ensure_course_duration_nullable_before_v6) drops NOT NULL before V6 runs,
 * and V15 re-asserts the final nullable schema, so fresh and existing databases converge.
 * Databases that already applied V6 with any of the checksums below are allowed to migrate
 * forward.
 *
 * V15 was originally drafted and applied to the shared developer database as "V14"
 * (ensure_course_duration_nullable) before the real V14 (add_announcement_attachments) was
 * merged upstream and claimed that version number; it was renumbered to V15 to resolve the
 * collision. The shared developer database's recorded row for that draft (an earlier,
 * comment-free copy whose SQL is identical in effect, checksum -78777009) is whitelisted
 * below against version "15", exactly like the V6/V13 variants. V16 idempotently fills in
 * the numeric constraints a partial V13 variant never applied, so only the checksum
 * metadata varies.
 *
 * This migration strategy performs strict Flyway validation on all applied migrations.
 * If and only if every validation discrepancy is a recognized legacy teammate V6, V13,
 * or early-draft V15 checksum, it safely proceeds with migration to the latest version
 * without modifying flyway_schema_history or calling repair. Any other validation
 * discrepancy (tampered V1-V5, V7-V12, missing migrations, unknown checksums) immediately
 * fails startup.
 */
@Configuration
public class FlywayConfig {

    private static final Logger log = LoggerFactory.getLogger(FlywayConfig.class);

    // Applied V6 checksums in flyway_schema_history for previously migrated databases:
    // 891134358: Original canonical repository checksum (937fc4e)
    // 860137096: Teammate database applied checksum
    // 42575461: Alternate local resolved checksum
    // 686650991: Teammate database applied checksum (careerlabs_lms, reported 2026-09-16)
    // The on-disk V6 is unchanged. V5.1 and V15 ensure courses.duration is nullable so
    // every database (fresh or existing) converges to the same final schema.
    public static final Set<Integer> SUPPORTED_V6_CHECKSUMS = Set.of(
            891134358,
            860137096,
            42575461,
            686650991
    );

    // Applied V13 checksum in flyway_schema_history for databases migrated with the
    // partial V13 variant (missing syllabus_modules / syllabus_topics / quiz_questions
    // numeric checks): -322843820. The committed V13 is the exact intended migration;
    // V16 fills in the missing constraints for such databases. This whitelist lets the
    // application start on those databases without repair or history modification.
    public static final Set<Integer> SUPPORTED_V13_CHECKSUMS = Set.of(-322843820);

    // Applied V15 checksum in flyway_schema_history for the shared developer database,
    // which applied an early comment-free draft of this migration under the version
    // number "14" (identical SQL effect: DROP NOT NULL + recreate
    // chk_courses_duration_standard) before the real V14 (add_announcement_attachments)
    // was merged upstream and claimed that version number, forcing this migration to be
    // renumbered to V15. A database still carrying that draft under version "14" must have
    // its flyway_schema_history row renumbered to "15" (see DatabaseMigrationVerificationTest
    // for the reproduction); this whitelist only tolerates the checksum drift once the row
    // is at version "15" — it deliberately does NOT tolerate a mismatch at version "14",
    // since that would silently skip the real add_announcement_attachments migration.
    // The final file below is the canonical content applied by every new/fresh database.
    public static final Set<Integer> SUPPORTED_V15_CHECKSUMS = Set.of(-78777009);

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
            Integer appliedV13Checksum = null;
            Integer appliedV15Checksum = null;
            for (MigrationInfo info : flyway.info().applied()) {
                if (info.getVersion() != null) {
                    String version = info.getVersion().getVersion();
                    if ("6".equals(version)) {
                        appliedV6Checksum = info.getChecksum();
                    } else if ("13".equals(version)) {
                        appliedV13Checksum = info.getChecksum();
                    } else if ("15".equals(version)) {
                        appliedV15Checksum = info.getChecksum();
                    }
                }
            }

            boolean onlyRecognizedVariance = !validateResult.invalidMigrations.isEmpty();
            for (ValidateOutput invalid : validateResult.invalidMigrations) {
                if (invalid.errorDetails != null &&
                        invalid.errorDetails.errorCode == ErrorCode.CHECKSUM_MISMATCH &&
                        "6".equals(invalid.version) &&
                        appliedV6Checksum != null &&
                        SUPPORTED_V6_CHECKSUMS.contains(appliedV6Checksum)) {
                    // Known, supported legacy teammate V6 checksum
                    continue;
                }
                if (invalid.errorDetails != null &&
                        invalid.errorDetails.errorCode == ErrorCode.CHECKSUM_MISMATCH &&
                        "13".equals(invalid.version) &&
                        appliedV13Checksum != null &&
                        SUPPORTED_V13_CHECKSUMS.contains(appliedV13Checksum)) {
                    // Known, supported legacy teammate V13 checksum (partial V13 variant)
                    continue;
                }
                if (invalid.errorDetails != null &&
                        invalid.errorDetails.errorCode == ErrorCode.CHECKSUM_MISMATCH &&
                        "15".equals(invalid.version) &&
                        appliedV15Checksum != null &&
                        SUPPORTED_V15_CHECKSUMS.contains(appliedV15Checksum)) {
                    // Known, supported early-draft V15 checksum (identical SQL effect)
                    continue;
                }
                onlyRecognizedVariance = false;
                break;
            }

            if (!onlyRecognizedVariance) {
                log.error("Flyway validation failed with unexpected migration issues: {}",
                        validateResult.getAllErrorMessages());
                throw new FlywayValidateException(validateResult.errorDetails, validateResult.getAllErrorMessages());
            }

            log.warn("Detected teammate database with supported legacy checksum(s): V6 {} (resolved: 891134358), " +
                        "V13 {} (committed file resolves to 2139458441), V15 {} (final file resolves to the " +
                        "canonical checksum applied by fresh databases). Proceeding with migration to latest " +
                        "schema without altering migration history or calling repair.",
                appliedV6Checksum, appliedV13Checksum, appliedV15Checksum);

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
