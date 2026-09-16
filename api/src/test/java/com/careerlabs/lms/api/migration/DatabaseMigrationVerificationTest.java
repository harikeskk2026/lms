package com.careerlabs.lms.api.migration;

import com.careerlabs.lms.api.LmsApiApplication;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import java.io.File;
import java.net.URL;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;

public class DatabaseMigrationVerificationTest {

    private static final String PG_HOST = "localhost";
    private static final int PG_PORT = 5432;
    private static final String DB_USER = "postgres";
    private static final String DB_PASS = "prabhu@15";
    private static final String DEFAULT_URL = "jdbc:postgresql://" + PG_HOST + ":" + PG_PORT + "/postgres";
    private static final String LMS_URL = "jdbc:postgresql://" + PG_HOST + ":" + PG_PORT + "/lms";

    // Computed from the actual migration files on the classpath so these tests never
    // go stale when a new migration (VN) is added - see DatabaseMigrationVerificationTest
    // failures on 2026-09-16 where hardcoded "16"/"17" expectations broke twice in one
    // session as V17 and V18 were added.
    private static final String LATEST_VERSION;
    private static final int MIGRATION_COUNT;

    static {
        Pattern versionPattern = Pattern.compile("^V(\\d+(?:_\\d+)*)__.*\\.sql$");
        try {
            URL migrationDirUrl = DatabaseMigrationVerificationTest.class.getClassLoader().getResource("db/migration");
            File migrationDir = new File(migrationDirUrl.toURI());
            File[] files = migrationDir.listFiles((dir, name) -> versionPattern.matcher(name).matches());
            MIGRATION_COUNT = files.length;
            int[] latestParts = null;
            String latest = null;
            for (File f : files) {
                Matcher m = versionPattern.matcher(f.getName());
                m.matches();
                String[] segments = m.group(1).split("_");
                int[] parts = new int[segments.length];
                for (int i = 0; i < segments.length; i++) parts[i] = Integer.parseInt(segments[i]);
                if (latestParts == null || compareVersionParts(parts, latestParts) > 0) {
                    latestParts = parts;
                    latest = String.join(".", segments);
                }
            }
            LATEST_VERSION = latest;
        } catch (Exception e) {
            throw new RuntimeException("Failed to resolve latest migration version from classpath", e);
        }
    }

    private static int compareVersionParts(int[] a, int[] b) {
        int len = Math.max(a.length, b.length);
        for (int i = 0; i < len; i++) {
            int av = i < a.length ? a[i] : 0;
            int bv = i < b.length ? b[i] : 0;
            if (av != bv) return Integer.compare(av, bv);
        }
        return 0;
    }

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
    @DisplayName("1. Existing DB upgrade: Migrate an existing V11 database to latest (V16) without checksum errors")
    void testFlywayMigrationOnPostgres() throws Exception {
        System.out.println("=== Starting Flyway Migration on an Existing DB (V11 -> latest V16) ===");

        String testDbName = "lms_existing_upgrade_test";
        String testDbUrl = "jdbc:postgresql://" + PG_HOST + ":" + PG_PORT + "/" + testDbName;

        try {
            recreateDatabase(testDbName);
        } catch (Exception e) {
            org.junit.jupiter.api.Assumptions.abort("Cannot create database: " + e.getMessage());
            return;
        }

        // 1. Migrate to V11 - the state of an "existing" database before V12/V13/V15/V16 exist
        Flyway flywayToV11 = Flyway.configure()
                .dataSource(testDbUrl, DB_USER, DB_PASS)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .ignoreMigrationPatterns("*:ignored")
                .target("11")
                .locations("classpath:db/migration")
                .load();
        MigrateResult v11Result = flywayToV11.migrate();
        assertTrue(v11Result.success, "Migration to V11 must succeed");
        assertEquals("11", v11Result.targetSchemaVersion, "Existing database must be at version 11");

        // 2. Seed rows representing existing data (valid and legacy/unrecognized durations).
        //    Drop the CHECK constraint so V12 is the one that re-normalizes and re-creates it.
        try (Connection conn = DriverManager.getConnection(testDbUrl, DB_USER, DB_PASS);
             Statement stmt = conn.createStatement()) {
            stmt.execute("ALTER TABLE courses DROP CONSTRAINT IF EXISTS chk_courses_duration_standard;");
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (901, 'Existing Valid', 'Desc', '6 months', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (902, 'Existing Unrecognized', 'Desc', 'Contact coordinator', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
        }

        // 3. Migrate the existing database to latest with STRICT checksum validation (default).
        //    The V5.1 pre-fix and new V15/V16 must not break already-applied V1-V11 migration records.
        Flyway flyway = Flyway.configure()
                .dataSource(testDbUrl, DB_USER, DB_PASS)
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
        assertEquals(LATEST_VERSION, currentVersion, "Target schema version must be " + LATEST_VERSION);

        // 4. Existing rows were preserved; unrecognized durations flagged as NULL; valid durations kept
        try (Connection conn = DriverManager.getConnection(testDbUrl, DB_USER, DB_PASS)) {
            assertCourseDuration(conn, 901, "6 months");   // existing valid duration preserved
            assertCourseDuration(conn, 902, null);          // unrecognized duration -> NULL (manual review)
            verifyFinalSchema(conn);
        }

        try {
            executeSqlOnPostgres("DROP DATABASE IF EXISTS " + testDbName + ";");
        } catch (Exception ignored) {}

        System.out.println("=== Existing DB (V11 -> latest V16) Migration PASSED ===");
    }

    @Test
    @DisplayName("Print all resolved Flyway migration checksums and candidate files")
    void inspectMigrationChecksums() throws Exception {
        Flyway flyway = Flyway.configure()
                .dataSource(DEFAULT_URL, DB_USER, DB_PASS)
                .locations("classpath:db/migration")
                .load();
        System.out.println("--- RESOLVED MIGRATION CHECKSUMS ---");
        for (org.flywaydb.core.api.MigrationInfo info : flyway.info().all()) {
            System.out.printf("MIGRATION_CHECKSUM: V%s = %s%n",
                    info.getVersion(), info.getChecksum());
        }

        // Test scratch/v12_from_1d2a6fa.sql as V6
        java.io.File scratchV12 = new java.io.File("d:/LMS/lms-aug-24/scratch/v12_from_1d2a6fa.sql");
        if (scratchV12.exists()) {
            org.flywaydb.core.internal.resource.filesystem.FileSystemResource res =
                    new org.flywaydb.core.internal.resource.filesystem.FileSystemResource(null, scratchV12.getAbsolutePath(), java.nio.charset.StandardCharsets.UTF_8, false);
            int cs = org.flywaydb.core.internal.resolver.ChecksumCalculator.calculate(res);
            System.out.printf("CANDIDATE_CHECKSUM: scratch/v12_from_1d2a6fa.sql = %d%n", cs);
        }
    }


    @Test
    @DisplayName("1c. Teammate Scenario: Existing DB with V6 checksum 860137096 starts up and migrates cleanly")
    void testTeammateScenarioChecksum860137096Startup() throws Exception {
        String testDbName = "lms_teammate_860137096_test";
        String testDbUrl = "jdbc:postgresql://" + PG_HOST + ":" + PG_PORT + "/" + testDbName;

        recreateDatabase(testDbName);

        // 1. Simulate teammate database: migrate up to V6
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

        // 2. Set the applied checksum in flyway_schema_history to 860137096 (exact teammate state)
        try (Connection conn = DriverManager.getConnection(testDbUrl, DB_USER, DB_PASS);
             Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("UPDATE flyway_schema_history SET checksum = 860137096 WHERE version = '6'");
        }

        // 3. Boot Spring Boot Application against this database (runs Flyway auto-migration to latest)
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
            assertTrue(context.isRunning(), "Spring Boot must boot successfully on teammate database with V6 checksum 860137096");
        } finally {
            if (context != null) {
                context.close();
            }
        }

        // 4. Verify database reached V12 cleanly without repair
        try (Connection conn = DriverManager.getConnection(testDbUrl, DB_USER, DB_PASS)) {
            verifyFinalSchema(conn);
        }

        try {
            executeSqlOnPostgres("DROP DATABASE IF EXISTS " + testDbName + ";");
        } catch (Exception ignored) {}

        System.out.println("=== Teammate Scenario: Checksum 860137096 to Latest PASSED ===");
    }

    @Test
    @DisplayName("1d. Teammate Scenario: Partial V13 variant DB (checksum -322843820) starts up and converges via V16")
    void testTeammatePartialV13VariantStartup() throws Exception {
        String testDbName = "lms_teammate_v13variant_test";
        String testDbUrl = "jdbc:postgresql://" + PG_HOST + ":" + PG_PORT + "/" + testDbName;

        recreateDatabase(testDbName);

        // 1. Simulate teammate database: migrate cleanly up to V12
        Flyway flywayToV12 = Flyway.configure()
                .dataSource(testDbUrl, DB_USER, DB_PASS)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .ignoreMigrationPatterns("*:ignored")
                .target("12")
                .locations("classpath:db/migration")
                .load();
        MigrateResult v12Result = flywayToV12.migrate();
        assertTrue(v12Result.success, "Initial migration to V12 must succeed");

        // 2. Recreate the exact state recorded for such databases:
        //    the committed V13 DDL was applied EXCEPT the syllabus_modules / syllabus_topics /
        //    quiz_questions constraints (partial variant), and flyway_schema_history records
        //    V13 with the legacy applied checksum -322843820.
        try (Connection conn = DriverManager.getConnection(testDbUrl, DB_USER, DB_PASS);
             Statement stmt = conn.createStatement()) {

            try (var in = getClass().getResourceAsStream("/db/migration/V13__numeric_field_check_constraints.sql")) {
                assertNotNull(in, "V13 migration script must be readable from the classpath");
                String v13Sql = new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                stmt.execute(v13Sql);
            }

            // Drop the 5 constraints the partial variant never added
            stmt.execute("ALTER TABLE syllabus_modules DROP CONSTRAINT IF EXISTS chk_syllabus_modules_duration;");
            stmt.execute("ALTER TABLE syllabus_modules DROP CONSTRAINT IF EXISTS chk_syllabus_modules_order;");
            stmt.execute("ALTER TABLE syllabus_topics DROP CONSTRAINT IF EXISTS chk_syllabus_topics_duration;");
            stmt.execute("ALTER TABLE syllabus_topics DROP CONSTRAINT IF EXISTS chk_syllabus_topics_order;");
            stmt.execute("ALTER TABLE quiz_questions DROP CONSTRAINT IF EXISTS chk_quiz_questions_order;");

            // Record V13 as applied with the legacy teammate checksum (partial variant)
            stmt.executeUpdate("INSERT INTO flyway_schema_history " +
                    "(installed_rank, version, description, type, script, checksum, installed_by, installed_on, execution_time, success) " +
                    "VALUES (15, '13', 'numeric field check constraints', 'SQL', " +
                    "'V13__numeric_field_check_constraints.sql', -322843820, 'postgres', NOW(), 0, TRUE)");
        }

        // Confirm the simulation is faithful: the 5 constraints are truly absent
        try (Connection conn = DriverManager.getConnection(testDbUrl, DB_USER, DB_PASS)) {
            for (String con : new String[]{"chk_syllabus_modules_duration", "chk_syllabus_modules_order",
                    "chk_syllabus_topics_duration", "chk_syllabus_topics_order", "chk_quiz_questions_order"}) {
                try (PreparedStatement ps = conn.prepareStatement(
                        "SELECT COUNT(*) FROM pg_constraint WHERE conname = ?")) {
                    ps.setString(1, con);
                    try (ResultSet rs = ps.executeQuery()) {
                        rs.next();
                        assertEquals(0, rs.getInt(1), con + " must be absent in the simulated partial V13 variant");
                    }
                }
            }
        }

        // 3. Boot Spring Boot Application against this database. Pre-fix this failed with
        //    'checksum mismatch for migration version 13'. With the fix, FlywayConfig
        //    recognizes the legacy V13 checksum and V16 fills in the missing constraints.
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
            assertTrue(context.isRunning(), "Spring Boot must boot on the partial V13 variant database");
        } finally {
            if (context != null) {
                context.close();
            }
        }

        // 4. Verify database reached V16 and all V13 numeric constraints now exist (V16 filled the gap)
        try (Connection conn = DriverManager.getConnection(testDbUrl, DB_USER, DB_PASS)) {
            verifyFinalSchema(conn);

            try (Statement st = conn.createStatement();
                 ResultSet rs = st.executeQuery(
                         "SELECT version, success FROM flyway_schema_history WHERE version IN ('14','15','16') ORDER BY version")) {
                boolean has14 = false, has15 = false, has16 = false;
                while (rs.next()) {
                    if ("14".equals(rs.getString(1))) has14 = rs.getBoolean(2);
                    if ("15".equals(rs.getString(1))) has15 = rs.getBoolean(2);
                    if ("16".equals(rs.getString(1))) has16 = rs.getBoolean(2);
                }
                assertTrue(has14, "V14 (add_announcement_attachments) must be applied successfully");
                assertTrue(has15, "V15 (ensure_course_duration_nullable) must be applied successfully");
                assertTrue(has16, "V16 (complete_partial_v13_constraints) must be applied successfully");
            }
        }

        try {
            executeSqlOnPostgres("DROP DATABASE IF EXISTS " + testDbName + ";");
        } catch (Exception ignored) {}

        System.out.println("=== Teammate Scenario: Partial V13 variant (checksum -322843820) to Latest PASSED ===");
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
        assertEquals(LATEST_VERSION, result.targetSchemaVersion, "Fresh database target schema version must be " + LATEST_VERSION);
        assertEquals(MIGRATION_COUNT, result.migrationsExecuted, "Must execute all " + MIGRATION_COUNT + " migrations (V0 through V" + LATEST_VERSION + " incl. V5.1)");

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
    @DisplayName("3. Historical Versions: Migrate every prior version (V1..V15) to latest (V16)")
    void testHistoricalVersionsIncrementalMigration() throws Exception {
        String testDbName = "lms_hist_test";
        String testDbUrl = "jdbc:postgresql://" + PG_HOST + ":" + PG_PORT + "/" + testDbName;

        for (int v = 1; v <= 15; v++) {
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
            assertEquals(LATEST_VERSION, latestResult.targetSchemaVersion, "Final schema version must be " + LATEST_VERSION);

            try (Connection conn = DriverManager.getConnection(testDbUrl, DB_USER, DB_PASS)) {
                verifyFinalSchema(conn);
            }
            System.out.printf("--- V%d -> latest: PASS ---%n", v);
        }

        try {
            executeSqlOnPostgres("DROP DATABASE IF EXISTS " + testDbName + ";");
        } catch (Exception ignored) {}

        System.out.println("=== All Historical Versions (V1..V16 -> latest) PASSED ===");
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
    @DisplayName("6a. Production NOT NULL scenario: courses.duration NOT NULL + legacy/unrecognized durations migrate cleanly")
    void testProductionNotNullDurationMigration() throws Exception {
        System.out.println("=== Testing Production Scenario: courses.duration NOT NULL + legacy data -> latest ===");

        String testDbName = "lms_notnull_duration_test";
        String testDbUrl = "jdbc:postgresql://" + PG_HOST + ":" + PG_PORT + "/" + testDbName;

        recreateDatabase(testDbName);

        // 1. Migrate to V5 (before the V6 duration standardization)
        Flyway flywayToV5 = Flyway.configure()
                .dataSource(testDbUrl, DB_USER, DB_PASS)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .ignoreMigrationPatterns("*:ignored")
                .target("5")
                .locations("classpath:db/migration")
                .load();
        MigrateResult v5Result = flywayToV5.migrate();
        assertTrue(v5Result.success, "Migration to V5 must succeed");

        // 2. Seed courses with non-NULL durations (valid, legacy, and unrecognized values)
        try (Connection conn = DriverManager.getConnection(testDbUrl, DB_USER, DB_PASS);
             Statement stmt = conn.createStatement()) {
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (701, 'Valid Duration', 'Desc', '3 months', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (702, 'Legacy Range', 'Desc', '6-8 weeks', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (703, 'Legacy Hours', 'Desc', '16 hours', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (704, 'Unrecognized 1', 'Desc', 'Custom TBD', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (705, 'Unrecognized 2', 'Desc', '12 WEEKS', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");

            // 3. Simulate the production state: duration is NOT NULL (previously set by Hibernate
            //    ddl-auto=update mapping Course.duration with @Column(nullable = false)).
            //    All seeded rows are non-NULL, so adding the constraint succeeds.
            stmt.execute("ALTER TABLE courses ALTER COLUMN duration SET NOT NULL;");
        }

        // 4. Confirm the NOT NULL constraint is actually in place (repro of the live failure pre-fix)
        try (Connection conn = DriverManager.getConnection(testDbUrl, DB_USER, DB_PASS)) {
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT is_nullable FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'duration'");
                 ResultSet rs = ps.executeQuery()) {
                assertTrue(rs.next());
                assertEquals("NO", rs.getString(1), "courses.duration MUST be NOT NULL before V6 runs (reproducing the live bug)");
            }
        }

        // 5. Migrate to latest. Pre-fix this failed at V6 with
        //    'null value in column "duration" of relation "courses" violates not-null constraint'
        Flyway flywayToLatest = Flyway.configure()
                .dataSource(testDbUrl, DB_USER, DB_PASS)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .ignoreMigrationPatterns("*:ignored")
                .target("latest")
                .locations("classpath:db/migration")
                .load();

        MigrateResult result = flywayToLatest.migrate();
        assertTrue(result.success, "Migration from NOT NULL duration DB to latest must succeed (no restart loop)");
        assertEquals(LATEST_VERSION, result.targetSchemaVersion, "Target schema version must be " + LATEST_VERSION);

        // 6. Verify data normalization and final schema
        try (Connection conn = DriverManager.getConnection(testDbUrl, DB_USER, DB_PASS)) {
            assertCourseDuration(conn, 701, "3 months");    // valid duration preserved
            assertCourseDuration(conn, 702, "8 weeks");     // 6-8 weeks -> 8 weeks
            assertCourseDuration(conn, 703, "2 days");      // 16 hours -> 2 days
            assertCourseDuration(conn, 704, null);          // 'Custom TBD' -> NULL (manual review)
            assertCourseDuration(conn, 705, null);          // '12 WEEKS' -> NULL (manual review)

            // No data destroyed: all 5 rows still present
            try (Statement st = conn.createStatement();
                 ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM courses")) {
                assertTrue(rs.next());
                assertEquals(5, rs.getInt(1), "All seeded courses must be preserved");
            }

            verifyFinalSchema(conn);
        }

        // 7. Boot the full Spring Boot app once more to prove the restart loop is gone:
        //    Flyway validation passes and there are no pending migrations to fail.
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
            assertNotNull(context, "Spring Boot context must boot on the previously-failing NOT NULL DB");
            assertTrue(context.isRunning(), "Application must start after the corrective migration (no restart loop)");
        } finally {
            if (context != null) {
                context.close();
            }
        }

        try {
            executeSqlOnPostgres("DROP DATABASE IF EXISTS " + testDbName + ";");
        } catch (Exception ignored) {}

        System.out.println("=== Production NOT NULL duration scenario (V5 -> latest) PASSED ===");
    }

    @Test
    @DisplayName("6b. Schema convergence: fresh DB and existing NOT NULL duration DB reach identical final schema")
    void testFreshAndNotNullSchemaConvergence() throws Exception {
        System.out.println("=== Testing schema convergence: fresh DB vs NOT NULL duration DB ===");

        String freshDbName = "lms_converge_fresh_test";
        String notNullDbName = "lms_converge_notnull_test";
        String freshDbUrl = "jdbc:postgresql://" + PG_HOST + ":" + PG_PORT + "/" + freshDbName;
        String notNullDbUrl = "jdbc:postgresql://" + PG_HOST + ":" + PG_PORT + "/" + notNullDbName;

        // Fresh database
        try {
            recreateDatabase(freshDbName);
        } catch (Exception e) {
            org.junit.jupiter.api.Assumptions.abort("Cannot create database: " + e.getMessage());
            return;
        }
        Flyway flywayFresh = Flyway.configure()
                .dataSource(freshDbUrl, DB_USER, DB_PASS)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .ignoreMigrationPatterns("*:ignored")
                .target("latest")
                .locations("classpath:db/migration")
                .load();
        MigrateResult freshResult = flywayFresh.migrate();
        assertTrue(freshResult.success, "Fresh DB migration must succeed");
        assertEquals(LATEST_VERSION, freshResult.targetSchemaVersion, "Fresh DB must reach schema version " + LATEST_VERSION);

        // Existing/NOT NULL database (as in production)
        recreateDatabase(notNullDbName);
        Flyway flywayToV5 = Flyway.configure()
                .dataSource(notNullDbUrl, DB_USER, DB_PASS)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .ignoreMigrationPatterns("*:ignored")
                .target("5")
                .locations("classpath:db/migration")
                .load();
        flywayToV5.migrate();
        try (Connection conn = DriverManager.getConnection(notNullDbUrl, DB_USER, DB_PASS);
             Statement stmt = conn.createStatement()) {
            stmt.execute("INSERT INTO courses (id, title, description, duration, level, status, created_at, updated_at) " +
                    "VALUES (801, 'Legacy Duration Course', 'Desc', 'Self-paced', 'BEGINNER', 'PUBLISHED', NOW(), NOW());");
            stmt.execute("ALTER TABLE courses ALTER COLUMN duration SET NOT NULL;");
        }
        Flyway flywayNotNull = Flyway.configure()
                .dataSource(notNullDbUrl, DB_USER, DB_PASS)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .ignoreMigrationPatterns("*:ignored")
                .target("latest")
                .locations("classpath:db/migration")
                .load();
        MigrateResult notNullResult = flywayNotNull.migrate();
        assertTrue(notNullResult.success, "NOT NULL DB migration must succeed");
        assertEquals(LATEST_VERSION, notNullResult.targetSchemaVersion, "NOT NULL DB must reach schema version " + LATEST_VERSION);

        // Compare duration column nullability + CHECK constraint across both databases
        String freshState;
        String notNullState;
        try (Connection conn = DriverManager.getConnection(freshDbUrl, DB_USER, DB_PASS)) {
            freshState = durationSchemaState(conn);
        }
        try (Connection conn = DriverManager.getConnection(notNullDbUrl, DB_USER, DB_PASS)) {
            notNullState = durationSchemaState(conn);
        }
        assertEquals(freshState, notNullState,
                "Fresh DB and existing NOT NULL DB must converge to the same courses.duration schema state");
        System.out.println("  fresh state = " + freshState);
        System.out.println("  not-null state = " + notNullState);

        try {
            executeSqlOnPostgres("DROP DATABASE IF EXISTS " + freshDbName + ";");
            executeSqlOnPostgres("DROP DATABASE IF EXISTS " + notNullDbName + ";");
        } catch (Exception ignored) {}

        System.out.println("=== Fresh vs NOT NULL duration schema convergence PASSED ===");
    }

    @Test
    @DisplayName("7. Application Startup: Verify Spring Boot context boots successfully with Flyway on PostgreSQL")
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

    private String durationSchemaState(Connection conn) throws Exception {
        StringBuilder state = new StringBuilder();
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT is_nullable FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'duration'");
             ResultSet rs = ps.executeQuery()) {
            if (rs.next()) {
                state.append("is_nullable=").append(rs.getString("is_nullable"));
            }
        }
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'chk_courses_duration_standard'");
             ResultSet rs = ps.executeQuery()) {
            if (rs.next()) {
                state.append(" | check=").append(rs.getString(1));
            } else {
                state.append(" | check=MISSING");
            }
        }
        return state.toString();
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

        // 7b. courses.duration MUST be nullable (legacy/unrecognized values are NULLed for manual review)
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT is_nullable FROM information_schema.columns " +
                        "WHERE table_name = 'courses' AND column_name = 'duration'");
             ResultSet rs = ps.executeQuery()) {
            assertTrue(rs.next(), "courses.duration column must exist");
            assertEquals("YES", rs.getString(1), "courses.duration MUST be nullable (NULL allowed for manual-review rows)");
        }

        // 8. Questions question_type check constraint must allow SHORT_ANSWER
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'questions_question_type_check'");
             ResultSet rs = ps.executeQuery()) {
            assertTrue(rs.next());
            String def = rs.getString(1);
            assertTrue(def.contains("SHORT_ANSWER"), "questions_question_type_check MUST contain SHORT_ANSWER");
        }

        // 9. V13 Authoritative Check Constraints
        String[] v13Constraints = {
                "chk_quizzes_duration", "chk_quizzes_passing_score", "chk_quizzes_max_attempts",
                "chk_batches_max_students", "chk_questions_points",
                "chk_assignments_total_marks", "chk_assignment_submissions_marks",
                "chk_attendance_goals_target", "chk_attendance_policies_thresholds",
                "chk_interview_rounds_sequence", "chk_interview_rounds_duration",
                "chk_interview_rounds_min_score", "chk_interview_rounds_max_score", "chk_interview_rounds_scores_order",
                "chk_mock_interviews_duration",
                "chk_drives_min_cgpa", "chk_drives_min_percentage", "chk_drives_max_backlogs", "chk_drives_min_attendance", "chk_drives_dates",
                "chk_interview_evaluations_technical", "chk_interview_evaluations_communication",
                "chk_interview_evaluations_problem_solving", "chk_interview_evaluations_coding",
                "chk_interview_evaluations_domain", "chk_interview_evaluations_overall",
                "chk_sessions_duration",
                "chk_academic_10th_year", "chk_academic_10th_pct",
                "chk_academic_12th_year", "chk_academic_12th_pct",
                "chk_academic_diploma_year", "chk_academic_diploma_pct",
                "chk_academic_ug_year", "chk_academic_ug_score", "chk_academic_ug_backlogs",
                "chk_academic_pg_year", "chk_academic_pg_score", "chk_academic_pg_backlogs",
                "chk_syllabus_modules_duration", "chk_syllabus_modules_order",
                "chk_syllabus_topics_duration", "chk_syllabus_topics_order",
                "chk_quiz_questions_order"
        };
        for (String conName : v13Constraints) {
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT COUNT(*) FROM pg_constraint WHERE conname = ?")) {
                ps.setString(1, conName);
                try (ResultSet rs = ps.executeQuery()) {
                    assertTrue(rs.next());
                    assertEquals(1, rs.getInt(1), "V13 constraint " + conName + " MUST exist in database");
                }
            }
        }
    }
}
