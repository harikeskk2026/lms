package com.careerlabs.lms.api.announcement.service.impl;

import com.careerlabs.lms.api.announcement.dto.request.AnnouncementTemplateRequest;
import com.careerlabs.lms.api.announcement.dto.request.ApplyTemplateRequest;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementTemplateResponse;
import com.careerlabs.lms.api.announcement.dto.response.ResolvedTemplateResponse;
import com.careerlabs.lms.api.announcement.entity.AnnouncementCategory;
import com.careerlabs.lms.api.announcement.entity.AnnouncementPriority;
import com.careerlabs.lms.api.announcement.entity.AnnouncementTemplate;
import com.careerlabs.lms.api.announcement.repository.AnnouncementTemplateRepository;
import com.careerlabs.lms.api.announcement.service.AnnouncementPlaceholderResolver;
import com.careerlabs.lms.api.announcement.service.AnnouncementTemplateService;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AnnouncementTemplateServiceImpl implements AnnouncementTemplateService {

    private final AnnouncementTemplateRepository templateRepository;
    private final UserRepository userRepository;
    private final AnnouncementPlaceholderResolver placeholderResolver;

    public AnnouncementTemplateServiceImpl(AnnouncementTemplateRepository templateRepository,
                                            UserRepository userRepository,
                                            AnnouncementPlaceholderResolver placeholderResolver) {
        this.templateRepository = templateRepository;
        this.userRepository = userRepository;
        this.placeholderResolver = placeholderResolver;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AnnouncementTemplateResponse> list() {
        return templateRepository.findAllByOrderByNameAsc().stream()
                .map(AnnouncementTemplateResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public AnnouncementTemplateResponse create(AnnouncementTemplateRequest request, Long createdByUserId) {
        User createdBy = userRepository.findById(createdByUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + createdByUserId));

        AnnouncementTemplate template = new AnnouncementTemplate();
        template.setCreatedBy(createdBy);
        applyRequest(template, request);

        return AnnouncementTemplateResponse.from(templateRepository.save(template));
    }

    @Override
    @Transactional
    public AnnouncementTemplateResponse update(Long id, AnnouncementTemplateRequest request) {
        AnnouncementTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found: " + id));
        applyRequest(template, request);
        return AnnouncementTemplateResponse.from(templateRepository.save(template));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!templateRepository.existsById(id)) {
            throw new ResourceNotFoundException("Template not found: " + id);
        }
        templateRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public ResolvedTemplateResponse apply(ApplyTemplateRequest request) {
        AnnouncementTemplate template = templateRepository.findById(request.templateId())
                .orElseThrow(() -> new ResourceNotFoundException("Template not found: " + request.templateId()));

        String title = placeholderResolver.resolve(template.getTitleTemplate(), request.variables());
        String body = placeholderResolver.resolve(template.getContentTemplate(), request.variables());

        return new ResolvedTemplateResponse(title, body, template.getCategory(), template.getPriority(),
                template.isRequiresAcknowledgment());
    }

    private void applyRequest(AnnouncementTemplate template, AnnouncementTemplateRequest request) {
        template.setName(request.name());
        template.setCategory(request.category() != null ? request.category() : AnnouncementCategory.GENERAL);
        template.setTitleTemplate(request.titleTemplate());
        template.setContentTemplate(request.contentTemplate());
        template.setPriority(request.priority() != null ? request.priority() : AnnouncementPriority.NORMAL);
        template.setRequiresAcknowledgment(request.requiresAcknowledgment());
    }
}
