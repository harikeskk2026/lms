package com.careerlabs.lms.api.announcement.repository;

import com.careerlabs.lms.api.announcement.entity.AnnouncementTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AnnouncementTemplateRepository extends JpaRepository<AnnouncementTemplate, Long> {

    List<AnnouncementTemplate> findAllByOrderByNameAsc();
}
