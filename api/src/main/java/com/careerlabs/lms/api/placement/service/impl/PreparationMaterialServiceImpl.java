package com.careerlabs.lms.api.placement.service.impl;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.storage.FileStorageService;
import com.careerlabs.lms.api.common.storage.StoredFile;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.placement.dto.request.CreatePreparationMaterialRequest;
import com.careerlabs.lms.api.placement.dto.request.PreparationQuestionRequest;
import com.careerlabs.lms.api.placement.dto.request.UpdatePreparationMaterialRequest;
import com.careerlabs.lms.api.placement.dto.response.PreparationMaterialDetailResponse;
import com.careerlabs.lms.api.placement.dto.response.PreparationMaterialResponse;
import com.careerlabs.lms.api.placement.entity.PreparationDocument;
import com.careerlabs.lms.api.placement.entity.PreparationMaterial;
import com.careerlabs.lms.api.placement.entity.PreparationMaterialStatus;
import com.careerlabs.lms.api.placement.entity.PreparationQuestion;
import com.careerlabs.lms.api.placement.repository.PreparationDocumentRepository;
import com.careerlabs.lms.api.placement.repository.PreparationMaterialRepository;
import com.careerlabs.lms.api.placement.repository.PreparationQuestionRepository;
import com.careerlabs.lms.api.placement.service.DocumentDownload;
import com.careerlabs.lms.api.placement.service.PreparationMaterialService;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
public class PreparationMaterialServiceImpl implements PreparationMaterialService {

    private static final Set<String> ALLOWED_DOCUMENT_EXTENSIONS = Set.of("pdf", "doc", "docx");

    private final PreparationMaterialRepository materialRepository;
    private final PreparationDocumentRepository documentRepository;
    private final PreparationQuestionRepository questionRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final FileStorageService fileStorageService;

    public PreparationMaterialServiceImpl(PreparationMaterialRepository materialRepository,
                                          PreparationDocumentRepository documentRepository,
                                          PreparationQuestionRepository questionRepository,
                                          CourseRepository courseRepository,
                                          UserRepository userRepository,
                                          StudentRepository studentRepository,
                                          FileStorageService fileStorageService) {
        this.materialRepository = materialRepository;
        this.documentRepository = documentRepository;
        this.questionRepository = questionRepository;
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.fileStorageService = fileStorageService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PreparationMaterialResponse> listForAdmin() {
        return materialRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(PreparationMaterialResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PreparationMaterialResponse getForAdmin(Long id) {
        return PreparationMaterialResponse.from(getMaterial(id));
    }

    @Override
    @Transactional(readOnly = true)
    public PreparationMaterialDetailResponse getForAdminDetail(Long id) {
        return PreparationMaterialDetailResponse.from(getMaterial(id));
    }

    @Override
    @Transactional
    public PreparationMaterialResponse create(CreatePreparationMaterialRequest request, Long principalUserId) {
        if (request.title() == null || request.title().isBlank()) {
            throw new BadRequestException("Title is required");
        }

        PreparationMaterial material = new PreparationMaterial();
        material.setTitle(request.title().trim());
        material.setInterviewType(blankToNull(request.interviewType()));
        material.setInstructions(blankToNull(request.instructions()));
        material.setCourse(resolveCourse(request.courseId()));
        material.setStatus(PreparationMaterialStatus.DRAFT);

        return PreparationMaterialResponse.from(materialRepository.save(material));
    }

    @Override
    @Transactional
    public PreparationMaterialResponse update(Long id, UpdatePreparationMaterialRequest request) {
        PreparationMaterial material = getMaterial(id);
        if (request.title() != null) {
            if (request.title().isBlank()) {
                throw new BadRequestException("Title cannot be blank");
            }
            material.setTitle(request.title().trim());
        }
        if (request.interviewType() != null) {
            material.setInterviewType(blankToNull(request.interviewType()));
        }
        if (request.instructions() != null) {
            material.setInstructions(blankToNull(request.instructions()));
        }
        if (request.courseId() != null) {
            material.setCourse(resolveCourse(request.courseId()));
        }
        return PreparationMaterialResponse.from(materialRepository.save(material));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        PreparationMaterial material = getMaterial(id);
        materialRepository.delete(material);
    }

    @Override
    @Transactional
    public PreparationMaterialResponse publish(Long id, Long principalUserId) {
        PreparationMaterial material = getMaterial(id);
        if (material.getStatus() == PreparationMaterialStatus.PUBLISHED) {
            throw new BadRequestException("Material is already published");
        }
        User publisher = userRepository.findById(principalUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + principalUserId));
        material.setStatus(PreparationMaterialStatus.PUBLISHED);
        material.setPublishedBy(publisher);
        material.setPublishedAt(Instant.now());
        material.setArchivedAt(null);
        return PreparationMaterialResponse.from(materialRepository.save(material));
    }

    @Override
    @Transactional
    public PreparationMaterialResponse archive(Long id) {
        PreparationMaterial material = getMaterial(id);
        if (material.getStatus() != PreparationMaterialStatus.PUBLISHED) {
            throw new BadRequestException("Only published materials can be archived");
        }
        material.setStatus(PreparationMaterialStatus.ARCHIVED);
        material.setArchivedAt(Instant.now());
        return PreparationMaterialResponse.from(materialRepository.save(material));
    }

    @Override
    @Transactional
    public PreparationMaterialResponse uploadDocument(Long materialId, MultipartFile file) {
        PreparationMaterial material = getMaterial(materialId);
        if (material.getStatus() == PreparationMaterialStatus.ARCHIVED) {
            throw new BadRequestException("Cannot upload documents to an archived material");
        }
        StoredFile stored = fileStorageService.store(file, "preparation-materials", ALLOWED_DOCUMENT_EXTENSIONS);

        PreparationDocument document = new PreparationDocument();
        document.setMaterial(material);
        document.setFileName(stored.originalName());
        document.setFileUrl(stored.url());
        document.setFileSize(file.getSize());
        document.setContentType(contentType(stored.originalName()));
        documentRepository.save(document);

        return PreparationMaterialResponse.from(materialRepository.save(material));
    }

    @Override
    @Transactional
    public void deleteDocument(Long materialId, Long documentId) {
        PreparationDocument document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));
        if (!document.getMaterial().getId().equals(materialId)) {
            throw new ResourceNotFoundException("Document not found: " + documentId);
        }
        documentRepository.delete(document);
    }

    @Override
    @Transactional
    public PreparationMaterialDetailResponse setQuestions(Long materialId, List<PreparationQuestionRequest> requests) {
        PreparationMaterial material = getMaterial(materialId);
        if (material.getStatus() == PreparationMaterialStatus.ARCHIVED) {
            throw new BadRequestException("Cannot edit questions on an archived material");
        }
        List<PreparationQuestion> existing = material.getQuestions();
        questionRepository.deleteByMaterial_Id(materialId);
        questionRepository.flush();
        existing.clear();

        List<PreparationQuestion> added = new ArrayList<>();
        if (requests != null) {
            int index = 0;
            for (PreparationQuestionRequest req : requests) {
                if (req.questionText() == null || req.questionText().isBlank()) {
                    continue;
                }
                PreparationQuestion q = new PreparationQuestion();
                q.setMaterial(material);
                q.setQuestionText(req.questionText().trim());
                q.setAnswerText(blankToNull(req.answerText()));
                q.setSortOrder(req.sortOrder() != null ? req.sortOrder() : index);
                added.add(q);
                index++;
            }
        }
        material.getQuestions().clear();
        material.getQuestions().addAll(questionRepository.saveAll(added));
        materialRepository.save(material);

        return PreparationMaterialDetailResponse.from(material);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PreparationMaterialResponse> listForStudent(Long studentId) {
        Student student = getStudent(studentId);
        List<PreparationMaterial> general = materialRepository
                .findByStatusAndCourseIsNullOrderByCreatedAtDesc(PreparationMaterialStatus.PUBLISHED);
        List<PreparationMaterialResponse> result = new ArrayList<>(general.stream()
                .map(PreparationMaterialResponse::from).toList());
        if (student.getCourse() != null) {
            result.addAll(materialRepository
                    .findByStatusAndCourseIdOrderByCreatedAtDesc(PreparationMaterialStatus.PUBLISHED, student.getCourse().getId())
                    .stream().map(PreparationMaterialResponse::from).toList());
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public PreparationMaterialDetailResponse getForStudent(Long materialId, Long studentId) {
        Student student = getStudent(studentId);
        PreparationMaterial material = requireAccessible(materialId, student);
        return PreparationMaterialDetailResponse.from(material);
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentDownload downloadDocument(Long materialId, Long documentId, Long studentId) {
        Student student = getStudent(studentId);
        PreparationMaterial material = requireAccessible(materialId, student);
        PreparationDocument document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + documentId));
        if (!document.getMaterial().getId().equals(material.getId())) {
            throw new ResourceNotFoundException("Document not found: " + documentId);
        }
        return new DocumentDownload(fileStorageService.load(document.getFileUrl()), document.getFileName());
    }

    private PreparationMaterial requireAccessible(Long materialId, Student student) {
        PreparationMaterial material = getMaterial(materialId);
        if (material.getStatus() != PreparationMaterialStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Preparation material not found: " + materialId);
        }
        if (material.getCourse() != null) {
            if (student.getCourse() == null || !material.getCourse().getId().equals(student.getCourse().getId())) {
                throw new ResourceNotFoundException("Preparation material not found: " + materialId);
            }
        }
        return material;
    }

    private PreparationMaterial getMaterial(Long id) {
        return materialRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Preparation material not found: " + id));
    }

    private Student getStudent(Long studentId) {
        return studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
    }

    private Course resolveCourse(Long courseId) {
        if (courseId == null) {
            return null;
        }
        return courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseId));
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String contentType(String fileName) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (lower.endsWith(".doc")) return "application/msword";
        return "application/octet-stream";
    }
}