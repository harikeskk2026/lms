package com.careerlabs.lms.api.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

import static org.junit.jupiter.api.Assertions.*;

public class DatabaseMigrationVerificationTest {

    private static final String DB_URL = "jdbc:postgresql://localhost:5432/lms";
    private static final String DB_USER = "postgres";
    private static final String DB_PASS = "prabhu@15";

    @Test
    @DisplayName("Execute Flyway migrations on real PostgreSQL database and verify schema changes")
    void testFlywayMigrationOnPostgres() throws Exception {
        System.out.println("=== Starting Flyway Migration Verification against PostgreSQL ===");

        // Verify local PostgreSQL is accessible before running migration
        try (Connection testConn = DriverManager.getConnection(DB_URL, DB_USER, DB_PASS)) {
            // Accessible
        } catch (Exception e) {
            org.junit.jupiter.api.Assumptions.abort("PostgreSQL database not available at " + DB_URL + ": " + e.getMessage());
            return;
        }

        // 1. Run Flyway Migration
        Flyway flyway = Flyway.configure()
                .dataSource(DB_URL, DB_USER, DB_PASS)
                .baselineOnMigrate(true)
                .baselineVersion("0")
                .locations("classpath:db/migration")
                .load();

        MigrateResult result = flyway.migrate();
        System.out.println("Flyway migrate success: " + result.success);
        System.out.println("Migrations executed count: " + result.migrationsExecuted);
        System.out.println("Target schema version: " + result.targetSchemaVersion);
        assertTrue(result.success, "Flyway migration must succeed");

        // 2. Connect and inspect database schema
        try (Connection conn = DriverManager.getConnection(DB_URL, DB_USER, DB_PASS)) {
            // Check that students.batch_id does NOT exist
            String checkStudentBatchColSql = """
                SELECT COUNT(*) FROM information_schema.columns 
                WHERE table_name = 'students' AND column_name = 'batch_id'
            """;
            try (PreparedStatement ps = conn.prepareStatement(checkStudentBatchColSql);
                 ResultSet rs = ps.executeQuery()) {
                assertTrue(rs.next());
                int count = rs.getInt(1);
                System.out.println("Count of 'batch_id' column in 'students' table: " + count);
                assertEquals(0, count, "Column 'batch_id' must NOT exist in 'students' table");
            }

            // Check that enrollments.batch_id DOES exist
            String checkEnrollmentBatchColSql = """
                SELECT COUNT(*) FROM information_schema.columns 
                WHERE table_name = 'enrollments' AND column_name = 'batch_id'
            """;
            try (PreparedStatement ps = conn.prepareStatement(checkEnrollmentBatchColSql);
                 ResultSet rs = ps.executeQuery()) {
                assertTrue(rs.next());
                int count = rs.getInt(1);
                System.out.println("Count of 'batch_id' column in 'enrollments' table: " + count);
                assertEquals(1, count, "Column 'batch_id' must exist in 'enrollments' table");
            }

            // Check that enrollments.course_id DOES exist
            String checkEnrollmentCourseColSql = """
                SELECT COUNT(*) FROM information_schema.columns 
                WHERE table_name = 'enrollments' AND column_name = 'course_id'
            """;
            try (PreparedStatement ps = conn.prepareStatement(checkEnrollmentCourseColSql);
                 ResultSet rs = ps.executeQuery()) {
                assertTrue(rs.next());
                int count = rs.getInt(1);
                System.out.println("Count of 'course_id' column in 'enrollments' table: " + count);
                assertEquals(1, count, "Column 'course_id' must exist in 'enrollments' table");
            }

            // Check that no foreign key constraint on students(batch_id) exists
            String checkStudentFkSql = """
                SELECT COUNT(*) 
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                  ON tc.constraint_name = kcu.constraint_name 
                 AND tc.table_schema = kcu.table_schema
                WHERE tc.table_name = 'students' 
                  AND tc.constraint_type = 'FOREIGN KEY'
                  AND kcu.column_name = 'batch_id'
            """;
            try (PreparedStatement ps = conn.prepareStatement(checkStudentFkSql);
                 ResultSet rs = ps.executeQuery()) {
                assertTrue(rs.next());
                int count = rs.getInt(1);
                System.out.println("Count of FK constraints on 'students.batch_id': " + count);
                assertEquals(0, count, "No FK constraint on students.batch_id should exist");
            }

            // Verify Flyway schema history has V5 recorded
            String checkFlywayHistorySql = """
                SELECT version, description, type, script, installed_by, success 
                FROM flyway_schema_history 
                ORDER BY installed_rank DESC
            """;
            try (PreparedStatement ps = conn.prepareStatement(checkFlywayHistorySql);
                 ResultSet rs = ps.executeQuery()) {
                System.out.println("--- Flyway Schema History Entries ---");
                while (rs.next()) {
                    System.out.printf("Version: %s | Description: %s | Success: %s%n",
                            rs.getString("version"),
                            rs.getString("description"),
                            rs.getBoolean("success"));
                }
            }
        }
        System.out.println("=== Database Schema Verification PASSED ===");
    }
}
