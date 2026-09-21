package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.quiz.dto.request.CreateInterviewResourceRequest;
import com.careerlabs.lms.api.quiz.dto.request.UpdateInterviewResourceRequest;
import com.careerlabs.lms.api.quiz.dto.response.InterviewResourcePageResponse;
import com.careerlabs.lms.api.quiz.dto.response.InterviewResourceResponse;
import com.careerlabs.lms.api.quiz.entity.InterviewResource;
import com.careerlabs.lms.api.quiz.repository.InterviewResourceRepository;
import com.careerlabs.lms.api.quiz.service.InterviewResourceService;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
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
    public InterviewResourcePageResponse page(String search, String tag, Boolean active, int page, int limit) {
        int safePage = Math.max(page, 1) - 1;
        int safeLimit = limit <= 0 ? 20 : Math.min(limit, 100);
        Page<InterviewResource> result = repository.findAll(buildSpecification(search, tag, active),
                PageRequest.of(safePage, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt")));
        return new InterviewResourcePageResponse(
                result.getContent().stream().map(InterviewResourceResponse::from).toList(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.getNumber() + 1);
    }

    private Specification<InterviewResource> buildSpecification(String search, String tag, Boolean active) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }
            if (tag != null && !tag.isBlank()) {
                predicates.add(cb.equal(root.get("tag"), tag));
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), like),
                        cb.like(cb.lower(root.get("description")), like),
                        cb.like(cb.lower(root.get("url")), like),
                        cb.like(cb.lower(root.get("tag")), like)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
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