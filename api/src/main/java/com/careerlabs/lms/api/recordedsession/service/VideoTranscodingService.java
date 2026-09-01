package com.careerlabs.lms.api.recordedsession.service;

import com.careerlabs.lms.api.recordedsession.entity.RecordedSession;
import com.careerlabs.lms.api.recordedsession.entity.RecordedSessionAsset;
import com.careerlabs.lms.api.recordedsession.entity.RecordedSessionStatus;
import com.careerlabs.lms.api.recordedsession.repository.RecordedSessionAssetRepository;
import com.careerlabs.lms.api.recordedsession.repository.RecordedSessionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

/**
 * Packages an uploaded video into an adaptive, AES-128-encrypted HLS ladder via
 * FFmpeg, run in the background so the upload request returns immediately. This
 * is real content-key encryption (not "hide the URL") — the generated .m3u8's
 * EXT-X-KEY line points back at our own token-gated /stream/key endpoint, never
 * at a bare file path.
 *
 * A separate FFmpeg pass runs per rendition (simpler and more robust to reason
 * about than a single multi-output -var_stream_map invocation), all sharing one
 * AES key so a single authorized /stream/key request covers every rendition.
 * Renditions taller than the source are skipped — this never upscales.
 */
@Service
public class VideoTranscodingService {

    private static final Logger log = LoggerFactory.getLogger(VideoTranscodingService.class);
    private static final int STDERR_TAIL_LINES = 40;

    /** label, target height, video bitrate (kbps), audio bitrate (kbps). */
    private record Rendition(String label, int height, int videoKbps, int audioKbps) {
        int bandwidthBps() {
            return (videoKbps + audioKbps) * 1000;
        }
    }

    private static final List<Rendition> LADDER = List.of(
            new Rendition("360p", 360, 800, 96),
            new Rendition("480p", 480, 1400, 128),
            new Rendition("720p", 720, 2800, 128),
            new Rendition("1080p", 1080, 5000, 192)
    );

    private final RecordedSessionRepository recordedSessionRepository;
    private final RecordedSessionAssetRepository recordedSessionAssetRepository;
    private final SecureVideoStorageService storageService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public VideoTranscodingService(RecordedSessionRepository recordedSessionRepository,
                                    RecordedSessionAssetRepository recordedSessionAssetRepository,
                                    SecureVideoStorageService storageService) {
        this.recordedSessionRepository = recordedSessionRepository;
        this.recordedSessionAssetRepository = recordedSessionAssetRepository;
        this.storageService = storageService;
    }

    @Async
    public void transcodeAsync(Long recordedSessionId, Path sourceFile) {
        try {
            Path dir = sourceFile.getParent();
            Path keyFile = dir.resolve("video.key");
            Path keyInfoFile = dir.resolve("enc.keyinfo");
            String manifestFileName = "master.m3u8";
            Path manifestPath = dir.resolve(manifestFileName);

            writeRandomKey(keyFile);
            // Line 1 is a placeholder — the stream controller rewrites the EXT-X-KEY
            // URI at serve time to include the caller's current playback token.
            Files.writeString(keyInfoFile, "key\n" + keyFile.toAbsolutePath() + "\n", StandardCharsets.UTF_8);

            int[] sourceDimensions = probeVideoDimensions(sourceFile);
            List<Rendition> renditions = selectRenditions(sourceDimensions);

            for (Rendition rendition : renditions) {
                runFfmpegForRendition(sourceFile, dir, keyInfoFile, rendition);
            }
            writeMasterPlaylist(manifestPath, renditions, sourceDimensions);

            Integer durationSeconds = probeDurationSeconds(sourceFile);
            long fileSizeBytes = sumSegmentSizes(dir);

            saveAsset(recordedSessionId, dir, manifestFileName, keyFile.getFileName().toString(), durationSeconds, fileSizeBytes);
            Files.deleteIfExists(sourceFile);
        } catch (Exception e) {
            log.error("Transcoding failed for recorded session {}", recordedSessionId, e);
            markFailed(recordedSessionId, e.getMessage());
        }
    }

    /** Never upscales: a tier is skipped if the source is meaningfully shorter than it. Falls back to 720p alone if the source resolution couldn't be probed. */
    private List<Rendition> selectRenditions(int[] sourceDimensions) {
        if (sourceDimensions == null) {
            return List.of(LADDER.get(2));
        }
        int sourceHeight = sourceDimensions[1];
        List<Rendition> selected = new ArrayList<>();
        for (Rendition rendition : LADDER) {
            if (sourceHeight >= rendition.height() * 0.9) {
                selected.add(rendition);
            }
        }
        return selected.isEmpty() ? List.of(LADDER.get(0)) : selected;
    }

    private void writeRandomKey(Path keyFile) throws IOException {
        byte[] key = new byte[16];
        new SecureRandom().nextBytes(key);
        Files.write(keyFile, key);
    }

    private void runFfmpegForRendition(Path source, Path outDir, Path keyInfoFile, Rendition rendition)
            throws IOException, InterruptedException {
        Path playlistPath = outDir.resolve(rendition.label() + ".m3u8");
        List<String> command = List.of(
                "ffmpeg", "-y",
                "-i", source.toAbsolutePath().toString(),
                "-vf", "scale=-2:" + rendition.height(),
                "-c:v", "libx264", "-preset", "veryfast", "-profile:v", "main",
                "-b:v", rendition.videoKbps() + "k", "-maxrate", rendition.videoKbps() + "k",
                "-bufsize", (rendition.videoKbps() * 2) + "k",
                "-c:a", "aac", "-b:a", rendition.audioKbps() + "k", "-ac", "2",
                "-hls_time", "6",
                "-hls_playlist_type", "vod",
                "-hls_key_info_file", keyInfoFile.toAbsolutePath().toString(),
                "-hls_segment_filename", outDir.resolve(rendition.label() + "_segment%03d.ts").toAbsolutePath().toString(),
                playlistPath.toAbsolutePath().toString()
        );
        runProcess(command, "FFmpeg (" + rendition.label() + ")");
    }

    private void writeMasterPlaylist(Path manifestPath, List<Rendition> renditions, int[] sourceDimensions) throws IOException {
        StringBuilder sb = new StringBuilder("#EXTM3U\n#EXT-X-VERSION:3\n");
        for (Rendition rendition : renditions) {
            int width = scaledWidth(sourceDimensions, rendition.height());
            sb.append("#EXT-X-STREAM-INF:BANDWIDTH=").append(rendition.bandwidthBps())
                    .append(",RESOLUTION=").append(width).append('x').append(rendition.height())
                    .append('\n')
                    .append(rendition.label()).append(".m3u8\n");
        }
        Files.writeString(manifestPath, sb.toString(), StandardCharsets.UTF_8);
    }

    private int scaledWidth(int[] sourceDimensions, int targetHeight) {
        if (sourceDimensions == null) return (targetHeight * 16) / 9;
        double aspect = (double) sourceDimensions[0] / sourceDimensions[1];
        int width = (int) Math.round(targetHeight * aspect);
        return width % 2 == 0 ? width : width + 1;
    }

    private void runProcess(List<String> command, String label) throws IOException, InterruptedException {
        ProcessBuilder builder = new ProcessBuilder(command);
        builder.redirectErrorStream(true);
        Process process = builder.start();

        Deque<String> tail = new ArrayDeque<>();
        try (InputStream in = process.getInputStream()) {
            byte[] buf = new byte[8192];
            StringBuilder lineBuf = new StringBuilder();
            int read;
            while ((read = in.read(buf)) != -1) {
                lineBuf.append(new String(buf, 0, read, StandardCharsets.UTF_8));
                int newlineIdx;
                while ((newlineIdx = lineBuf.indexOf("\n")) >= 0) {
                    String line = lineBuf.substring(0, newlineIdx);
                    lineBuf.delete(0, newlineIdx + 1);
                    if (tail.size() >= STDERR_TAIL_LINES) tail.removeFirst();
                    tail.addLast(line);
                }
            }
        }

        boolean finished = process.waitFor(30, java.util.concurrent.TimeUnit.MINUTES);
        if (!finished) {
            process.destroyForcibly();
            throw new IOException(label + " timed out after 30 minutes");
        }
        if (process.exitValue() != 0) {
            throw new IOException(label + " exited with code " + process.exitValue() + ":\n" + String.join("\n", tail));
        }
    }

    private Integer probeDurationSeconds(Path source) {
        try {
            List<String> command = List.of("ffprobe", "-v", "quiet", "-print_format", "json", "-show_format",
                    source.toAbsolutePath().toString());
            Process process = new ProcessBuilder(command).start();
            String output;
            try (InputStream in = process.getInputStream()) {
                output = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            }
            process.waitFor(1, java.util.concurrent.TimeUnit.MINUTES);

            JsonNode root = objectMapper.readTree(output);
            JsonNode durationNode = root.path("format").path("duration");
            if (durationNode.isMissingNode()) return null;
            return (int) Math.round(Double.parseDouble(durationNode.asText()));
        } catch (Exception e) {
            log.warn("Could not probe video duration: {}", e.getMessage());
            return null;
        }
    }

    /** Returns [width, height], or null if the source resolution couldn't be probed. */
    private int[] probeVideoDimensions(Path source) {
        try {
            List<String> command = List.of("ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams",
                    "-select_streams", "v:0", source.toAbsolutePath().toString());
            Process process = new ProcessBuilder(command).start();
            String output;
            try (InputStream in = process.getInputStream()) {
                output = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            }
            process.waitFor(1, java.util.concurrent.TimeUnit.MINUTES);

            JsonNode stream = objectMapper.readTree(output).path("streams").path(0);
            int width = stream.path("width").asInt(-1);
            int height = stream.path("height").asInt(-1);
            if (width <= 0 || height <= 0) return null;
            return new int[]{width, height};
        } catch (Exception e) {
            log.warn("Could not probe video dimensions: {}", e.getMessage());
            return null;
        }
    }

    private long sumSegmentSizes(Path dir) throws IOException {
        try (var stream = Files.list(dir)) {
            return stream.filter(p -> p.getFileName().toString().endsWith(".ts"))
                    .mapToLong(p -> {
                        try {
                            return Files.size(p);
                        } catch (IOException e) {
                            return 0L;
                        }
                    })
                    .sum();
        }
    }

    // Not @Transactional: this is called via self-invocation from transcodeAsync,
    // which bypasses the Spring proxy anyway. Each repository .save() below is
    // already individually transactional (Spring Data JPA's own repository proxy),
    // which is sufficient here — the two writes don't need to be one atomic unit.
    private void saveAsset(Long recordedSessionId, Path dir, String manifestFileName, String keyFileName,
                            Integer durationSeconds, long fileSizeBytes) {
        RecordedSession session = recordedSessionRepository.findById(recordedSessionId).orElseThrow();

        RecordedSessionAsset asset = recordedSessionAssetRepository.findByRecordedSessionId(recordedSessionId)
                .orElseGet(RecordedSessionAsset::new);
        asset.setRecordedSession(session);
        asset.setStorageDir(dir.toAbsolutePath().toString());
        asset.setManifestFileName(manifestFileName);
        asset.setKeyFileName(keyFileName);
        asset.setDurationSeconds(durationSeconds);
        asset.setFileSizeBytes(fileSizeBytes);
        recordedSessionAssetRepository.save(asset);

        session.setStatus(RecordedSessionStatus.READY);
        if (durationSeconds != null) {
            session.setDurationSeconds(durationSeconds);
        }
        session.setProcessingError(null);
        recordedSessionRepository.save(session);
    }

    private void markFailed(Long recordedSessionId, String errorMessage) {
        recordedSessionRepository.findById(recordedSessionId).ifPresent(session -> {
            session.setStatus(RecordedSessionStatus.FAILED);
            session.setProcessingError(errorMessage != null ? errorMessage : "Unknown transcoding error");
            recordedSessionRepository.save(session);
        });
    }
}
