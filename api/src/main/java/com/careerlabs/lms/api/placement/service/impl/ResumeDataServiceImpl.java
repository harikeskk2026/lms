package com.careerlabs.lms.api.placement.service.impl;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.storage.FileStorageService;
import com.careerlabs.lms.api.common.storage.StoredFile;
import com.careerlabs.lms.api.placement.dto.response.ResumeUploadResponse;
import com.careerlabs.lms.api.placement.entity.ResumeData;
import com.careerlabs.lms.api.placement.repository.ResumeDataRepository;
import com.careerlabs.lms.api.placement.service.ResumeDataService;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ResumeDataServiceImpl implements ResumeDataService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf");

    private final ResumeDataRepository resumeDataRepository;
    private final StudentRepository studentRepository;
    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper;

    public ResumeDataServiceImpl(ResumeDataRepository resumeDataRepository, StudentRepository studentRepository,
                                  FileStorageService fileStorageService, ObjectMapper objectMapper) {
        this.resumeDataRepository = resumeDataRepository;
        this.studentRepository = studentRepository;
        this.fileStorageService = fileStorageService;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public Object get(Long userId) {
        Student student = findStudent(userId);
        return resumeDataRepository.findByStudent_Id(student.getId())
                .<Object>map(resumeData -> readJson(resumeData.getContentJson()))
                .orElseGet(() -> defaultContent(student));
    }

    @Override
    @Transactional
    public Object save(Long userId, Object content) {
        Student student = findStudent(userId);
        ResumeData resumeData = resumeDataRepository.findByStudent_Id(student.getId())
                .orElseGet(() -> {
                    ResumeData created = new ResumeData();
                    created.setStudent(student);
                    return created;
                });
        resumeData.setContentJson(writeJson(content));
        resumeDataRepository.save(resumeData);
        return content;
    }

    @Override
    @Transactional
    public ResumeUploadResponse uploadFile(Long userId, MultipartFile file) {
        Student student = findStudent(userId);
        StoredFile stored = fileStorageService.store(file, "resumes", ALLOWED_EXTENSIONS);
        student.setResumeUrl(stored.url());
        studentRepository.save(student);
        return new ResumeUploadResponse(stored.url(), stored.originalName());
    }

    private Map<String, Object> defaultContent(Student student) {
        Map<String, Object> defaults = new LinkedHashMap<>();
        defaults.put("headline", "");
        defaults.put("summary", "");
        defaults.put("phone", student.getPhone());
        defaults.put("email", student.getUser().getEmail());
        defaults.put("linkedinUrl", student.getLinkedinUrl());
        defaults.put("githubUrl", student.getGithubUrl());
        defaults.put("portfolioUrl", "");
        defaults.put("location", student.getAddress());
        defaults.put("education", List.of());
        defaults.put("experience", List.of());
        defaults.put("projects", List.of());
        defaults.put("certifications", List.of());
        defaults.put("languages", List.of());
        return defaults;
    }

    private Student findStudent(Long userId) {
        return studentRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for this account"));
    }

    private String writeJson(Object content) {
        try {
            return objectMapper.writeValueAsString(content);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to serialize resume content", e);
        }
    }

    private Object readJson(String json) {
        try {
            return objectMapper.readValue(json, Object.class);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to parse stored resume content", e);
        }
    }
}
