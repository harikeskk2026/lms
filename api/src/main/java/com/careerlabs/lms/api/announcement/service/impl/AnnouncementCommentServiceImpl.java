package com.careerlabs.lms.api.announcement.service.impl;

import com.careerlabs.lms.api.announcement.dto.request.AnnouncementCommentRequest;
import com.careerlabs.lms.api.announcement.dto.response.AnnouncementCommentResponse;
import com.careerlabs.lms.api.announcement.entity.Announcement;
import com.careerlabs.lms.api.announcement.entity.AnnouncementComment;
import com.careerlabs.lms.api.announcement.repository.AnnouncementCommentRepository;
import com.careerlabs.lms.api.announcement.repository.AnnouncementRepository;
import com.careerlabs.lms.api.announcement.service.AnnouncementCommentService;
import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AnnouncementCommentServiceImpl implements AnnouncementCommentService {

    private final AnnouncementCommentRepository commentRepository;
    private final AnnouncementRepository announcementRepository;
    private final UserRepository userRepository;

    public AnnouncementCommentServiceImpl(AnnouncementCommentRepository commentRepository,
                                           AnnouncementRepository announcementRepository,
                                           UserRepository userRepository) {
        this.commentRepository = commentRepository;
        this.announcementRepository = announcementRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AnnouncementCommentResponse> list(Long announcementId) {
        return commentRepository.findByAnnouncementIdOrderByCreatedAtAsc(announcementId).stream()
                .map(AnnouncementCommentResponse::from)
                .toList();
    }

    @Override
    @Transactional
    public AnnouncementCommentResponse add(Long announcementId, AnnouncementCommentRequest request, Long userId) {
        Announcement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found: " + announcementId));

        if (!announcement.isAllowComments()) {
            throw new BadRequestException("Comments are disabled for this announcement");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        AnnouncementComment comment = new AnnouncementComment();
        comment.setAnnouncement(announcement);
        comment.setUser(user);
        comment.setContent(request.content());

        if (request.parentCommentId() != null) {
            AnnouncementComment parent = commentRepository.findById(request.parentCommentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Comment not found: " + request.parentCommentId()));
            if (!parent.getAnnouncement().getId().equals(announcementId)) {
                throw new BadRequestException("Parent comment does not belong to this announcement");
            }
            comment.setParentComment(parent);
        }

        return AnnouncementCommentResponse.from(commentRepository.save(comment));
    }

    @Override
    @Transactional
    public void delete(Long commentId) {
        if (!commentRepository.existsById(commentId)) {
            throw new ResourceNotFoundException("Comment not found: " + commentId);
        }
        commentRepository.clearParentCommentIn(List.of(commentId));
        commentRepository.deleteById(commentId);
    }
}
