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
import com.careerlabs.lms.api.session.entity.Session;
import com.careerlabs.lms.api.session.entity.SessionType;
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

    private Material createMaterial(Long id, Long mId, Long tId, Long sId, String title, MaterialVisibility visibility) {
        Material m = new Material();
        setId(m, id);
        m.setModuleId(mId);
        m.setTopicId(tId);
        m.setSessionId(sId);
        m.setTitle(title);
        m.setType(MaterialType.PDF);
        m.setUrl("/files/" + title + ".pdf");
        m.setVisibility(visibility);
        m.setOrderIndex(0);
        return m;
    }

    private Session createSession(Long id, SyllabusTopic topic, String title, CourseStatus status) {
        Session s = new Session();
        setId(s, id);
        s.setTopic(topic);
        s.setTitle(title);
        s.setStatus(status);
        s.setType(SessionType.RECORDED);
        s.setOrderIndex(0);
        return s;
    }

    @Test
    @DisplayName("Syllabus: Contextual materials attached to module, topic, and session with visibility filtering")
    void testSyllabusContextualMaterialsWithVisibility() {
        when(courseRepository.findById(100L)).thenReturn(Optional.of(course));
        when(moduleRepository.findAllByCourseIdOrderByOrderIndexAsc(100L)).thenReturn(List.of(module));
        when(topicRepository.findAllByModuleIdInOrderByOrderIndexAsc(List.of(10L))).thenReturn(List.of(topic));

        Session sPublished = createSession(30L, topic, "Session Published", CourseStatus.PUBLISHED);
        Session sDraft = createSession(31L, topic, "Session Draft", CourseStatus.DRAFT);
        when(sessionRepository.findAllByTopicIdInOrderByOrderIndexAsc(List.of(20L)))
                .thenReturn(List.of(sPublished, sDraft));

        Material mPublished = createMaterial(1L, 10L, null, null, "Module Published Mat", MaterialVisibility.PUBLISHED);
        Material mDraft = createMaterial(2L, 10L, null, null, "Module Draft Mat", MaterialVisibility.DRAFT);
        Material tPublished = createMaterial(3L, null, 20L, null, "Topic Published Mat", MaterialVisibility.PUBLISHED);
        Material tArchived = createMaterial(4L, null, 20L, null, "Topic Archived Mat", MaterialVisibility.ARCHIVED);
        Material sPublishedMat = createMaterial(5L, null, null, 30L, "Session Published Mat", MaterialVisibility.PUBLISHED);
        Material sDraftMat = createMaterial(6L, null, null, 30L, "Session Draft Mat", MaterialVisibility.DRAFT);

        when(materialRepository.findAllByModuleIdInOrderByOrderIndexAsc(List.of(10L)))
                .thenReturn(List.of(mPublished, mDraft));
        when(materialRepository.findAllByTopicIdInOrderByOrderIndexAsc(List.of(20L)))
                .thenReturn(List.of(tPublished, tArchived));
        when(materialRepository.findAllBySessionIdInOrderByOrderIndexAsc(List.of(30L, 31L)))
                .thenReturn(List.of(sPublishedMat, sDraftMat));

        // When accessed by Student: only PUBLISHED materials and PUBLISHED sessions are returned
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

        assertEquals(1, st.sessions().size());
        assertEquals("Session Published", st.sessions().get(0).title());
        assertEquals(1, st.sessions().get(0).materials().size());
        assertEquals("Session Published Mat", st.sessions().get(0).materials().get(0).title());

        // When accessed by Admin: all materials (including DRAFT and ARCHIVED) and all sessions are returned
        when(accessGuard.isAdmin(adminPrincipal)).thenReturn(true);
        List<SyllabusModuleResponse> adminModules = syllabusService.listTree(100L, adminPrincipal);
        assertEquals(1, adminModules.size());
        SyllabusModuleResponse am = adminModules.get(0);
        assertEquals(2, am.materials().size());
        assertEquals(2, am.topics().get(0).materials().size());
        assertEquals(2, am.topics().get(0).sessions().size());
        assertEquals(2, am.topics().get(0).sessions().get(0).materials().size());
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
