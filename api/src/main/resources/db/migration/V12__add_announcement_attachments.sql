-- V12__add_announcement_attachments.sql
-- Add attachment fields to announcements table

ALTER TABLE announcements
    ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(255),
    ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255);
