package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.quiz.dto.request.CreateInterviewResourceRequest;
import com.careerlabs.lms.api.quiz.dto.request.UpdateInterviewResourceRequest;
import com.careerlabs.lms.api.quiz.dto.response.InterviewResourceResponse;
import com.careerlabs.lms.api.quiz.entity.InterviewResource;
import com.careerlabs.lms.api.quiz.repository.InterviewResourceRepository;
import com.careerlabs.lms.api.quiz.service.InterviewResourceService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class InterviewResourceServiceImpl implements InterviewResourceService {

    private final InterviewResourceRepository repository;

    public InterviewResourceServiceImpl(InterviewResourceRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<InterviewResourceResponse> listActive() {
        return repository.findByActiveTrueOrderByIdAsc().stream()
                .map(InterviewResourceResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<InterviewResourceResponse> listAll(Boolean active) {
        List<InterviewResource> resources = active == null
                ? repository.findAll()
                : repository.findAll().stream().filter(r -> r.isActive() == active).toList();
        return resources.stream()
                .sorted((a, b) -> a.getId().compareTo(b.getId()))
                .map(InterviewResourceResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public InterviewResourceResponse get(Long id) {
        return InterviewResourceResponse.from(findOrThrow(id));
    }

    @Override
    @Transactional
    public InterviewResourceResponse create(CreateInterviewResourceRequest request, Long createdBy) {
        InterviewResource resource = new InterviewResource();
        resource.setCreatedBy(createdBy);
        applyRequest(resource, request.getTitle(), request.getDescription(), request.getUrl(), request.getTag());
        return InterviewResourceResponse.from(repository.save(resource));
    }

    @Override
    @Transactional
    public InterviewResourceResponse update(Long id, UpdateInterviewResourceRequest request) {
        InterviewResource resource = findOrThrow(id);
        applyRequest(resource, request.getTitle(), request.getDescription(), request.getUrl(), request.getTag());
        if (request.getActive() != null) {
            resource.setActive(request.getActive());
        }
        return InterviewResourceResponse.from(repository.save(resource));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        InterviewResource resource = findOrThrow(id);
        repository.delete(resource);
    }

    private InterviewResource findOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Interview resource not found: " + id));
    }

    private void applyRequest(InterviewResource resource, String title, String description, String url, String tag) {
        resource.setTitle(title);
        resource.setDescription(description);
        resource.setUrl(url);
        resource.setTag(tag);
    }
}