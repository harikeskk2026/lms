package com.careerlabs.lms.api.quiz.service.impl;

import com.careerlabs.lms.api.quiz.dto.request.CreateQuizTopicRequest;
import com.careerlabs.lms.api.quiz.dto.response.QuizTopicResponse;
import com.careerlabs.lms.api.quiz.entity.QuizTopic;
import com.careerlabs.lms.api.quiz.repository.QuizTopicRepository;
import com.careerlabs.lms.api.quiz.service.QuizTopicService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class QuizTopicServiceImpl implements QuizTopicService {

    private final QuizTopicRepository quizTopicRepository;

    public QuizTopicServiceImpl(QuizTopicRepository quizTopicRepository) {
        this.quizTopicRepository = quizTopicRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<QuizTopicResponse> list() {
        return quizTopicRepository.findAllByOrderByNameAsc().stream()
                .map(QuizTopicResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public QuizTopicResponse create(CreateQuizTopicRequest request) {
        QuizTopic topic = new QuizTopic();
        topic.setName(request.getName());
        topic.setDescription(request.getDescription());
        topic.setParentId(request.getParentId());

        return QuizTopicResponse.from(quizTopicRepository.save(topic));
    }
}
