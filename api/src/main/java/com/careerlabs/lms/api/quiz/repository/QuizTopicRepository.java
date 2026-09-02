package com.careerlabs.lms.api.quiz.repository;

import com.careerlabs.lms.api.quiz.entity.QuizTopic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuizTopicRepository extends JpaRepository<QuizTopic, Long> {

    List<QuizTopic> findAllByOrderByNameAsc();
}
