package com.careerlabs.lms.api.syllabus;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.material.dto.response.MaterialResponse;
import com.careerlabs.lms.api.material.entity.Material;
import com.careerlabs.lms.api.material.entity.MaterialType;
import com.careerlabs.lms.api.material.entity.MaterialVisibility;
import com.careerlabs.lms.api.material.repository.MaterialRepository;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.session.repository.SessionRepository;
import com.careerlabs.lms.api.syllabus.dto.response.SyllabusModuleResponse;
import com.careerlabs.lms.api.syllabus.dto.response.SyllabusTopicResponse;
import com.careerlabs.lms.api.syllabus.entity.SyllabusModule;
import com.careerlabs.lms.api.syllabus.entity.SyllabusTopic;
import com.careerlabs.lms.api.syllabus.repository.SyllabusModuleRepository;
import com.careerlabs.lms.api.syllabus.repository.SyllabusTopicRepository;
import com.careerlabs.lms.api.syllabus.service.impl.SyllabusServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SyllabusContextualMaterialTest {

    @Mock
    private SyllabusModuleRepository moduleRepository;
    @Mock
    private SyllabusTopicRepository topicRepository;
    @Mock
    private SessionRepository sessionRepository;
    @Mock
    private MaterialRepository materialRepository;
    @Mock
    private CourseRepository courseRepository;
    @Mock
    private CourseAccessGuard accessGuard;

    @InjectMocks
    private SyllabusServiceImpl syllabusService;

    private final JwtUserPrincipal adminPrincipal = new JwtUserPrincipal(1L, "admin@test.com", "ROLE_ADMIN");
    private final JwtUserPrincipal studentPrincipal = new JwtUserPrincipal(2L, "student@test.com", "ROLE_STUDENT");

    private Course course;
    private SyllabusModule module;
    private SyllabusTopic topic;

    private void setId(Object target, Long id) {
        ReflectionTestUtils.setField(target, "id", id);
    }

    @BeforeEach
    void setUp() {
        course = new Course();
        setId(course, 100L);
        course.setTitle("Java Course");
        course.setStatus(CourseStatus.PUBLISHED);

        module = new SyllabusModule();
        setId(module, 10L);
        module.setCourse(course);
        module.setTitle("Module 1");
        module.setStatus(CourseStatus.PUBLISHED);
        module.setOrderIndex(0);

        topic = new SyllabusTopic();
        setId(topic, 20L);
        topic.setModule(module);
        topic.setTitle("Topic 1");
        topic.setStatus(CourseStatus.PUBLISHED);
        topic.setOrderIndex(0);
    }

    private Material createMaterial(Long id, Long mId, Long tId, String title, MaterialVisibility visibility) {
        Material m = new Material();
        setId(m, id);
        m.setModuleId(mId);
        m.setTopicId(tId);
        m.setTitle(title);
        m.setType(MaterialType.PDF);
        m.setUrl("/files/" + title + ".pdf");
        m.setVisibility(visibility);
        m.setOrderIndex(0);
        return m;
    }

    @Test
    @DisplayName("Syllabus: Contextual materials attached to module and topic with visibility filtering")
    void testSyllabusContextualMaterialsWithVisibility() {
        when(courseRepository.findById(100L)).thenReturn(Optional.of(course));
        when(moduleRepository.findAllByCourseIdOrderByOrderIndexAsc(100L)).thenReturn(List.of(module));
        when(topicRepository.findAllByModuleIdInOrderByOrderIndexAsc(List.of(10L))).thenReturn(List.of(topic));

        Material mPublished = createMaterial(1L, 10L, null, "Module Published Mat", MaterialVisibility.PUBLISHED);
        Material mDraft = createMaterial(2L, 10L, null, "Module Draft Mat", MaterialVisibility.DRAFT);
        Material tPublished = createMaterial(3L, null, 20L, "Topic Published Mat", MaterialVisibility.PUBLISHED);
        Material tArchived = createMaterial(4L, null, 20L, "Topic Archived Mat", MaterialVisibility.ARCHIVED);

        when(materialRepository.findAllByModuleIdInOrderByOrderIndexAsc(List.of(10L)))
                .thenReturn(List.of(mPublished, mDraft));
        when(materialRepository.findAllByTopicIdInOrderByOrderIndexAsc(List.of(20L)))
                .thenReturn(List.of(tPublished, tArchived));

        // When accessed by Student: only PUBLISHED materials are returned
        when(accessGuard.isAdmin(studentPrincipal)).thenReturn(false);
        List<SyllabusModuleResponse> studentModules = syllabusService.listTree(100L, studentPrincipal);
        assertEquals(1, studentModules.size());
        SyllabusModuleResponse sm = studentModules.get(0);
        assertEquals(1, sm.materials().size());
        assertEquals("Module Published Mat", sm.materials().get(0).title());

        assertEquals(1, sm.topics().size());
        SyllabusTopicResponse st = sm.topics().get(0);
        assertEquals(1, st.materials().size());
        assertEquals("Topic Published Mat", st.materials().get(0).title());

        // When accessed by Admin: all materials (including DRAFT and ARCHIVED) are returned
        when(accessGuard.isAdmin(adminPrincipal)).thenReturn(true);
        List<SyllabusModuleResponse> adminModules = syllabusService.listTree(100L, adminPrincipal);
        assertEquals(1, adminModules.size());
        SyllabusModuleResponse am = adminModules.get(0);
        assertEquals(2, am.materials().size());
        assertEquals(2, am.topics().get(0).materials().size());
    }

    @Test
    @DisplayName("Syllabus: Non-enrolled student denied access")
    void testNonEnrolledStudentDenied() {
        when(courseRepository.findById(100L)).thenReturn(Optional.of(course));
        doThrow(new ResourceNotFoundException("Course not found: 100"))
                .when(accessGuard).requireContentAccess(studentPrincipal, 100L);

        assertThrows(ResourceNotFoundException.class, () -> syllabusService.listTree(100L, studentPrincipal));
    }
}
