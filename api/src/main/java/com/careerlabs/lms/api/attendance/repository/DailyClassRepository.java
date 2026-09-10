package com.careerlabs.lms.api.attendance.repository;

import com.careerlabs.lms.api.attendance.entity.ClassStatus;
import com.careerlabs.lms.api.attendance.entity.DailyClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailyClassRepository extends JpaRepository<DailyClass, Long> {

    List<DailyClass> findByBatchIdOrderByDateDesc(Long batchId);

    List<DailyClass> findByBatchIdAndStatusOrderByDateAsc(Long batchId, ClassStatus status);

    List<DailyClass> findByBatchIdAndStatusOrderByDateDesc(Long batchId, ClassStatus status);

    List<DailyClass> findByStatusOrderByDateAsc(ClassStatus status);

    List<DailyClass> findByStatusAndDateGreaterThanEqualOrderByDateAsc(ClassStatus status, LocalDateTime since);

    List<DailyClass> findByBatchIdAndStatusAndDateGreaterThanEqualOrderByDateAsc(Long batchId, ClassStatus status, LocalDateTime since);

    List<DailyClass> findByBatchIdAndDateBetweenOrderByDateAsc(Long batchId, LocalDateTime startDate, LocalDateTime endDate);

    List<DailyClass> findByBatchIdInAndDateBetweenOrderByDateAsc(java.util.Collection<Long> batchIds, LocalDateTime startDate, LocalDateTime endDate);

    long countByBatchIdAndStatus(Long batchId, ClassStatus status);

    List<DailyClass> findByDateBetweenOrderByDateAsc(LocalDateTime start, LocalDateTime end);

    Optional<DailyClass> findFirstByBatchIdAndStatusAndDateLessThanOrderByDateDesc(Long batchId, ClassStatus status, LocalDateTime date);

    List<DailyClass> findByDateGreaterThanEqualOrderByDateAsc(LocalDateTime since);

    List<DailyClass> findByBatchIdAndDateGreaterThanEqualOrderByDateAsc(Long batchId, LocalDateTime since);

    long countByStatusAndDateLessThanEqual(ClassStatus status, LocalDateTime date);
}

