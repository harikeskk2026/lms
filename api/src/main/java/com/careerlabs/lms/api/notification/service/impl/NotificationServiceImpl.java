package com.careerlabs.lms.api.notification.service.impl;

import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.notification.dto.response.NotificationResponse;
import com.careerlabs.lms.api.notification.entity.Notification;
import com.careerlabs.lms.api.notification.entity.NotificationType;
import com.careerlabs.lms.api.notification.repository.NotificationRepository;
import com.careerlabs.lms.api.notification.service.NotificationService;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationServiceImpl implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationServiceImpl.class);

    private final NotificationRepository notificationRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;

    public NotificationServiceImpl(NotificationRepository notificationRepository,
                                    StudentRepository studentRepository,
                                    UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.studentRepository = studentRepository;
        this.userRepository = userRepository;
    }

    // ─── Read operations ──────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getForUser(Long userId) {
        return notificationRepository.findTop50ByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(NotificationResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> list(Long userId) {
        return notificationRepository.findAllByUser_IdOrderByCreatedAtDesc(userId).stream()
                .map(NotificationResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public NotificationResponse markRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository
                .findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));
        notification.setRead(true);
        return NotificationResponse.from(notificationRepository.save(notification));
    }

    @Override
    @Transactional
    public int markAllRead(Long userId) {
        return notificationRepository.markAllReadByUserId(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public long countUnread(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    // ─── Creation helpers ─────────────────────────────────────────────────────

    @Override
    @Async
    @Transactional
    public void notifyUser(Long userId, String title, String body, NotificationType type, String link) {
        userRepository.findById(userId).ifPresentOrElse(
                user -> {
                    notificationRepository.save(buildNotification(user, title, body, type, link));
                    log.debug("Notification sent to user {}: {}", userId, title);
                },
                () -> log.warn("notifyUser: user {} not found, notification skipped", userId)
        );
    }

    @Override
    @Async
    @Transactional
    public void notifyBatch(Long batchId, String title, String body, NotificationType type, String link) {
        List<Notification> notifications = studentRepository.findByBatchId(batchId).stream()
                .map(student -> buildNotification(student.getUser(), title, body, type, link))
                .toList();
        if (!notifications.isEmpty()) {
            notificationRepository.saveAll(notifications);
            log.debug("Batch notification sent to {} students in batch {}: {}", notifications.size(), batchId, title);
        }
    }

    @Override
    @Async
    @Transactional
    public void notifyAllStudents(String title, String body, NotificationType type, String link) {
        List<Notification> notifications = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.STUDENT && u.isActive())
                .map(user -> buildNotification(user, title, body, type, link))
                .toList();
        if (!notifications.isEmpty()) {
            notificationRepository.saveAll(notifications);
            log.debug("Global notification sent to {} students: {}", notifications.size(), title);
        }
    }

    @Override
    @Async
    @Transactional
    public void notifyAdmins(String title, String body, NotificationType type, String link) {
        List<Notification> notifications = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ADMIN && u.isActive())
                .map(user -> buildNotification(user, title, body, type, link))
                .toList();
        if (!notifications.isEmpty()) {
            notificationRepository.saveAll(notifications);
            log.debug("Admin notification sent to {} admins: {}", notifications.size(), title);
        }
    }

    @Override
    @Transactional
    public void create(Long userId, NotificationType type, String title, String body, String link) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        notificationRepository.save(buildNotification(user, title, body, type, link));
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private Notification buildNotification(User user, String title, String body,
                                             NotificationType type, String link) {
        Notification n = new Notification();
        n.setUser(user);
        n.setTitle(title);
        n.setBody(body);
        n.setType(type);
        n.setLink(link);
        return n;
    }
}
