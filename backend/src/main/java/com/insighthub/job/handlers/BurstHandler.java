package com.insighthub.job.handlers;

import com.insighthub.job.JobEntity;
import com.insighthub.job.JobExecutionEntity;
import com.insighthub.job.scheduler.JobHandlerResult;
import com.insighthub.job.scheduler.JobOutputHandler;
import com.insighthub.report.RunReportResult;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Job output handler that splits report results into separate files
 * based on the value of the first column (the burst column).
 * <p>
 * The report SQL must be ordered by the first column so that rows
 * with the same burst value are grouped together. When the value
 * changes, a new output file is started.
 * </p>
 * <p>
 * Each generated file is named {@code {reportName}_{burstValue}.{format}}
 * and stored in the export directory under the job's sub-directory.
 * </p>
 *
 * <p>Implements Requirement 8: Job Types — Burst</p>
 */
@Component
@RequiredArgsConstructor
public class BurstHandler implements JobOutputHandler {

    private static final Logger log = LoggerFactory.getLogger(BurstHandler.class);

    private final ReportResultFileGenerator fileGenerator;

    @Value("${insighthub.export.directory:./exports}")
    private String exportDirectory;

    @Override
    public JobHandlerResult handle(JobEntity job, JobExecutionEntity execution, RunReportResult result) {
        log.info("BurstHandler processing job id={}, name='{}'", job.getId(), job.getName());

        // Edge case: empty result
        if (result.getRows() == null || result.getRows().isEmpty()) {
            log.info("BurstHandler: no rows in result for job id={}", job.getId());
            return JobHandlerResult.success("Burst complete: no rows");
        }

        // Edge case: no columns
        if (result.getColumns() == null || result.getColumns().isEmpty()) {
            return JobHandlerResult.failure("Burst failed: result has no columns");
        }

        try {
            // Step 1: Get the burst column (first column)
            String burstColumn = result.getColumns().get(0);
            log.debug("Burst column: '{}'", burstColumn);

            // Step 2: Resolve output directory
            Path outputDir = resolveOutputDirectory(job);
            Files.createDirectories(outputDir);

            // Step 3: Group rows by burst column value and generate files
            String outputFormat = job.getOutputFormat() != null ? job.getOutputFormat() : "CSV";
            String reportName = job.getReport() != null ? job.getReport().getName() : job.getName();

            List<Map<String, Object>> currentGroup = new ArrayList<>();
            Object currentBurstValue = null;
            int fileCount = 0;

            for (Map<String, Object> row : result.getRows()) {
                Object burstValue = row.get(burstColumn);

                // Detect value change (or first row)
                if (currentGroup.isEmpty() || !isSameValue(currentBurstValue, burstValue)) {
                    // Write the previous group if it has rows
                    if (!currentGroup.isEmpty()) {
                        writeGroupFile(outputDir, reportName, outputFormat,
                                result.getColumns(), currentGroup, currentBurstValue);
                        fileCount++;
                        currentGroup = new ArrayList<>();
                    }
                    currentBurstValue = burstValue;
                }

                currentGroup.add(row);
            }

            // Write the last group
            if (!currentGroup.isEmpty()) {
                writeGroupFile(outputDir, reportName, outputFormat,
                        result.getColumns(), currentGroup, currentBurstValue);
                fileCount++;
            }

            String message = "Burst complete: " + fileCount + " files generated";
            log.info("BurstHandler completed for job id={}: {}", job.getId(), message);
            return JobHandlerResult.success(outputDir.toString(), message);

        } catch (IOException e) {
            String errorMsg = "Burst failed for job id=" + job.getId() + ": " + e.getMessage();
            log.error(errorMsg, e);
            return JobHandlerResult.failure(errorMsg);
        } catch (Exception e) {
            String errorMsg = "Unexpected error in BurstHandler for job id=" + job.getId() + ": " + e.getMessage();
            log.error(errorMsg, e);
            return JobHandlerResult.failure(errorMsg);
        }
    }

    /**
     * Writes a group of rows to a file in the output directory.
     * The filename incorporates the burst value for identification.
     */
    private void writeGroupFile(Path outputDir, String reportName, String outputFormat,
                                List<String> columns, List<Map<String, Object>> rows,
                                Object burstValue) throws IOException {

        // Build a sub-result for this group
        RunReportResult groupResult = RunReportResult.builder()
                .columns(columns)
                .rows(rows)
                .rowCount(rows.size())
                .executionMs(0)
                .build();

        // Generate file bytes using the file generator
        String burstSuffix = sanitizeBurstValue(burstValue);
        String groupReportName = reportName + "_" + burstSuffix;

        ReportResultFileGenerator.GeneratedFile generatedFile =
                fileGenerator.generate(groupResult, outputFormat, groupReportName);

        // Write file to the output directory
        Path filePath = outputDir.resolve(generatedFile.filename());
        Files.write(filePath, generatedFile.data());

        log.debug("Burst file written: {} ({} rows)", filePath, rows.size());
    }

    /**
     * Resolves the output directory for burst files.
     * Uses the export directory with the job's sub-directory appended.
     */
    private Path resolveOutputDirectory(JobEntity job) {
        Path basePath = Paths.get(exportDirectory);
        if (job.getSubDirectory() != null && !job.getSubDirectory().isBlank()) {
            return basePath.resolve(job.getSubDirectory());
        }
        return basePath;
    }

    /**
     * Compares two burst values for equality, handling null values.
     */
    private boolean isSameValue(Object a, Object b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        return a.toString().equals(b.toString());
    }

    /**
     * Sanitizes a burst value for use in a filename.
     * Replaces or removes characters that are invalid in file names.
     */
    private String sanitizeBurstValue(Object value) {
        if (value == null) {
            return "null";
        }
        String str = value.toString().trim();
        if (str.isEmpty()) {
            return "empty";
        }
        return str.replaceAll("[^a-zA-Z0-9._\\-]", "_");
    }
}
