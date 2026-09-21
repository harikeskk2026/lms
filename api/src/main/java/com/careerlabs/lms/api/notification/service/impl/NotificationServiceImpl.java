package com.careerlabs.lms.api.notification.service.impl;

import com.careerlabs.lms.api.common.exception.BadRequestException;
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

import com.careerlabs.lms.api.enrollment.repository.EnrollmentRepository;

@Service
public class NotificationServiceImpl implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationServiceImpl.class);

    private final NotificationRepository notificationRepository;
    private final StudentRepository studentRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;

    public NotificationServiceImpl(NotificationRepository notificationRepository,
                                    StudentRepository studentRepository,
                                    EnrollmentRepository enrollmentRepository,
                                    UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
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
        return list(userId, null, null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> list(Long userId, String category, String search, Boolean unreadOnly) {
        List<String> keywords = parseCategory(category);
        String searchLower = (search != null && !search.isBlank()) ? search.trim().toLowerCase() : null;
        boolean onlyUnread = Boolean.TRUE.equals(unreadOnly);
        return notificationRepository.findAllByUser_IdOrderByCreatedAtDesc(userId).stream()
                .filter(n -> !onlyUnread || !n.isRead())
                .filter(n -> keywords == null || containsAny(lower(n.getTitle()), keywords))
                .filter(n -> searchLower == null
                        || contains(lower(n.getTitle()), searchLower)
                        || contains(lower(n.getBody()), searchLower))
                .map(NotificationResponse::from)
                .toList();
    }

    /**
     * NOTE: the Notification entity has no content-category field (its
     * {@code type} is severity: INFO/SUCCESS/WARNING/URGENT...), so the page's
     * keyword buckets are mirrored here on the title, case-insensitively —
     * identical to the client's old {@code filterByCategory}.
     */
    private static List<String> parseCategory(String category) {
        if (category == null || category.isBlank() || category.equalsIgnoreCase("ALL")) {
            return null;
        }
        return switch (category.trim().toUpperCase()) {
            case "ASSIGNMENTS" -> List.of("assignment");
            case "QUIZZES" -> List.of("quiz");
            case "PLACEMENT" -> List.of("placement", "interview", "mock");
            case "ANNOUNCEMENTS" -> List.of("announcement", "batch", "class");
            default -> throw new BadRequestException(
                    "Invalid notification category: " + category
                            + ". Allowed values: ASSIGNMENTS, QUIZZES, PLACEMENT, ANNOUNCEMENTS");
        };
    }

    private static String lower(String value) {
        return value != null ? value.toLowerCase() : "";
    }

    private static boolean contains(String haystack, String needle) {
        return haystack.contains(needle);
    }

    private static boolean containsAny(String haystack, List<String> needles) {
        for (String needle : needles) {
            if (haystack.contains(needle)) {
                return true;
            }
        }
        return false;
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
        List<Notification> notifications = enrollmentRepository.findActiveStudentsByBatchId(batchId).stream()
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
                .filter(u -> (u.getRole() == Role.ADMIN || u.getRole() == Role.SUPERADMIN || u.getRole() == Role.TRAINER) && u.isActive())
                .map(user -> buildNotification(user, title, body, type, link))
                .toList();
        if (!notifications.isEmpty()) {
            notificationRepository.saveAll(notifications);
            log.debug("Staff notification sent to {} recipients: {}", notifications.size(), title);
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
