package com.careerlabs.lms.api.notification.repository;

import com.careerlabs.lms.api.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /** All notifications for a user, newest first (max 50). */
    List<Notification> findTop50ByUserIdOrderByCreatedAtDesc(Long userId);

    List<Notification> findAllByUser_IdOrderByCreatedAtDesc(Long userId);

    /** Count of unread notifications for a user. */
    long countByUserIdAndReadFalse(Long userId);

    /** Find a single notification that belongs to a specific user. */
    Optional<Notification> findByIdAndUserId(Long id, Long userId);

    Optional<Notification> findByIdAndUser_Id(Long id, Long userId);

    List<Notification> findAllByUser_IdAndReadFalse(Long userId);

    /** Bulk-mark all unread as read for a user. */
    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.user.id = :userId AND n.read = false")
    int markAllReadByUserId(@Param("userId") Long userId);

    void deleteAllByUser_Id(Long userId);
}
