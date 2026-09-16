-- V13: Enforce authoritative numeric-field check constraints across core tables

-- 1. Quizzes
ALTER TABLE quizzes DROP CONSTRAINT IF EXISTS chk_quizzes_duration;
ALTER TABLE quizzes ADD CONSTRAINT chk_quizzes_duration
    CHECK (duration IS NULL OR (duration >= 1 AND duration <= 1440));

ALTER TABLE quizzes DROP CONSTRAINT IF EXISTS chk_quizzes_passing_score;
ALTER TABLE quizzes ADD CONSTRAINT chk_quizzes_passing_score
    CHECK (passing_score IS NULL OR (passing_score >= 0 AND passing_score <= 100));

ALTER TABLE quizzes DROP CONSTRAINT IF EXISTS chk_quizzes_max_attempts;
ALTER TABLE quizzes ADD CONSTRAINT chk_quizzes_max_attempts
    CHECK (max_attempts IS NULL OR (max_attempts >= 1 AND max_attempts <= 100));

-- 2. Batches
ALTER TABLE batches DROP CONSTRAINT IF EXISTS chk_batches_max_students;
ALTER TABLE batches ADD CONSTRAINT chk_batches_max_students
    CHECK (max_students IS NULL OR (max_students >= 1 AND max_students <= 500));

-- 3. Questions
ALTER TABLE questions DROP CONSTRAINT IF EXISTS chk_questions_points;
ALTER TABLE questions ADD CONSTRAINT chk_questions_points
    CHECK (points IS NULL OR points >= 1);

-- 4. Assignments
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS chk_assignments_total_marks;
ALTER TABLE assignments ADD CONSTRAINT chk_assignments_total_marks
    CHECK (total_marks IS NULL OR (total_marks >= 1 AND total_marks <= 100));

ALTER TABLE assignment_submissions DROP CONSTRAINT IF EXISTS chk_assignment_submissions_marks;
ALTER TABLE assignment_submissions ADD CONSTRAINT chk_assignment_submissions_marks
    CHECK (marks IS NULL OR marks >= 0);

-- 5. Attendance Goals
ALTER TABLE attendance_goals DROP CONSTRAINT IF EXISTS chk_attendance_goals_target;
ALTER TABLE attendance_goals ADD CONSTRAINT chk_attendance_goals_target
    CHECK (target_percentage IS NULL OR (target_percentage >= 50 AND target_percentage <= 100));

-- 6. Attendance Policies
ALTER TABLE attendance_policies DROP CONSTRAINT IF EXISTS chk_attendance_policies_thresholds;
ALTER TABLE attendance_policies ADD CONSTRAINT chk_attendance_policies_thresholds
    CHECK (
        healthy_threshold IS NULL OR at_risk_threshold IS NULL OR (
            healthy_threshold >= 1 AND healthy_threshold <= 100 AND
            at_risk_threshold >= 1 AND at_risk_threshold <= 100 AND
            healthy_threshold > at_risk_threshold
        )
    );

-- 7. Interview Rounds
ALTER TABLE interview_rounds DROP CONSTRAINT IF EXISTS chk_interview_rounds_sequence;
ALTER TABLE interview_rounds ADD CONSTRAINT chk_interview_rounds_sequence
    CHECK (sequence IS NULL OR sequence >= 1);

ALTER TABLE interview_rounds DROP CONSTRAINT IF EXISTS chk_interview_rounds_duration;
ALTER TABLE interview_rounds ADD CONSTRAINT chk_interview_rounds_duration
    CHECK (duration_minutes IS NULL OR (duration_minutes >= 1 AND duration_minutes <= 600));

ALTER TABLE interview_rounds DROP CONSTRAINT IF EXISTS chk_interview_rounds_min_score;
ALTER TABLE interview_rounds ADD CONSTRAINT chk_interview_rounds_min_score
    CHECK (minimum_score IS NULL OR (minimum_score >= 0 AND minimum_score <= 100));

ALTER TABLE interview_rounds DROP CONSTRAINT IF EXISTS chk_interview_rounds_max_score;
ALTER TABLE interview_rounds ADD CONSTRAINT chk_interview_rounds_max_score
    CHECK (max_score IS NULL OR (max_score >= 0 AND max_score <= 100));

ALTER TABLE interview_rounds DROP CONSTRAINT IF EXISTS chk_interview_rounds_scores_order;
ALTER TABLE interview_rounds ADD CONSTRAINT chk_interview_rounds_scores_order
    CHECK (minimum_score IS NULL OR max_score IS NULL OR minimum_score <= max_score);

-- 8. Mock Interviews
ALTER TABLE mock_interviews DROP CONSTRAINT IF EXISTS chk_mock_interviews_duration;
ALTER TABLE mock_interviews ADD CONSTRAINT chk_mock_interviews_duration
    CHECK (duration_minutes IS NULL OR (duration_minutes >= 1 AND duration_minutes <= 600));

-- 9. Drives
ALTER TABLE drives DROP CONSTRAINT IF EXISTS chk_drives_min_cgpa;
ALTER TABLE drives ADD CONSTRAINT chk_drives_min_cgpa
    CHECK (min_cgpa IS NULL OR (min_cgpa >= 0 AND min_cgpa <= 10));

ALTER TABLE drives DROP CONSTRAINT IF EXISTS chk_drives_min_percentage;
ALTER TABLE drives ADD CONSTRAINT chk_drives_min_percentage
    CHECK (min_percentage IS NULL OR (min_percentage >= 0 AND min_percentage <= 100));

ALTER TABLE drives DROP CONSTRAINT IF EXISTS chk_drives_max_backlogs;
ALTER TABLE drives ADD CONSTRAINT chk_drives_max_backlogs
    CHECK (max_backlogs IS NULL OR max_backlogs >= 0);

ALTER TABLE drives DROP CONSTRAINT IF EXISTS chk_drives_min_attendance;
ALTER TABLE drives ADD CONSTRAINT chk_drives_min_attendance
    CHECK (min_attendance_pct IS NULL OR (min_attendance_pct >= 0 AND min_attendance_pct <= 100));

ALTER TABLE drives DROP CONSTRAINT IF EXISTS chk_drives_dates;
ALTER TABLE drives ADD CONSTRAINT chk_drives_dates
    CHECK (apply_deadline IS NULL OR drive_date IS NULL OR apply_deadline <= drive_date);

-- 10. Interview Evaluations
ALTER TABLE interview_evaluations DROP CONSTRAINT IF EXISTS chk_interview_evaluations_technical;
ALTER TABLE interview_evaluations ADD CONSTRAINT chk_interview_evaluations_technical
    CHECK (technical_score IS NULL OR (technical_score >= 0 AND technical_score <= 100));

ALTER TABLE interview_evaluations DROP CONSTRAINT IF EXISTS chk_interview_evaluations_communication;
ALTER TABLE interview_evaluations ADD CONSTRAINT chk_interview_evaluations_communication
    CHECK (communication_score IS NULL OR (communication_score >= 0 AND communication_score <= 100));

ALTER TABLE interview_evaluations DROP CONSTRAINT IF EXISTS chk_interview_evaluations_problem_solving;
ALTER TABLE interview_evaluations ADD CONSTRAINT chk_interview_evaluations_problem_solving
    CHECK (problem_solving_score IS NULL OR (problem_solving_score >= 0 AND problem_solving_score <= 100));

ALTER TABLE interview_evaluations DROP CONSTRAINT IF EXISTS chk_interview_evaluations_coding;
ALTER TABLE interview_evaluations ADD CONSTRAINT chk_interview_evaluations_coding
    CHECK (coding_score IS NULL OR (coding_score >= 0 AND coding_score <= 100));

ALTER TABLE interview_evaluations DROP CONSTRAINT IF EXISTS chk_interview_evaluations_domain;
ALTER TABLE interview_evaluations ADD CONSTRAINT chk_interview_evaluations_domain
    CHECK (domain_score IS NULL OR (domain_score >= 0 AND domain_score <= 100));

ALTER TABLE interview_evaluations DROP CONSTRAINT IF EXISTS chk_interview_evaluations_overall;
ALTER TABLE interview_evaluations ADD CONSTRAINT chk_interview_evaluations_overall
    CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100));

-- 11. Sessions
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS chk_sessions_duration;
ALTER TABLE sessions ADD CONSTRAINT chk_sessions_duration
    CHECK (duration_minutes IS NULL OR duration_minutes >= 1);

-- 12. Academic Details
ALTER TABLE academic_details DROP CONSTRAINT IF EXISTS chk_academic_10th_year;
ALTER TABLE academic_details ADD CONSTRAINT chk_academic_10th_year
    CHECK (tenth_year_of_passing IS NULL OR (tenth_year_of_passing >= 1950 AND tenth_year_of_passing <= 2100));

ALTER TABLE academic_details DROP CONSTRAINT IF EXISTS chk_academic_10th_pct;
ALTER TABLE academic_details ADD CONSTRAINT chk_academic_10th_pct
    CHECK (tenth_percentage IS NULL OR (tenth_percentage >= 0 AND tenth_percentage <= 100));

ALTER TABLE academic_details DROP CONSTRAINT IF EXISTS chk_academic_12th_year;
ALTER TABLE academic_details ADD CONSTRAINT chk_academic_12th_year
    CHECK (twelfth_year_of_passing IS NULL OR (twelfth_year_of_passing >= 1950 AND twelfth_year_of_passing <= 2100));

ALTER TABLE academic_details DROP CONSTRAINT IF EXISTS chk_academic_12th_pct;
ALTER TABLE academic_details ADD CONSTRAINT chk_academic_12th_pct
    CHECK (twelfth_percentage IS NULL OR (twelfth_percentage >= 0 AND twelfth_percentage <= 100));

ALTER TABLE academic_details DROP CONSTRAINT IF EXISTS chk_academic_diploma_year;
ALTER TABLE academic_details ADD CONSTRAINT chk_academic_diploma_year
    CHECK (diploma_year_of_passing IS NULL OR (diploma_year_of_passing >= 1950 AND diploma_year_of_passing <= 2100));

ALTER TABLE academic_details DROP CONSTRAINT IF EXISTS chk_academic_diploma_pct;
ALTER TABLE academic_details ADD CONSTRAINT chk_academic_diploma_pct
    CHECK (diploma_percentage IS NULL OR (diploma_percentage >= 0 AND diploma_percentage <= 100));

ALTER TABLE academic_details DROP CONSTRAINT IF EXISTS chk_academic_ug_year;
ALTER TABLE academic_details ADD CONSTRAINT chk_academic_ug_year
    CHECK (ug_year_of_passing IS NULL OR (ug_year_of_passing >= 1950 AND ug_year_of_passing <= 2100));

ALTER TABLE academic_details DROP CONSTRAINT IF EXISTS chk_academic_ug_score;
ALTER TABLE academic_details ADD CONSTRAINT chk_academic_ug_score
    CHECK (ug_score IS NULL OR (ug_score >= 0 AND (
        (ug_score_type = 'CGPA' AND ug_score <= 10) OR
        (ug_score_type = 'PERCENTAGE' AND ug_score <= 100) OR
        (ug_score_type IS NULL AND ug_score <= 100)
    )));

ALTER TABLE academic_details DROP CONSTRAINT IF EXISTS chk_academic_ug_backlogs;
ALTER TABLE academic_details ADD CONSTRAINT chk_academic_ug_backlogs
    CHECK (ug_backlogs IS NULL OR ug_backlogs >= 0);

ALTER TABLE academic_details DROP CONSTRAINT IF EXISTS chk_academic_pg_year;
ALTER TABLE academic_details ADD CONSTRAINT chk_academic_pg_year
    CHECK (pg_year_of_passing IS NULL OR (pg_year_of_passing >= 1950 AND pg_year_of_passing <= 2100));

ALTER TABLE academic_details DROP CONSTRAINT IF EXISTS chk_academic_pg_score;
ALTER TABLE academic_details ADD CONSTRAINT chk_academic_pg_score
    CHECK (pg_score IS NULL OR (pg_score >= 0 AND (
        (pg_score_type = 'CGPA' AND pg_score <= 10) OR
        (pg_score_type = 'PERCENTAGE' AND pg_score <= 100) OR
        (pg_score_type IS NULL AND pg_score <= 100)
    )));

ALTER TABLE academic_details DROP CONSTRAINT IF EXISTS chk_academic_pg_backlogs;
ALTER TABLE academic_details ADD CONSTRAINT chk_academic_pg_backlogs
    CHECK (pg_backlogs IS NULL OR pg_backlogs >= 0);

-- 13. Syllabus Modules & Topics
ALTER TABLE syllabus_modules DROP CONSTRAINT IF EXISTS chk_syllabus_modules_duration;
ALTER TABLE syllabus_modules ADD CONSTRAINT chk_syllabus_modules_duration
    CHECK (duration_value IS NULL OR duration_value >= 1);

ALTER TABLE syllabus_modules DROP CONSTRAINT IF EXISTS chk_syllabus_modules_order;
ALTER TABLE syllabus_modules ADD CONSTRAINT chk_syllabus_modules_order
    CHECK (order_index >= 0);

ALTER TABLE syllabus_topics DROP CONSTRAINT IF EXISTS chk_syllabus_topics_duration;
ALTER TABLE syllabus_topics ADD CONSTRAINT chk_syllabus_topics_duration
    CHECK (duration_hours IS NULL OR duration_hours >= 1);

ALTER TABLE syllabus_topics DROP CONSTRAINT IF EXISTS chk_syllabus_topics_order;
ALTER TABLE syllabus_topics ADD CONSTRAINT chk_syllabus_topics_order
    CHECK (order_index >= 0);

-- 14. Quiz Questions
ALTER TABLE quiz_questions DROP CONSTRAINT IF EXISTS chk_quiz_questions_order;
ALTER TABLE quiz_questions ADD CONSTRAINT chk_quiz_questions_order
    CHECK (order_index >= 0);
