package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.quiz.dto.request.CreateAptitudeTipRequest;
import com.careerlabs.lms.api.quiz.dto.request.UpdateAptitudeTipRequest;
import com.careerlabs.lms.api.quiz.dto.response.AptitudeTipResponse;
import com.careerlabs.lms.api.quiz.entity.AptitudeTip;
import com.careerlabs.lms.api.quiz.repository.AptitudeTipRepository;
import com.careerlabs.lms.api.quiz.service.AptitudeTipService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AptitudeTipServiceImpl implements AptitudeTipService {

    private final AptitudeTipRepository repository;

    public AptitudeTipServiceImpl(AptitudeTipRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AptitudeTipResponse> listActive() {
        return repository.findByActiveTrueOrderByIdAsc().stream()
                .map(AptitudeTipResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AptitudeTipResponse> listAll(Boolean active) {
        List<AptitudeTip> tips = active == null
                ? repository.findAll()
                : repository.findAll().stream().filter(t -> t.isActive() == active).toList();
        return tips.stream()
                .sorted((a, b) -> a.getId().compareTo(b.getId()))
                .map(AptitudeTipResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AptitudeTipResponse get(Long id) {
        return AptitudeTipResponse.from(findOrThrow(id));
    }

    @Override
    @Transactional
    public AptitudeTipResponse create(CreateAptitudeTipRequest request, Long createdBy) {
        AptitudeTip tip = new AptitudeTip();
        tip.setCreatedBy(createdBy);
        applyRequest(tip, request.getTopic(), request.getFormula(), request.getExample());
        return AptitudeTipResponse.from(repository.save(tip));
    }

    @Override
    @Transactional
    public AptitudeTipResponse update(Long id, UpdateAptitudeTipRequest request) {
        AptitudeTip tip = findOrThrow(id);
        applyRequest(tip, request.getTopic(), request.getFormula(), request.getExample());
        if (request.getActive() != null) {
            tip.setActive(request.getActive());
        }
        return AptitudeTipResponse.from(repository.save(tip));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        AptitudeTip tip = findOrThrow(id);
        repository.delete(tip);
    }

    private AptitudeTip findOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Aptitude tip not found: " + id));
    }

    private void applyRequest(AptitudeTip tip, String topic, String formula, String example) {
        tip.setTopic(topic);
        tip.setFormula(formula);
        tip.setExample(example);
    }
}