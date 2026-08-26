package com.careerlabs.lms.api.report.validation;

import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class ReportValidator {

    private final BatchRepository batchRepository;
    private final CourseRepository courseRepository;
    private final StudentRepository studentRepository;

    public ReportValidator(BatchRepository batchRepository, CourseRepository courseRepository,
                            StudentRepository studentRepository) {
        this.batchRepository = batchRepository;
        this.courseRepository = courseRepository;
        this.studentRepository = studentRepository;
    }

    public void validateBatchExists(Long batchId) {
        if (batchId != null && !batchRepository.existsById(batchId)) {
            throw new ResourceNotFoundException("Batch not found: " + batchId);
        }
    }

    public void validateCourseExists(Long courseId) {
        if (courseId != null && !courseRepository.existsById(courseId)) {
            throw new ResourceNotFoundException("Course not found: " + courseId);
        }
    }

    public void validateStudentExists(Long studentId) {
        if (studentId != null && !studentRepository.existsById(studentId)) {
            throw new ResourceNotFoundException("Student not found: " + studentId);
        }
    }

    public void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new BadRequestException("End date must not be before start date");
        }
    }
}
