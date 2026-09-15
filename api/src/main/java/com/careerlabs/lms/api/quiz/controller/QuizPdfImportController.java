package com.careerlabs.lms.api.quiz.controller;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.quiz.entity.Quiz;
import com.careerlabs.lms.api.quiz.entity.QuizSourcePdf;
import com.careerlabs.lms.api.quiz.entity.QuizTopic;
import com.careerlabs.lms.api.quiz.importer.ExtractedQuestionDraft;
import com.careerlabs.lms.api.quiz.importer.PdfQuestionExtractor;
import com.careerlabs.lms.api.quiz.importer.PdfQuizExtractionResponse;
import com.careerlabs.lms.api.quiz.repository.QuizRepository;
import com.careerlabs.lms.api.quiz.repository.QuizSourcePdfRepository;
import com.careerlabs.lms.api.quiz.repository.QuizTopicRepository;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * PDF-based quiz question extraction/storage — an additive entry point into the
 * existing quiz/question system. {@code preview} only parses the PDF and returns
 * draft questions; nothing is persisted until the admin reviews them and calls
 * the existing {@code POST /api/admin/questions} / {@code POST /api/admin/quizzes/{id}/questions}
 * endpoints. The source PDF itself is stored separately from the shared
 * {@code /uploads/**} path (which is publicly readable) so it is never exposed
 * to students.
 */
@RestController
@RequestMapping("/api/admin/quizzes")
public class QuizPdfImportController {

    private static final long MAX_PDF_SIZE_BYTES = 25L * 1024 * 1024;

    private final PdfQuestionExtractor pdfQuestionExtractor;
    private final QuizTopicRepository quizTopicRepository;
    private final CourseRepository courseRepository;
    private final QuizRepository quizRepository;
    private final QuizSourcePdfRepository quizSourcePdfRepository;

    public QuizPdfImportController(PdfQuestionExtractor pdfQuestionExtractor,
                                    QuizTopicRepository quizTopicRepository,
                                    CourseRepository courseRepository,
                                    QuizRepository quizRepository,
                                    QuizSourcePdfRepository quizSourcePdfRepository) {
        this.pdfQuestionExtractor = pdfQuestionExtractor;
        this.quizTopicRepository = quizTopicRepository;
        this.courseRepository = courseRepository;
        this.quizRepository = quizRepository;
        this.quizSourcePdfRepository = quizSourcePdfRepository;
    }

    @PostMapping("/pdf-import/preview")
    public ResponseEntity<ApiResponse<PdfQuizExtractionResponse>> preview(@RequestPart("file") MultipartFile file) {
        validatePdf(file);

        PdfQuestionExtractor.ExtractionResult extraction;
        try {
            extraction = pdfQuestionExtractor.extract(file.getBytes());
        } catch (IOException e) {
            throw new BadRequestException("Could not read the uploaded PDF: " + e.getMessage());
        }

        List<QuizTopic> topics = quizTopicRepository.findAllByOrderByNameAsc();
        List<String> globalWarnings = new ArrayList<>(extraction.diagnostics());

        List<ExtractedQuestionDraft> resolved = extraction.questions().stream()
                .map(d -> resolveNames(d, topics))
                .toList();

        return ResponseEntity.ok(ApiResponse.of(
                new PdfQuizExtractionResponse(resolved, resolved.size(), globalWarnings)));
    }

    @PostMapping("/{id}/source-pdf")
    public ResponseEntity<ApiResponse<Void>> uploadSourcePdf(@PathVariable Long id,
                                                              @RequestPart("file") MultipartFile file,
                                                              @AuthenticationPrincipal JwtUserPrincipal principal) throws IOException {
        validatePdf(file);
        Quiz quiz = quizRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quiz not found: " + id));

        QuizSourcePdf sourcePdf = quizSourcePdfRepository.findByQuizId(id).orElseGet(QuizSourcePdf::new);
        sourcePdf.setQuiz(quiz);
        sourcePdf.setOriginalFilename(file.getOriginalFilename());
        sourcePdf.setContentType(file.getContentType());
        sourcePdf.setFileSize(file.getSize());
        sourcePdf.setData(file.getBytes());
        sourcePdf.setUploadedBy(principal.id());
        quizSourcePdfRepository.save(sourcePdf);

        return ResponseEntity.ok(ApiResponse.of("Source PDF saved", null));
    }

    @GetMapping("/{id}/source-pdf")
    public ResponseEntity<byte[]> downloadSourcePdf(@PathVariable Long id) {
        QuizSourcePdf sourcePdf = quizSourcePdfRepository.findByQuizId(id)
                .orElseThrow(() -> new ResourceNotFoundException("No source PDF stored for quiz: " + id));

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + sourcePdf.getOriginalFilename() + "\"")
                .contentLength(sourcePdf.getFileSize())
                .body(sourcePdf.getData());
    }

    private ExtractedQuestionDraft resolveNames(ExtractedQuestionDraft draft, List<QuizTopic> topics) {
        Long topicId = draft.topicName() == null ? null : topics.stream()
                .filter(t -> t.getName().equalsIgnoreCase(draft.topicName().strip()))
                .map(QuizTopic::getId)
                .findFirst()
                .orElse(null);

        Long courseId = draft.courseName() == null ? null : courseRepository
                .findByTitleIgnoreCase(draft.courseName().strip())
                .map(Course::getId)
                .orElse(null);

        return new ExtractedQuestionDraft(
                draft.questionText(), draft.questionType(), draft.answerMode(), draft.difficulty(), draft.points(),
                draft.topicName(), topicId, draft.courseName(), courseId, draft.explanation(), draft.codeSnippet(),
                draft.answerLanguage(), draft.options(), draft.correctAnswerText(), draft.referenceAnswer(),
                draft.warnings());
    }

    private void validatePdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("No file was uploaded");
        }
        if (file.getSize() > MAX_PDF_SIZE_BYTES) {
            throw new BadRequestException("PDF exceeds the maximum allowed size of 25MB");
        }
        String filename = Optional.ofNullable(file.getOriginalFilename()).orElse("").toLowerCase(Locale.ROOT);
        boolean pdfContentType = "application/pdf".equalsIgnoreCase(file.getContentType());
        if (!filename.endsWith(".pdf") && !pdfContentType) {
            throw new BadRequestException("Only PDF files are supported");
        }
    }
}
