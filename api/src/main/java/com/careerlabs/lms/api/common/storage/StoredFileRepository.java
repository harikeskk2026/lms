package com.careerlabs.lms.api.common.storage;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StoredFileRepository extends JpaRepository<StoredFileEntity, Long> {

    Optional<StoredFileEntity> findByPath(String path);

    boolean existsByPath(String path);

    void deleteByPath(String path);
}
