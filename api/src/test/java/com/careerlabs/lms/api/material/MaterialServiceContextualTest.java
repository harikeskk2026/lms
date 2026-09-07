package com.careerlabs.lms.api.material;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.storage.FileStorageService;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.material.dto.response.MaterialResponse;
import com.careerlabs.lms.api.material.entity.Material;
import com.careerlabs.lms.api.material.entity.MaterialType;
import com.careerlabs.lms.api.material.entity.MaterialVisibility;
import com.careerlabs.lms.api.material.repository.MaterialRepository;
import com.careerlabs.lms.api.material.service.impl.MaterialServiceImpl;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.session.entity.Session;
import com.careerlabs.lms.api.session.repository.SessionRepository;
import com.careerlabs.lms.api.syllabus.entity.SyllabusModule;
import com.careerlabs.lms.api.syllabus.entity.SyllabusTopic;
import com.careerlabs.lms.api.syllabus.repository.SyllabusModuleRepository;
import com.careerlabs.lms.api.syllabus.repository.SyllabusTopicRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MaterialServiceContextualTest {

    @Mock
    private MaterialRepository materialRepository;
    @Mock
    private CourseRepository courseRepository;
    @Mock
    private SyllabusModuleRepository moduleRepository;
    @Mock
    private SyllabusTopicRepository topicRepository;
    @Mock
    private SessionRepository sessionRepository;
    @Mock
    private CourseAccessGuard accessGuard;
    @Mock
    private FileStorageService fileStorageService;

    @InjectMocks
    private MaterialServiceImpl materialService;

    private final JwtUserPrincipal adminPrincipal = new JwtUserPrincipal(1L, "admin@test.com", "ROLE_ADMIN");
    private final JwtUserPrincipal studentPrincipal = new JwtUserPrincipal(2L, "student@test.com", "ROLE_STUDENT");

    private Course course1;
    private Course course2;
    private SyllabusModule module1;
    private SyllabusTopic topic1;
    private Session session1;

    private void setId(Object target, Long id) {
        org.springframework.test.util.ReflectionTestUtils.setField(target, "id", id);
    }

    @BeforeEach
    void setUp() {
        course1 = new Course();
        setId(course1, 100L);
        course1.setTitle("Java Course");
        course1.setStatus(CourseStatus.PUBLISHED);

        course2 = new Course();
        setId(course2, 200L);
        course2.setTitle("Python Course");
        course2.setStatus(CourseStatus.PUBLISHED);

        module1 = new SyllabusModule();
        setId(module1, 10L);
        module1.setCourse(course1);
        module1.setTitle("Module 1");
        module1.setStatus(CourseStatus.PUBLISHED);
        module1.setOrderIndex(0);

        topic1 = new SyllabusTopic();
        setId(topic1, 20L);
        topic1.setModule(module1);
        topic1.setTitle("Topic 1");
        topic1.setStatus(CourseStatus.PUBLISHED);
        topic1.setOrderIndex(0);

        session1 = new Session();
        setId(session1, 30L);
        session1.setTopic(topic1);
        session1.setTitle("Session 1");
        session1.setStatus(CourseStatus.PUBLISHED);
        session1.setOrderIndex(0);
    }

    private Material createMaterial(Long id, Long cId, Long mId, Long tId, Long sId, String title, MaterialVisibility visibility, int order) {
        Material m = new Material();
        setId(m, id);
        m.setCourseId(cId);
        m.setModuleId(mId);
        m.setTopicId(tId);
        m.setSessionId(sId);
        m.setTitle(title);
        m.setType(MaterialType.PDF);
        m.setUrl("/files/" + title + ".pdf");
        m.setVisibility(visibility);
        m.setOrderIndex(order);
        return m;
    }

    @Test
    @DisplayName("all=true: Deterministic 4-level ordering (Course -> Module -> Topic -> Session)")
    void testListAllForCourseDeterministicOrdering() {
        when(courseRepository.findById(100L)).thenReturn(Optional.of(course1));
        when(accessGuard.isAdmin(studentPrincipal)).thenReturn(false);

        Material cMat = createMaterial(1L, 100L, null, null, null, "Course Syllabus", MaterialVisibility.PUBLISHED, 0);
        Material mMat = createMaterial(2L, null, 10L, null, null, "Module 1 Notes", MaterialVisibility.PUBLISHED, 0);
        Material tMat = createMaterial(3L, null, null, 20L, null, "Topic 1 CheatSheet", MaterialVisibility.PUBLISHED, 0);
        Material sMat = createMaterial(4L, null, null, null, 30L, "Session 1 Slides", MaterialVisibility.PUBLISHED, 0);

        when(materialRepository.findAllByCourseIdAndModuleIdIsNullAndTopicIdIsNullAndSessionIdIsNullOrderByOrderIndexAsc(100L))
                .thenReturn(List.of(cMat));
        when(moduleRepository.findAllByCourseIdOrderByOrderIndexAsc(100L)).thenReturn(List.of(module1));
        when(topicRepository.findAllByModuleIdInOrderByOrderIndexAsc(List.of(10L))).thenReturn(List.of(topic1));
        when(sessionRepository.findAllByTopicIdInOrderByOrderIndexAsc(List.of(20L))).thenReturn(List.of(session1));

        when(materialRepository.findAllByModuleIdInOrderByOrderIndexAsc(List.of(10L))).thenReturn(List.of(mMat));
        when(materialRepository.findAllByTopicIdInOrderByOrderIndexAsc(List.of(20L))).thenReturn(List.of(tMat));
        when(materialRepository.findAllBySessionIdInOrderByOrderIndexAsc(List.of(30L))).thenReturn(List.of(sMat));

        List<MaterialResponse> responses = materialService.listAllForCourse(100L, studentPrincipal);

        assertEquals(4, responses.size());
        assertEquals("Course Syllabus", responses.get(0).title());
        assertEquals("Module 1 Notes", responses.get(1).title());
        assertEquals("Topic 1 CheatSheet", responses.get(2).title());
        assertEquals("Session 1 Slides", responses.get(3).title());
    }

    @Test
    @DisplayName("all=true: Course A materials never leak into Course B")
    void testCourseMaterialsIsolation() {
        when(courseRepository.findById(200L)).thenReturn(Optional.of(course2));
        when(accessGuard.isAdmin(studentPrincipal)).thenReturn(false);

        when(materialRepository.findAllByCourseIdAndModuleIdIsNullAndTopicIdIsNullAndSessionIdIsNullOrderByOrderIndexAsc(200L))
                .thenReturn(List.of());
        when(moduleRepository.findAllByCourseIdOrderByOrderIndexAsc(200L)).thenReturn(List.of());

        List<MaterialResponse> responses = materialService.listAllForCourse(200L, studentPrincipal);

        assertTrue(responses.isEmpty());
        verify(materialRepository, never()).findAllByCourseIdAndModuleIdIsNullAndTopicIdIsNullAndSessionIdIsNullOrderByOrderIndexAsc(100L);
    }

    @Test
    @DisplayName("Visibility: DRAFT and ARCHIVED materials hidden from students, visible to admins")
    void testVisibilityFiltering() {
        when(courseRepository.findById(100L)).thenReturn(Optional.of(course1));

        Material published = createMaterial(1L, 100L, null, null, null, "Published Mat", MaterialVisibility.PUBLISHED, 0);
        Material draft = createMaterial(2L, 100L, null, null, null, "Draft Mat", MaterialVisibility.DRAFT, 1);
        Material archived = createMaterial(3L, 100L, null, null, null, "Archived Mat", MaterialVisibility.ARCHIVED, 2);

        when(materialRepository.findAllByCourseIdAndModuleIdIsNullAndTopicIdIsNullAndSessionIdIsNullOrderByOrderIndexAsc(100L))
                .thenReturn(List.of(published, draft, archived));
        when(moduleRepository.findAllByCourseIdOrderByOrderIndexAsc(100L)).thenReturn(List.of());

        // As Student
        when(accessGuard.isAdmin(studentPrincipal)).thenReturn(false);
        List<MaterialResponse> studentMats = materialService.listAllForCourse(100L, studentPrincipal);
        assertEquals(1, studentMats.size());
        assertEquals("Published Mat", studentMats.get(0).title());

        // As Admin
        when(accessGuard.isAdmin(adminPrincipal)).thenReturn(true);
        List<MaterialResponse> adminMats = materialService.listAllForCourse(100L, adminPrincipal);
        assertEquals(3, adminMats.size());
    }

    @Test
    @DisplayName("Authorization: Non-enrolled students rejected with ResourceNotFoundException")
    void testNonEnrolledStudentRejected() {
        when(courseRepository.findById(100L)).thenReturn(Optional.of(course1));
        doThrow(new ResourceNotFoundException("Course not found: 100"))
                .when(accessGuard).requireContentAccess(studentPrincipal, 100L);

        assertThrows(ResourceNotFoundException.class, () ->
                materialService.listAllForCourse(100L, studentPrincipal));
    }

    @Test
    @DisplayName("all=false: Single-scope behavior remains strictly preserved for all 4 levels")
    void testSingleScopePreserved() {
        // Exactly one scope required
        assertThrows(BadRequestException.class, () ->
                materialService.list(null, null, null, null, adminPrincipal));
        assertThrows(BadRequestException.class, () ->
                materialService.list(100L, 10L, null, null, adminPrincipal));

        // Course scope
        Material cMat = createMaterial(1L, 100L, null, null, null, "Course Mat", MaterialVisibility.PUBLISHED, 0);
        when(materialRepository.findAllByCourseIdAndModuleIdIsNullAndTopicIdIsNullAndSessionIdIsNullOrderByOrderIndexAsc(100L))
                .thenReturn(List.of(cMat));
        when(accessGuard.isAdmin(adminPrincipal)).thenReturn(true);

        List<MaterialResponse> resCourse = materialService.list(100L, null, null, null, adminPrincipal);
        assertEquals(1, resCourse.size());
        assertEquals("Course Mat", resCourse.get(0).title());

        // Module scope
        when(moduleRepository.findById(10L)).thenReturn(Optional.of(module1));
        Material mMat = createMaterial(2L, null, 10L, null, null, "Module Mat", MaterialVisibility.PUBLISHED, 0);
        when(materialRepository.findAllByModuleIdOrderByOrderIndexAsc(10L)).thenReturn(List.of(mMat));

        List<MaterialResponse> resMod = materialService.list(null, 10L, null, null, adminPrincipal);
        assertEquals(1, resMod.size());
        assertEquals("Module Mat", resMod.get(0).title());

        // Topic scope
        when(topicRepository.findById(20L)).thenReturn(Optional.of(topic1));
        Material tMat = createMaterial(3L, null, null, 20L, null, "Topic Mat", MaterialVisibility.PUBLISHED, 0);
        when(materialRepository.findAllByTopicIdOrderByOrderIndexAsc(20L)).thenReturn(List.of(tMat));

        List<MaterialResponse> resTop = materialService.list(null, null, 20L, null, adminPrincipal);
        assertEquals(1, resTop.size());
        assertEquals("Topic Mat", resTop.get(0).title());

        // Session scope
        when(sessionRepository.findById(30L)).thenReturn(Optional.of(session1));
        Material sMat = createMaterial(4L, null, null, null, 30L, "Session Mat", MaterialVisibility.PUBLISHED, 0);
        when(materialRepository.findAllBySessionIdOrderByOrderIndexAsc(30L)).thenReturn(List.of(sMat));

        List<MaterialResponse> resSes = materialService.list(null, null, null, 30L, adminPrincipal);
        assertEquals(1, resSes.size());
        assertEquals("Session Mat", resSes.get(0).title());
    }

    @Test
    @DisplayName("Upload with type OTHER accepts CSV and passes allowed extensions containing csv")
    void uploadCsvWithOtherType_isAccepted() {
        org.springframework.web.multipart.MultipartFile file = mock(org.springframework.web.multipart.MultipartFile.class);
        when(fileStorageService.store(eq(file), eq("materials"), anySet()))
                .thenReturn(new com.careerlabs.lms.api.common.storage.StoredFile("/uploads/materials/test.csv", "test.csv"));

        @SuppressWarnings("unchecked")
        org.mockito.ArgumentCaptor<java.util.Set<String>> captor = org.mockito.ArgumentCaptor.forClass(java.util.Set.class);

        com.careerlabs.lms.api.material.dto.response.UploadResponse response = materialService.upload(file, "OTHER");

        assertNotNull(response);
        assertEquals("/uploads/materials/test.csv", response.url());
        assertEquals("test.csv", response.originalName());

        verify(fileStorageService).store(eq(file), eq("materials"), captor.capture());
        java.util.Set<String> allowed = captor.getValue();
        assertTrue(allowed.contains("csv"), "OTHER allowed extensions must contain csv");
    }

    @Test
    @DisplayName("Upload without type accepts CSV in global allowed extensions")
    void uploadCsvWithoutType_isAccepted() {
        org.springframework.web.multipart.MultipartFile file = mock(org.springframework.web.multipart.MultipartFile.class);
        when(fileStorageService.store(eq(file), eq("materials"), anySet()))
                .thenReturn(new com.careerlabs.lms.api.common.storage.StoredFile("/uploads/materials/data.csv", "data.csv"));

        @SuppressWarnings("unchecked")
        org.mockito.ArgumentCaptor<java.util.Set<String>> captor = org.mockito.ArgumentCaptor.forClass(java.util.Set.class);

        com.careerlabs.lms.api.material.dto.response.UploadResponse response = materialService.upload(file);

        assertNotNull(response);
        assertEquals("/uploads/materials/data.csv", response.url());

        verify(fileStorageService).store(eq(file), eq("materials"), captor.capture());
        java.util.Set<String> allowed = captor.getValue();
        assertTrue(allowed.contains("csv"), "Default allowed extensions must contain csv");
    }

    @Test
    @DisplayName("Upload with type PDF does not include csv in allowed extensions")
    void uploadWithPdfType_restrictsToPdf() {
        org.springframework.web.multipart.MultipartFile file = mock(org.springframework.web.multipart.MultipartFile.class);
        when(fileStorageService.store(eq(file), eq("materials"), anySet()))
                .thenReturn(new com.careerlabs.lms.api.common.storage.StoredFile("/uploads/materials/doc.pdf", "doc.pdf"));

        @SuppressWarnings("unchecked")
        org.mockito.ArgumentCaptor<java.util.Set<String>> captor = org.mockito.ArgumentCaptor.forClass(java.util.Set.class);

        materialService.upload(file, "PDF");

        verify(fileStorageService).store(eq(file), eq("materials"), captor.capture());
        java.util.Set<String> allowed = captor.getValue();
        assertTrue(allowed.contains("pdf"));
        assertFalse(allowed.contains("csv"), "PDF allowed extensions must not contain csv");
    }
}
