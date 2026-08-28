package com.careerlabs.lms.api.recordedsession.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Points at the private-disk HLS package for a {@link RecordedSession} — never a
 * public URL. One row per session in this phase (single rendition); a future
 * multi-bitrate ladder would key this by rendition instead of being 1:1.
 */
@Entity
@Table(name = "recorded_session_assets")
public class RecordedSessionAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recorded_session_id", nullable = false, unique = true)
    private RecordedSession recordedSession;

    /** Absolute path on disk, under {@code app.secure-video.dir}. */
    @Column(name = "storage_dir", nullable = false)
    private String storageDir;

    @Column(name = "manifest_file_name", nullable = false)
    private String manifestFileName;

    @Column(name = "key_file_name", nullable = false)
    private String keyFileName;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public RecordedSession getRecordedSession() {
        return recordedSession;
    }

    public void setRecordedSession(RecordedSession recordedSession) {
        this.recordedSession = recordedSession;
    }

    public String getStorageDir() {
        return storageDir;
    }

    public void setStorageDir(String storageDir) {
        this.storageDir = storageDir;
    }

    public String getManifestFileName() {
        return manifestFileName;
    }

    public void setManifestFileName(String manifestFileName) {
        this.manifestFileName = manifestFileName;
    }

    public String getKeyFileName() {
        return keyFileName;
    }

    public void setKeyFileName(String keyFileName) {
        this.keyFileName = keyFileName;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public Long getFileSizeBytes() {
        return fileSizeBytes;
    }

    public void setFileSizeBytes(Long fileSizeBytes) {
        this.fileSizeBytes = fileSizeBytes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
