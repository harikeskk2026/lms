package com.careerlabs.lms.api.migration;

import com.careerlabs.lms.api.LmsApiApplication;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.*;

public class DatabaseMigrationVerificationTest {

    private static final String PG_HOST = "localhost";
    private static final int PG_PORT = 5432;
    private static final String DB_USER = "postgres";
    private static final String DB_PASS = "prabhu@15";
    private static final String DEFAULT_URL = "jdbc:postgresql://" + PG_HOST + ":" + PG_PORT + "/postgres";
    private static final String LMS_URL = "jdbc:postgresql://" + PG_HOST + ":" + PG_PORT + "/lms";

    private void executeSqlOnPostgres(String sql) throws Exception {
        try (Connection conn = DriverManager.getConnection(DEFAULT_URL, DB_USER, DB_PASS);
             Statement stmt = conn.createStatement()) {
            stmt.execute(sql);
        }
    }

    private void recreateDatabase(String dbName) throws Exception {
        executeSqlOnPostgres("DROP DATABASE IF EXISTS " + dbName + ";");
        executeSqlOnPostgres("CREATE DATABASE " + dbName + ";");
    }

    @Test
    @DisplayName("1. Existing DB (lms): Migrate V11 to latest without checksum errors and verify V12")
    void testFlywayMigrationOnPostgres() throws Exception {
        System.out.println("=== Starting Flyway Migration on Existing DB (lms) ===");

        try (Connection testConn = DriverManager.getConnection(LMS_URL, DB_USER, DB_PASS)) {
            // Accessible
        } catch (Exception e) {
            org.junit.jupiter.api.Assumptions.abort("PostgreSQL database not available at " + LMS_URL + ": " + e.getMessage());
            return;
        }

        Flyway flyway = Flyway.configure()
                .dataSource(LMS_URL, DB_USER, DB_PASS)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .ignoreMigrationPatterns("*:ignored")
                .locations("classpath:db/migration")
                .load();

        MigrateResult result = flyway.migrate();
        System.out.println("Flyway migrate success: " + result.success);
        System.out.println("Migrations executed count: " + result.migrationsExecuted);
        System.out.println("Target schema version: " + result.targetSchemaVersion);
        assertTrue(result.success, "Flyway migration on existing DB must succeed");
        String currentVersion = result.targetSchemaVersion != null ?
                result.targetSchemaVersion :
                (flyway.info().current() != null && flyway.info().current().getVersion() != null ?
                        flyway.info().current().getVersion().getVersion() : null);
        assertEquals("12", currentVersion, "Target schema version must be 12");

        // Inspect database schema
        try (Connection conn = DriverManager.getConnection(LMS_URL, DB_USER, DB_PASS)) {
            verifyFinalSchema(conn);
        }
        System.out.println("=== Existing DB (lms) Migration to Latest PASSED ===");
    }

    @Test
    @DisplayName("Print all resolved Flyway migration checksums")
    void inspectMigrationChecksums() {
        Flyway flyway = Flyway.configure()
                .dataSource(DEFAULT_URL, DB_USER, DB_PASS)
                .locations("classpath:db/migration")
                .load();
        System.out.println("--- RESOLVED MIGRATION CHECKSUMS ---");
        for (org.flywaydb.core.api.MigrationInfo info : flyway.info().all()) {
            System.out.printf("MIGRATION_CHECKSUM: V%s = %s%n",
                    info.getVersion(), info.getChecksum());
        }
    }

    @Test
    @DisplayName("1b. Teammate Scenario: Existing DB with original V6 applied starts up and migrates cleanly without checksum errors")
    void testTeammateScenarioOriginalV6AppliedAndApplicationStartup() throws Exception {
        String testDbName = "lms_teammate_v6_test";
        String testDbUrl = "jdbc:postgresql://" + PG_HOST + ":" + PG_PORT + "/" + testDbName;

        recreateDatabase(testDbName);

        // 1. Simulate teammate database: applied up to V6
        Flyway flywayToV6 = Flyway.configure()
                .dataSource(testDbUrl, DB_USER, DB_PASS)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .ignoreMigrationPatterns("*:ignored")
                .target("6")
                .locations("classpath:db/migration")
                .load();
        MigrateResult initialResult = flywayToV6.migrate();
        assertTrue(initialResult.success, "Initial migration to V6 must succeed");
        assertEquals("6", initialResult.targetSchemaVersion);

        // 2. Verify V6 checksum in flyway_schema_history matches the original immutable checksum
        try (Connection conn = DriverManager.getConnection(testDbUrl, DB_USER, DB_PASS);
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT checksum FROM flyway_schema_history WHERE version = '6'");
             ResultSet rs = ps.executeQuery()) {
            assertTrue(rs.next(), "V6 must be recorded in flyway_schema_history");
            assertEquals(891134358, rs.getInt(1), "Applied V6 checksum must match immutable original checksum (891134358)");
        }

        // 3. Confirm Flyway validate reports NO checksum mismatch for V1..V6
        Flyway flywayValidator = Flyway.configure()
                .dataSource(testDbUrl, DB_USER, DB_PASS)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .ignoreMigrationPatterns("*:ignored", "*:pending")
                .locations("classpath:db/migration")
                .load();
        assertDoesNotThrow(() -> flywayValidator.validate(), "Flyway validation must report 0 checksum mismatches for V1..V6");

        // 4. Boot Spring Boot Application against this database (which runs Flyway auto-migration to latest)
        SpringApplicationBuilder builder = new SpringApplicationBuilder(LmsApiApplication.class);
        ConfigurableApplicationContext context = null;
        try {
            context = builder.run(
                    "--server.port=0",
                    "--spring.datasource.url=" + testDbUrl,
                    "--spring.datasource.username=" + DB_USER,
                    "--spring.datasource.password=" + DB_PASS,
                    "--spring.flyway.enabled=true",
                    "--spring.jpa.hibernate.ddl-auto=none",
                    "--app.seed.enabled=false"
            );
            assertNotNull(context, "Application context must not be null");
            assertTrue(context.isRunning(), "Spring Boot must boot successfully on teammate database starting at V6");
        } finally {
            if (context != null) {
                context.close();
            }
        }

        // 5. Verify database reached V12 cleanly without repair
        try (Connection conn = DriverManager.getConnection(testDbUrl, DB_USER, DB_PASS)) {
            verifyFinalSchema(conn);
        }

        try {
            executeSqlOnPostgres("DROP DATABASE IF EXISTS " + testDbName + ";");
        } catch (Exception ignored) {}

        System.out.println("=== Teammate Scenario: V6 Existing DB to Latest PASSED ===");
    }

    @Test
    @DisplayName("2. Fresh DB: Migrate V0 through latest on a completely blank database")
    void testFreshDatabaseMigrationFromScratch() throws Exception {
        String freshDbName = "lms_fresh_audit_test";
        String freshDbUrl = "jdbc:postgresql://" + PG_HOST + ":" + PG_PORT + "/" + freshDbName;

        try {
            recreateDatabase(freshDbName);
        } catch (Exception e) {
            org.junit.jupiter.api.Assumptions.abort("Cannot create database: " + e.getMessage());
            return;
        }

        System.out.println("=== Testing Fresh DB Migration (V0 -> latest) on " + freshDbName + " ===");

        Flyway flyway = Flyway.configure()
                .dataSource(freshDbUrl, DB_USER, DB_PASS)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .ignoreMigrationPatterns("*:ignored")
                .locations("classpath:db/migration")
                .load();

        MigrateResult result = flyway.migrate();
        System.out.println("Fresh DB migrate success: " + result.success);
        System.out.println("Migrations executed count: " + result.migrationsExecuted);
        System.out.println("Target schema version: " + result.targetSchemaVersion);

        assertTrue(result.success, "Fresh database migration must succeed");
        assertEquals("12", result.targetSchemaVersion, "Fresh database target schema version must be 12");
        assertEquals(13, result.migrationsExecuted, "Must execute all 13 migrations (V0 through V12)");

        try (Connection conn = DriverManager.getConnection(freshDbUrl, DB_USER, DB_PASS)) {
            verifyFinalSchema(conn);
        }

        // Clean up test DB
        try {
            executeSqlOnPostgres("DROP DATABASE IF EXISTS " + freshDbName + ";");
        } catch (Exception ignored) {}

        System.out.println("=== Fresh DB Migration (V0 -> latest) PASSED ===");
    }

    @Test
    @DisplayName("3. Historical Versions: Genuinely migrate every prior version (V1..V11) to latest")
    void testHistoricalVersionsIncrementalMigration() throws Exception {
        String testDbName = "lms_hist_test";
        String testDbUrl = "jdbc:postgresql://" + PG_HOST + ":" + PG_PORT + "/" + testDbName;

        for (int v = 1; v <= 11; v++) {
            System.out.printf("--- Testing Migration: V%d -> latest ---%n", v);
            recreateDatabase(testDbName);

            // Step 1: Migrate up to version v
            Flyway flywayToVersion = Flyway.configure()
                    .dataSource(testDbUrl, DB_USER, DB_PASS)
                    .baselineOnMigrate(true)
                    .baselineVersion("0")
                    .ignoreMigrationPatterns("*:ignored")
                    .target(String.valueOf(v))
                    .locations("classpath:db/migration")
                    .load();

            MigrateResult initialResult = flywayToVersion.migrate();
            assertTrue(initialResult.success, "Initial migration to V" + v + " must succeed");
            assertEquals(String.valueOf(v), initialResult.targetSchemaVersion, "Target version must be " + v);

            // Step 2: Migrate from version v to latest
            Flyway flywayToLatest = Flyway.configure()
                    .dataSource(testDbUrl, DB_USER, DB_PASS)
                    .baselineOnMigrate(true)
                    .baselineVersion("0")
                    .ignoreMigrationPatterns("*:ignored")
                    .target("latest")
                    .locations("classpath:db/migration")
                    .load();

            MigrateResult latestResult = flywayToLatest.migrate();
            assertTrue(latestResult.success, "Migration from V" + v + " to latest must succeed");
            assertEquals("12", latestResult.targetSchemaVersion, "Final schema version must be 12");

            try (Connection conn = DriverManager.getConnection(testDbUrl, DB_USER, DB_PASS)) {
                verifyFinalSchema(conn);
            }
            System.out.printf("--- V%d -> latest: PASS ---%n", v);
        }

        try {
            executeSqlOnPostgres("DROP DATABASE IF EXISTS " + testDbName + ";");
        } catch (Exception ignored) {}

        System.out.println("=== All Historical Versions (V1..V11 -> latest) PASSED ===");
    }

    @Test
    @DisplayName("4. Legacy Data & Integrity: Migrate legacy batch and non-standard durations safely")
    void testLegacyDataCompatibilityAndIntegrity() throws Exception {
        String testDbName = "lms_legacy_test";
        String testDbUrl = "jdbc:postgresql://" + PG_HOST + ":" + PG_PORT + "/" + testDbName;

        recreateDatabase(testDbName);

        // Migrate up to V4 (before batch migration V5 and course duration migration V6)
        Flyway flywayToV4 = Flyway.configure()
                .dataSource(testDbUrl, DB_USER, DB_PASS)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .ignoreMigrationPatterns("*:ignored")
                .target("4")
                .locations("classpath:db/migration")
                .load();
        flywayToV4.migrate();

        // Seed legacy data at state V4
        try (Connection conn = DriverManager.getConnection(testDbUrl, DB_USER, DB_PASS);
             Statement stmt = conn.createStatement()) {

            // 1. Seed courses with various legacy durations
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (101, 'Legacy Course Hours Short', 'Desc', '16 hours', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (102, 'Legacy Course Hours Long', 'Desc', '40 hours', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (103, 'Legacy Course Range', 'Desc', '6-8 weeks', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (104, 'Legacy Course Singular', 'Desc', '1 month', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (105, 'Legacy Course Upper', 'Desc', '12 WEEKS', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (106, 'Legacy Course Spaced', 'Desc', '  3 months  ', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (107, 'Legacy Course Unrecognized', 'Desc', 'Custom TBD', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");

            // 2. Seed batch and student with legacy students.batch_id
            stmt.execute("INSERT INTO batches (id, name, course_id, max_students, mode, is_active, start_date, end_date, created_at, updated_at) " +
                    "VALUES (201, 'Batch Alpha', 101, 30, 'ONLINE', true, CURRENT_DATE, CURRENT_DATE + 30, NOW(), NOW());");

            stmt.execute("INSERT INTO users (id, email, name, password_hash, role, is_active, token_version, created_at, updated_at) " +
                    "VALUES (301, 'student.legacy@test.com', 'Legacy Student', 'hash', 'STUDENT', true, 1, NOW(), NOW());");

            stmt.execute("INSERT INTO students (id, user_id, enrollment_no, placement_status, batch_id, created_at, updated_at) " +
                    "VALUES (401, 301, 'ENR-999', 'SEEKING', 201, NOW(), NOW());");
        }

        // Now migrate to latest!
        Flyway flywayToLatest = Flyway.configure()
                .dataSource(testDbUrl, DB_USER, DB_PASS)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .ignoreMigrationPatterns("*:ignored")
                .target("latest")
                .locations("classpath:db/migration")
                .load();

        MigrateResult result = flywayToLatest.migrate();
        assertTrue(result.success, "Migration with legacy data must succeed");

        // Verify data was correctly normalized and migrated
        try (Connection conn = DriverManager.getConnection(testDbUrl, DB_USER, DB_PASS)) {
            // Verify student batch was backfilled into enrollments
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT batch_id, course_id, is_active FROM enrollments WHERE student_id = 401");
                 ResultSet rs = ps.executeQuery()) {
                assertTrue(rs.next(), "Enrollment record must exist for legacy student");
                assertEquals(201L, rs.getLong("batch_id"), "Enrollment batch_id must match legacy student batch_id");
                assertEquals(101L, rs.getLong("course_id"), "Enrollment course_id must match batch course_id");
                assertTrue(rs.getBoolean("is_active"), "Enrollment must be active");
            }

            // Verify course duration normalizations via V6
            assertCourseDuration(conn, 101, "2 days"); // 16h <= 24h: ceil(16/8) = 2 days
            assertCourseDuration(conn, 102, "1 weeks"); // 40h > 24h: round(40/40) = 1 weeks
            assertCourseDuration(conn, 103, "8 weeks"); // range 6-8 weeks -> 8 weeks
            assertCourseDuration(conn, 104, "1 months"); // 1 month -> 1 months
            assertCourseDuration(conn, 105, null); // V6 flagged unhandled uppercase as NULL without error
            assertCourseDuration(conn, 106, null); // V6 flagged unhandled spaced as NULL without error
            assertCourseDuration(conn, 107, null); // V6 flagged unrecognized 'Custom TBD' as NULL without error

            // Verify no data loss: all courses, batches, users, and students preserved
            try (Statement st = conn.createStatement()) {
                try (ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM courses")) {
                    assertTrue(rs.next());
                    assertEquals(7, rs.getInt(1), "All 7 seeded courses must be preserved without data loss");
                }
                try (ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM batches")) {
                    assertTrue(rs.next());
                    assertEquals(1, rs.getInt(1), "Batch must be preserved");
                }
                try (ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM users")) {
                    assertTrue(rs.next());
                    assertEquals(1, rs.getInt(1), "User must be preserved");
                }
                try (ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM students")) {
                    assertTrue(rs.next());
                    assertEquals(1, rs.getInt(1), "Student must be preserved");
                }
                try (ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM enrollments")) {
                    assertTrue(rs.next());
                    assertEquals(1, rs.getInt(1), "Enrollment must be created from legacy batch_id");
                }
            }

            verifyFinalSchema(conn);
        }

        try {
            executeSqlOnPostgres("DROP DATABASE IF EXISTS " + testDbName + ";");
        } catch (Exception ignored) {}

        System.out.println("=== Legacy Data Compatibility & Integrity PASSED ===");
    }

    @Test
    @DisplayName("5. V12 Data Normalization: Verify V12 normalizes legacy, uppercase, whitespace, and range durations safely")
    void testV12DurationNormalizationOnExistingData() throws Exception {
        String testDbName = "lms_v12_norm_test";
        String testDbUrl = "jdbc:postgresql://" + PG_HOST + ":" + PG_PORT + "/" + testDbName;

        recreateDatabase(testDbName);

        // Migrate to V11
        Flyway flywayToV11 = Flyway.configure()
                .dataSource(testDbUrl, DB_USER, DB_PASS)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .ignoreMigrationPatterns("*:ignored")
                .target("11")
                .locations("classpath:db/migration")
                .load();
        flywayToV11.migrate();

        // Drop the old check constraint (if any) to simulate un-validated data in existing DB prior to V12
        try (Connection conn = DriverManager.getConnection(testDbUrl, DB_USER, DB_PASS);
             Statement stmt = conn.createStatement()) {
            stmt.execute("ALTER TABLE courses DROP CONSTRAINT IF EXISTS chk_courses_duration_standard;");

            // Seed dirty data at V11
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (501, 'V12 Course Hours Short', 'Desc', ' 16 hours ', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (502, 'V12 Course Hours Long', 'Desc', '40 hours', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (503, 'V12 Course Range', 'Desc', '6-8 weeks', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (504, 'V12 Course Singular', 'Desc', '1 month', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (505, 'V12 Course Upper', 'Desc', ' 12 WEEKS ', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (506, 'V12 Course Spaced Plural', 'Desc', '  3 months  ', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (507, 'V12 Course Empty', 'Desc', '   ', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (508, 'V12 Course Unrecognized', 'Desc', 'Non-standard Format', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (509, 'V12 Course Null', 'Desc', NULL, 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
        }

        // Migrate to V12
        Flyway flywayToV12 = Flyway.configure()
                .dataSource(testDbUrl, DB_USER, DB_PASS)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .ignoreMigrationPatterns("*:ignored")
                .target("12")
                .locations("classpath:db/migration")
                .load();
        MigrateResult result = flywayToV12.migrate();
        assertTrue(result.success, "Migration to V12 with existing dirty data must succeed");

        // Verify V12 normalization results
        try (Connection conn = DriverManager.getConnection(testDbUrl, DB_USER, DB_PASS)) {
            assertCourseDuration(conn, 501, "2 days"); // 16 hours -> 2 days
            assertCourseDuration(conn, 502, "1 weeks"); // 40 hours -> 1 weeks
            assertCourseDuration(conn, 503, "8 weeks"); // 6-8 weeks -> 8 weeks
            assertCourseDuration(conn, 504, "1 months"); // 1 month -> 1 months
            assertCourseDuration(conn, 505, "12 weeks"); // 12 WEEKS -> 12 weeks
            assertCourseDuration(conn, 506, "3 months"); // 3 months
            assertCourseDuration(conn, 507, null); // whitespace -> null
            assertCourseDuration(conn, 508, null); // unrecognized -> null
            assertCourseDuration(conn, 509, null); // null -> null (allowed by check constraint)

            // Verify the CHECK constraint prevents new invalid values
            try (Statement stmt = conn.createStatement()) {
                assertThrows(Exception.class, () -> {
                    stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                            "VALUES (599, 'Invalid', 'Desc', 'random invalid', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
                }, "Inserting invalid duration format after V12 must violate CHECK constraint");
            }
        }

        try {
            executeSqlOnPostgres("DROP DATABASE IF EXISTS " + testDbName + ";");
        } catch (Exception ignored) {}

        System.out.println("=== V12 Duration Normalization & CHECK Constraint Verification PASSED ===");
    }

    @Test
    @DisplayName("6. Application Startup: Verify Spring Boot context boots successfully with Flyway on PostgreSQL")
    void testApplicationStartupWithPostgresAndFlyway() {
        System.out.println("=== Testing Spring Boot Application Startup with Flyway against PostgreSQL ===");
        SpringApplicationBuilder builder = new SpringApplicationBuilder(LmsApiApplication.class);
        ConfigurableApplicationContext context = null;
        try {
            context = builder.run(
                    "--server.port=0",
                    "--spring.datasource.url=" + LMS_URL,
                    "--spring.datasource.username=" + DB_USER,
                    "--spring.datasource.password=" + DB_PASS,
                    "--spring.flyway.enabled=true",
                    "--spring.jpa.hibernate.ddl-auto=none",
                    "--app.seed.enabled=false"
            );
            assertNotNull(context, "Application context must not be null");
            assertTrue(context.isRunning(), "Spring Boot application context must be running");
            System.out.println("=== Application Startup with Flyway PASSED ===");
        } finally {
            if (context != null) {
                context.close();
            }
        }
    }

    private void assertCourseDuration(Connection conn, long courseId, String expectedDuration) throws Exception {
        try (PreparedStatement ps = conn.prepareStatement("SELECT duration FROM courses WHERE id = ?")) {
            ps.setLong(1, courseId);
            try (ResultSet rs = ps.executeQuery()) {
                assertTrue(rs.next(), "Course with id " + courseId + " must exist");
                assertEquals(expectedDuration, rs.getString("duration"),
                        "Course " + courseId + " duration should be normalized to: " + expectedDuration);
            }
        }
    }

    private void verifyFinalSchema(Connection conn) throws Exception {
        // 1. Column 'students.batch_id' must NOT exist
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'batch_id'");
             ResultSet rs = ps.executeQuery()) {
            assertTrue(rs.next());
            assertEquals(0, rs.getInt(1), "Column 'batch_id' must NOT exist in 'students'");
        }

        // 2. Column 'enrollments.batch_id' MUST exist
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'enrollments' AND column_name = 'batch_id'");
             ResultSet rs = ps.executeQuery()) {
            assertTrue(rs.next());
            assertEquals(1, rs.getInt(1), "Column 'batch_id' MUST exist in 'enrollments'");
        }

        // 3. Courses legacy columns (is_active, active, slug) must NOT exist
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'courses' AND column_name IN ('is_active', 'active', 'slug')");
             ResultSet rs = ps.executeQuery()) {
            assertTrue(rs.next());
            assertEquals(0, rs.getInt(1), "Columns is_active, active, slug must NOT exist in courses");
        }

        // 4. Mock interviews legacy student_id must NOT exist, mode and updated_at MUST exist
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'mock_interviews' AND column_name IN ('student_id', 'mode', 'updated_at')");
             ResultSet rs = ps.executeQuery()) {
            boolean hasMode = false, hasUpdatedAt = false, hasStudentId = false;
            while (rs.next()) {
                String col = rs.getString(1);
                if ("mode".equalsIgnoreCase(col)) hasMode = true;
                if ("updated_at".equalsIgnoreCase(col)) hasUpdatedAt = true;
                if ("student_id".equalsIgnoreCase(col)) hasStudentId = true;
            }
            assertFalse(hasStudentId, "student_id must NOT exist in mock_interviews");
            assertTrue(hasMode, "mode MUST exist in mock_interviews");
            assertTrue(hasUpdatedAt, "updated_at MUST exist in mock_interviews");
        }

        // 5. Assignment attachments table MUST exist
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'assignment_attachments'");
             ResultSet rs = ps.executeQuery()) {
            assertTrue(rs.next());
            assertEquals(1, rs.getInt(1), "Table assignment_attachments MUST exist");
        }

        // 6. Quiz source pdfs table MUST exist
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'quiz_source_pdfs'");
             ResultSet rs = ps.executeQuery()) {
            assertTrue(rs.next());
            assertEquals(1, rs.getInt(1), "Table quiz_source_pdfs MUST exist");
        }

        // 7. Course duration check constraint MUST exist and allow standard duration format
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT COUNT(*) FROM pg_constraint WHERE conname = 'chk_courses_duration_standard'");
             ResultSet rs = ps.executeQuery()) {
            assertTrue(rs.next());
            assertEquals(1, rs.getInt(1), "Constraint chk_courses_duration_standard MUST exist");
        }

        // 8. Questions question_type check constraint must allow SHORT_ANSWER
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'questions_question_type_check'");
             ResultSet rs = ps.executeQuery()) {
            assertTrue(rs.next());
            String def = rs.getString(1);
            assertTrue(def.contains("SHORT_ANSWER"), "questions_question_type_check MUST contain SHORT_ANSWER");
        }
    }
}
