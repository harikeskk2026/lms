package com.careerlabs.lms.api.academic.service.impl;

import com.careerlabs.lms.api.academic.dto.request.AcademicDetailsRequest;
import com.careerlabs.lms.api.academic.dto.response.AcademicDetailsResponse;
import com.careerlabs.lms.api.academic.entity.AcademicDetails;
import com.careerlabs.lms.api.academic.repository.AcademicDetailsRepository;
import com.careerlabs.lms.api.academic.service.AcademicDetailsService;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AcademicDetailsServiceImpl implements AcademicDetailsService {

    private final AcademicDetailsRepository academicDetailsRepository;
    private final StudentRepository studentRepository;

    public AcademicDetailsServiceImpl(AcademicDetailsRepository academicDetailsRepository,
                                       StudentRepository studentRepository) {
        this.academicDetailsRepository = academicDetailsRepository;
        this.studentRepository = studentRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public AcademicDetailsResponse get(Long studentId) {
        if (!studentRepository.existsById(studentId)) {
            throw new ResourceNotFoundException("Student not found: " + studentId);
        }
        AcademicDetails details = academicDetailsRepository.findByStudentId(studentId).orElse(null);
        return AcademicDetailsResponse.from(studentId, details);
    }

    @Override
    @Transactional
    public AcademicDetailsResponse save(Long studentId, AcademicDetailsRequest request) {
        AcademicDetails details = academicDetailsRepository.findByStudentId(studentId)
                .orElseGet(() -> {
                    Student student = studentRepository.findById(studentId)
                            .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + studentId));
                    AcademicDetails fresh = new AcademicDetails();
                    fresh.setStudent(student);
                    return fresh;
                });

        details.setTenthYearOfPassing(request.getTenthYearOfPassing());
        details.setTenthPercentage(request.getTenthPercentage());
        details.setTwelfthYearOfPassing(request.getTwelfthYearOfPassing());
        details.setTwelfthPercentage(request.getTwelfthPercentage());
        details.setDiplomaYearOfPassing(request.getDiplomaYearOfPassing());
        details.setDiplomaPercentage(request.getDiplomaPercentage());
        details.setUgDegree(request.getUgDegree());
        details.setUgDepartment(request.getUgDepartment());
        details.setUgYearOfPassing(request.getUgYearOfPassing());
        details.setUgScoreType(request.getUgScoreType());
        details.setUgScore(request.getUgScore());
        details.setUgBacklogs(request.getUgBacklogs());
        details.setPgDegree(request.getPgDegree());
        details.setPgDepartment(request.getPgDepartment());
        details.setPgYearOfPassing(request.getPgYearOfPassing());
        details.setPgScoreType(request.getPgScoreType());
        details.setPgScore(request.getPgScore());
        details.setPgBacklogs(request.getPgBacklogs());

        AcademicDetails saved = academicDetailsRepository.save(details);
        return AcademicDetailsResponse.from(studentId, saved);
    }
}
