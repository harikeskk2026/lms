package com.careerlabs.lms.api.syllabus.service;

import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.common.dto.request.ReorderRequest;
import com.careerlabs.lms.api.syllabus.dto.request.SyllabusModuleRequest;
import com.careerlabs.lms.api.syllabus.dto.request.SyllabusTopicRequest;
import com.careerlabs.lms.api.syllabus.dto.response.SyllabusModuleResponse;
import com.careerlabs.lms.api.syllabus.dto.response.SyllabusTopicResponse;

import java.util.List;

public interface SyllabusService {

    List<SyllabusModuleResponse> listTree(Long courseId, JwtUserPrincipal principal);

    SyllabusModuleResponse createModule(Long courseId, SyllabusModuleRequest request);

    SyllabusModuleResponse updateModule(Long id, SyllabusModuleRequest request);

    void deleteModule(Long id);

    List<SyllabusModuleResponse> reorderModules(Long courseId, ReorderRequest request);

    SyllabusTopicResponse createTopic(Long moduleId, SyllabusTopicRequest request);

    SyllabusTopicResponse updateTopic(Long id, SyllabusTopicRequest request);

    void deleteTopic(Long id);

    List<SyllabusTopicResponse> reorderTopics(Long moduleId, ReorderRequest request);

    List<SyllabusModuleResponse> updateSyllabusStatus(Long courseId, CourseStatus status, boolean includeTopics);
}
