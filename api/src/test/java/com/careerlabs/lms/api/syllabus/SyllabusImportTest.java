package com.careerlabs.lms.api.syllabus;

import com.careerlabs.lms.api.LmsApiApplication;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.entity.Level;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.syllabus.importer.SyllabusFileParser;
import com.careerlabs.lms.api.syllabus.importer.SyllabusImportPreviewResponse;
import com.careerlabs.lms.api.syllabus.importer.SyllabusImportResponse;
import com.careerlabs.lms.api.syllabus.importer.SyllabusImportService;
import com.careerlabs.lms.api.syllabus.repository.SyllabusModuleRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = LmsApiApplication.class)
@ActiveProfiles("test")
@Transactional
public class SyllabusImportTest {

    @Autowired SyllabusImportService importService;
    @Autowired SyllabusFileParser parser;
    @Autowired CourseRepository courseRepository;
    @Autowired SyllabusModuleRepository moduleRepository;

    private Course course;

    @BeforeEach
    void setup() {
        course = new Course();
        course.setTitle("Test Course " + System.nanoTime());
        course.setDescription("desc");
        course.setLevel(Level.BEGINNER);
        course.setDuration("4 Weeks");
        course.setStatus(CourseStatus.PUBLISHED);
        course = courseRepository.save(course);
    }

    private MockMultipartFile csvFile(String csv) {
        return new MockMultipartFile("file", "syllabus.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));
    }

    private MockMultipartFile excelFile(String[][] rows) throws Exception {
        Workbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet("Syllabus");
        String[] headers = {"Module","Module Description","Module Duration","Duration Unit","Module Status","Topic","Topic Description","Topic Duration (Hours)","Topic Status"};
        Row h = sheet.createRow(0);
        for (int i=0;i<headers.length;i++) h.createCell(i).setCellValue(headers[i]);
        for (int r=0;r<rows.length;r++) {
            Row row = sheet.createRow(r+1);
            for (int c=0;c<rows[r].length;c++) row.createCell(c).setCellValue(rows[r][c]);
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        wb.write(out);
        wb.close();
        return new MockMultipartFile("file", "syllabus.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", out.toByteArray());
    }

    @Test
    void validCsvImportPreviewAndImport() {
        String csv = "Module,Module Description,Module Duration,Duration Unit,Module Status,Topic,Topic Description,Topic Duration (Hours),Topic Status\n" +
                "Module 1,Intro,10,HOURS,PUBLISHED,HTML Basics,Intro,3,PUBLISHED\n" +
                "Module 1,Intro,10,HOURS,PUBLISHED,HTML Tags,Tags,4,PUBLISHED\n" +
                "Module 2,CSS,2,DAYS,DRAFT,CSS Basics,Intro,8,DRAFT\n";
        MockMultipartFile file = csvFile(csv);
        SyllabusImportPreviewResponse preview = importService.preview(course.getId(), file);
        assertTrue(preview.isValid());
        assertEquals(2, preview.getTotalModules());
        assertEquals(3, preview.getTotalTopics());
        assertTrue(preview.getErrors().isEmpty());

        SyllabusImportResponse resp = importService.importSyllabus(course.getId(), file);
        assertEquals(2, resp.getImportedModulesCount());
        assertEquals(3, resp.getImportedTopicsCount());
        assertEquals(2, moduleRepository.countByCourseId(course.getId()));
    }

    @Test
    void previewDoesNotCreateRecords() {
        String csv = "Module,Module Description,Module Duration,Duration Unit,Module Status,Topic,Topic Description,Topic Duration (Hours),Topic Status\n" +
                "Module 1,Intro,10,HOURS,PUBLISHED,HTML Basics,Intro,3,PUBLISHED\n";
        MockMultipartFile file = csvFile(csv);
        long before = moduleRepository.countByCourseId(course.getId());
        importService.preview(course.getId(), file);
        assertEquals(before, moduleRepository.countByCourseId(course.getId()));
    }

    @Test
    void invalidDuplicateTopic() {
        String csv = "Module,Module Description,Module Duration,Duration Unit,Module Status,Topic,Topic Description,Topic Duration (Hours),Topic Status\n" +
                "Module 1,Intro,10,HOURS,PUBLISHED,HTML Basics,Intro,3,PUBLISHED\n" +
                "Module 1,Intro,10,HOURS,PUBLISHED,HTML Basics,Intro,3,PUBLISHED\n";
        MockMultipartFile file = csvFile(csv);
        SyllabusImportPreviewResponse preview = importService.preview(course.getId(), file);
        assertFalse(preview.isValid());
        assertTrue(preview.getErrors().stream().anyMatch(e -> e.getMessage().contains("Duplicate")));
    }

    @Test
    void invalidTopicDurationExceedsModule() {
        String csv = "Module,Module Description,Module Duration,Duration Unit,Module Status,Topic,Topic Description,Topic Duration (Hours),Topic Status\n" +
                "Module 1,Intro,5,HOURS,PUBLISHED,HTML Basics,Intro,10,PUBLISHED\n";
        MockMultipartFile file = csvFile(csv);
        SyllabusImportPreviewResponse preview = importService.preview(course.getId(), file);
        assertFalse(preview.isValid());
    }

    @Test
    void invalidTotalDurationExceeds() {
        String csv = "Module,Module Description,Module Duration,Duration Unit,Module Status,Topic,Topic Description,Topic Duration (Hours),Topic Status\n" +
                "Module 1,Intro,10,HOURS,PUBLISHED,Topic A,,5,PUBLISHED\n" +
                "Module 1,Intro,10,HOURS,PUBLISHED,Topic B,,4,PUBLISHED\n" +
                "Module 1,Intro,10,HOURS,PUBLISHED,Topic C,,4,PUBLISHED\n";
        MockMultipartFile file = csvFile(csv);
        SyllabusImportPreviewResponse preview = importService.preview(course.getId(), file);
        assertFalse(preview.isValid());
        assertTrue(preview.getErrors().stream().anyMatch(e -> e.getMessage().contains("Total topic duration")));
    }

    @Test
    void conflictingModuleMetadata() {
        String csv = "Module,Module Description,Module Duration,Duration Unit,Module Status,Topic,Topic Description,Topic Duration (Hours),Topic Status\n" +
                "Module 1,Intro,10,HOURS,PUBLISHED,Topic A,,3,PUBLISHED\n" +
                "Module 1,Intro,20,HOURS,PUBLISHED,Topic B,,3,PUBLISHED\n";
        MockMultipartFile file = csvFile(csv);
        SyllabusImportPreviewResponse preview = importService.preview(course.getId(), file);
        assertFalse(preview.isValid());
        assertTrue(preview.getErrors().stream().anyMatch(e -> e.getField().equals("Module Duration")));
    }

    @Test
    void missingRequiredHeaders() {
        String csv = "Module Description,Topic Description\n" +
                "Intro,Intro\n";
        MockMultipartFile file = csvFile(csv);
        assertThrows(Exception.class, () -> importService.preview(course.getId(), file));
    }

    @Test
    void unsupportedFormat() {
        MockMultipartFile file = new MockMultipartFile("file", "test.txt", "text/plain", "hello".getBytes());
        assertThrows(Exception.class, () -> importService.preview(course.getId(), file));
    }

    @Test
    void fileLargerThan5MB() {
        byte[] large = new byte[6 * 1024 * 1024];
        MockMultipartFile file = new MockMultipartFile("file", "big.csv", "text/csv", large);
        assertThrows(Exception.class, () -> parser.parse(file));
    }

    @Test
    void validXlsxImport() throws Exception {
        String[][] rows = {
                {"Module 1","Intro","10","HOURS","PUBLISHED","HTML Basics","Intro","3","PUBLISHED"},
                {"Module 1","Intro","10","HOURS","PUBLISHED","HTML Tags","Tags","4","PUBLISHED"},
                {"Module 2","CSS","2","DAYS","DRAFT","CSS Basics","Intro","8","DRAFT"},
        };
        MockMultipartFile file = excelFile(rows);
        SyllabusImportPreviewResponse preview = importService.preview(course.getId(), file);
        assertTrue(preview.isValid());
        SyllabusImportResponse resp = importService.importSyllabus(course.getId(), file);
        assertEquals(2, resp.getImportedModulesCount());
    }

    @Test
    void moduleOrderingPreservedAndContinuation() {
        // create existing module
        String csvExisting = "Module,Module Description,Module Duration,Duration Unit,Module Status,Topic,Topic Description,Topic Duration (Hours),Topic Status\n" +
                "Existing Module,desc,5,HOURS,PUBLISHED,Topic1,,2,PUBLISHED\n";
        importService.importSyllabus(course.getId(), csvFile(csvExisting));
        long firstCount = moduleRepository.countByCourseId(course.getId());
        assertEquals(1, firstCount);

        String csv2 = "Module,Module Description,Module Duration,Duration Unit,Module Status,Topic,Topic Description,Topic Duration (Hours),Topic Status\n" +
                "Module A,desc,5,HOURS,PUBLISHED,Topic A,,2,PUBLISHED\n" +
                "Module B,desc,5,HOURS,PUBLISHED,Topic B,,2,PUBLISHED\n";
        SyllabusImportResponse resp = importService.importSyllabus(course.getId(), csvFile(csv2));
        assertEquals(3, moduleRepository.countByCourseId(course.getId()));
        // Check order indices
        var modules = moduleRepository.findAllByCourseIdOrderByOrderIndexAsc(course.getId());
        assertEquals("Existing Module", modules.get(0).getTitle());
        assertEquals(0, modules.get(0).getOrderIndex());
        assertEquals("Module A", modules.get(1).getTitle());
        assertEquals(1, modules.get(1).getOrderIndex());
        assertEquals("Module B", modules.get(2).getTitle());
        assertEquals(2, modules.get(2).getOrderIndex());
    }

    @Test
    void defaultStatusWhenOmitted() {
        String csv = "Module,Module Description,Module Duration,Duration Unit,Module Status,Topic,Topic Description,Topic Duration (Hours),Topic Status\n" +
                "Module 1,Intro,10,HOURS,,HTML Basics,Intro,3,\n";
        MockMultipartFile file = csvFile(csv);
        SyllabusImportPreviewResponse preview = importService.preview(course.getId(), file);
        assertTrue(preview.isValid());
        assertEquals("PUBLISHED", preview.getModules().get(0).getStatus());
        assertEquals("PUBLISHED", preview.getModules().get(0).getTopics().get(0).getStatus());
    }

    @Test
    void transactionRollbackOnValidationFailure() {
        String csv = "Module,Module Description,Module Duration,Duration Unit,Module Status,Topic,Topic Description,Topic Duration (Hours),Topic Status\n" +
                "Module 1,Intro,10,HOURS,PUBLISHED,Topic A,,3,PUBLISHED\n" +
                "Module 1,Intro,10,HOURS,PUBLISHED,Topic A,,3,PUBLISHED\n"; // duplicate will fail
        MockMultipartFile file = csvFile(csv);
        long before = moduleRepository.countByCourseId(course.getId());
        assertThrows(Exception.class, () -> importService.importSyllabus(course.getId(), file));
        assertEquals(before, moduleRepository.countByCourseId(course.getId()));
    }
}
