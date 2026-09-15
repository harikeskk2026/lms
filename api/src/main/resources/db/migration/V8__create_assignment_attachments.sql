-- V7__create_assignment_attachments.sql
-- Create table for multiple assignment attachments

CREATE TABLE IF NOT EXISTS assignment_attachments (
    assignment_id BIGINT NOT NULL,
    file_url VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    CONSTRAINT fk_assignment_attachments_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assignment_attachments_assignment_id ON assignment_attachments(assignment_id);
