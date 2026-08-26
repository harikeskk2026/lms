package com.careerlabs.lms.api.quiz.repository;

import com.careerlabs.lms.api.quiz.entity.DailyChallenge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface DailyChallengeRepository extends JpaRepository<DailyChallenge, Long> {

    Optional<DailyChallenge> findByChallengeDate(LocalDate challengeDate);
}
