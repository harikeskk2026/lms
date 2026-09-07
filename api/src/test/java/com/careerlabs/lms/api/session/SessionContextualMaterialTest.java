package com.careerlabs.lms.api.session;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.enrollment.service.CourseAccessGuard;
import com.careerlabs.lms.api.material.entity.Material;
import com.careerlabs.lms.api.material.entity.MaterialType;
import com.careerlabs.lms.api.material.entity.MaterialVisibility;
import com.careerlabs.lms.api.material.repository.MaterialRepository;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.session.dto.response.SessionResponse;
import com.careerlabs.lms.api.session.entity.Session;
import com.careerlabs.lms.api.session.repository.SessionRepository;
import com.careerlabs.lms.api.session.service.impl.SessionServiceImpl;
import com.careerlabs.lms.api.syllabus.entity.SyllabusModule;
import com.careerlabs.lms.api.syllabus.entity.SyllabusTopic;
import com.careerlabs.lms.api.syllabus.repository.SyllabusTopicRepository;
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
class SessionContextualMaterialTest {

    @Mock
    private SessionRepository sessionRepository;
    @Mock
    private SyllabusTopicRepository topicRepository;
    @Mock
    private MaterialRepository materialRepository;
    @Mock
    private CourseAccessGuard accessGuard;

    @InjectMocks
    private SessionServiceImpl sessionService;

    private final JwtUserPrincipal adminPrincipal = new JwtUserPrincipal(1L, "admin@test.com", "ROLE_ADMIN");
    private final JwtUserPrincipal studentPrincipal = new JwtUserPrincipal(2L, "student@test.com", "ROLE_STUDENT");

    private Course course;
    private SyllabusModule module;
    private SyllabusTopic topic;
    private Session session;

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

        topic = new SyllabusTopic();
        setId(topic, 20L);
        topic.setModule(module);
        topic.setTitle("Topic 1");
        topic.setStatus(CourseStatus.PUBLISHED);

        session = new Session();
        setId(session, 30L);
        session.setTopic(topic);
        session.setTitle("Session 1");
        session.setStatus(CourseStatus.PUBLISHED);
        session.setOrderIndex(0);
    }

    private Material createMaterial(Long id, Long sId, String title, MaterialVisibility visibility) {
        Material m = new Material();
        setId(m, id);
        m.setSessionId(sId);
        m.setTitle(title);
        m.setType(MaterialType.PDF);
        m.setUrl("/files/" + title + ".pdf");
        m.setVisibility(visibility);
        m.setOrderIndex(0);
        return m;
    }

    @Test
    @DisplayName("Sessions: Contextual materials attached to session with visibility filtering")
    void testSessionContextualMaterialsWithVisibility() {
        when(topicRepository.findById(20L)).thenReturn(Optional.of(topic));
        when(sessionRepository.findAllByTopicIdOrderByOrderIndexAsc(20L)).thenReturn(List.of(session));

        Material sPublished = createMaterial(1L, 30L, "Session Published Mat", MaterialVisibility.PUBLISHED);
        Material sDraft = createMaterial(2L, 30L, "Session Draft Mat", MaterialVisibility.DRAFT);

        when(materialRepository.findAllBySessionIdInOrderByOrderIndexAsc(List.of(30L)))
                .thenReturn(List.of(sPublished, sDraft));

        // When accessed by Student: only PUBLISHED materials are returned
        when(accessGuard.isAdmin(studentPrincipal)).thenReturn(false);
        List<SessionResponse> studentSessions = sessionService.list(20L, studentPrincipal);
        assertEquals(1, studentSessions.size());
        assertEquals(1, studentSessions.get(0).materials().size());
        assertEquals("Session Published Mat", studentSessions.get(0).materials().get(0).title());

        // When accessed by Admin: both PUBLISHED and DRAFT materials returned
        when(accessGuard.isAdmin(adminPrincipal)).thenReturn(true);
        List<SessionResponse> adminSessions = sessionService.list(20L, adminPrincipal);
        assertEquals(1, adminSessions.size());
        assertEquals(2, adminSessions.get(0).materials().size());
    }

    @Test
    @DisplayName("Sessions: Non-enrolled student denied access")
    void testNonEnrolledStudentDenied() {
        when(topicRepository.findById(20L)).thenReturn(Optional.of(topic));
        doThrow(new ResourceNotFoundException("Course not found: 100"))
                .when(accessGuard).requireContentAccess(studentPrincipal, 100L);

        assertThrows(ResourceNotFoundException.class, () -> sessionService.list(20L, studentPrincipal));
    }
}
