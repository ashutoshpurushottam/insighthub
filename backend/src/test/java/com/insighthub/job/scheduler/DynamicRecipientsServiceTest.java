package com.insighthub.job.scheduler;

import com.insighthub.job.JobEntity;
import com.insighthub.report.ReportRunService;
import com.insighthub.report.RunReportResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DynamicRecipientsServiceTest {

    @Mock
    private ReportRunService reportRunService;

    @InjectMocks
    private DynamicRecipientsService dynamicRecipientsService;

    private JobEntity job;

    @BeforeEach
    void setUp() {
        job = new JobEntity();
        job.setId(1L);
    }

    @Test
    void resolveRecipients_noDynamicReportConfigured_returnsEmptyList() {
        job.setDynamicRecipientsReportId(null);

        List<DynamicRecipient> result = dynamicRecipientsService.resolveRecipients(job);

        assertTrue(result.isEmpty());
        verifyNoInteractions(reportRunService);
    }

    @Test
    void resolveRecipients_reportReturnsNoRows_returnsEmptyList() {
        job.setDynamicRecipientsReportId(10L);

        when(reportRunService.runReport(eq(10L), anyMap()))
                .thenReturn(RunReportResult.builder()
                        .columns(List.of("email"))
                        .rows(Collections.emptyList())
                        .rowCount(0)
                        .executionMs(50)
                        .build());

        List<DynamicRecipient> result = dynamicRecipientsService.resolveRecipients(job);

        assertTrue(result.isEmpty());
    }

    @Test
    void resolveRecipients_reportReturnsNoColumns_returnsEmptyList() {
        job.setDynamicRecipientsReportId(10L);

        when(reportRunService.runReport(eq(10L), anyMap()))
                .thenReturn(RunReportResult.builder()
                        .columns(Collections.emptyList())
                        .rows(Collections.emptyList())
                        .rowCount(0)
                        .executionMs(50)
                        .build());

        List<DynamicRecipient> result = dynamicRecipientsService.resolveRecipients(job);

        assertTrue(result.isEmpty());
    }

    @Test
    void resolveRecipients_extractsEmailFromFirstColumn() {
        job.setDynamicRecipientsReportId(10L);

        List<Map<String, Object>> rows = List.of(
                new LinkedHashMap<>(Map.of("email", "alice@example.com", "name", "Alice")),
                new LinkedHashMap<>(Map.of("email", "bob@example.com", "name", "Bob"))
        );

        when(reportRunService.runReport(eq(10L), anyMap()))
                .thenReturn(RunReportResult.builder()
                        .columns(List.of("email", "name"))
                        .rows(rows)
                        .rowCount(2)
                        .executionMs(100)
                        .build());

        List<DynamicRecipient> result = dynamicRecipientsService.resolveRecipients(job);

        assertEquals(2, result.size());
        assertEquals("alice@example.com", result.get(0).email());
        assertEquals("bob@example.com", result.get(1).email());
    }

    @Test
    void resolveRecipients_includesAllColumnsInRecipientMap() {
        job.setDynamicRecipientsReportId(10L);

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("email_addr", "user@test.com");
        row.put("first_name", "John");
        row.put("department", "Sales");

        when(reportRunService.runReport(eq(10L), anyMap()))
                .thenReturn(RunReportResult.builder()
                        .columns(List.of("email_addr", "first_name", "department"))
                        .rows(List.of(row))
                        .rowCount(1)
                        .executionMs(50)
                        .build());

        List<DynamicRecipient> result = dynamicRecipientsService.resolveRecipients(job);

        assertEquals(1, result.size());
        DynamicRecipient recipient = result.get(0);
        assertEquals("user@test.com", recipient.email());
        assertEquals("John", recipient.columns().get("first_name"));
        assertEquals("Sales", recipient.columns().get("department"));
    }

    @Test
    void resolveRecipients_skipsRowsWithNullOrBlankEmail() {
        job.setDynamicRecipientsReportId(10L);

        List<Map<String, Object>> rows = new ArrayList<>();
        Map<String, Object> row1 = new LinkedHashMap<>();
        row1.put("email", "valid@test.com");
        rows.add(row1);

        Map<String, Object> row2 = new LinkedHashMap<>();
        row2.put("email", null);
        rows.add(row2);

        Map<String, Object> row3 = new LinkedHashMap<>();
        row3.put("email", "   ");
        rows.add(row3);

        when(reportRunService.runReport(eq(10L), anyMap()))
                .thenReturn(RunReportResult.builder()
                        .columns(List.of("email"))
                        .rows(rows)
                        .rowCount(3)
                        .executionMs(50)
                        .build());

        List<DynamicRecipient> result = dynamicRecipientsService.resolveRecipients(job);

        assertEquals(1, result.size());
        assertEquals("valid@test.com", result.get(0).email());
    }

    @Test
    void resolveRecipients_withFilteringColumns() {
        job.setDynamicRecipientsReportId(10L);

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("email", "manager@test.com");
        row.put("recipient_column", "department_id");
        row.put("recipient_id", "42");

        when(reportRunService.runReport(eq(10L), anyMap()))
                .thenReturn(RunReportResult.builder()
                        .columns(List.of("email", "recipient_column", "recipient_id"))
                        .rows(List.of(row))
                        .rowCount(1)
                        .executionMs(50)
                        .build());

        List<DynamicRecipient> result = dynamicRecipientsService.resolveRecipients(job);

        assertEquals(1, result.size());
        DynamicRecipient recipient = result.get(0);
        assertTrue(recipient.hasFilterInfo());
        assertEquals("department_id", recipient.getRecipientColumn());
        assertEquals("42", recipient.getRecipientId());
    }

    @Test
    void resolveRecipients_withoutFilteringColumns_hasFilterInfoReturnsFalse() {
        job.setDynamicRecipientsReportId(10L);

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("email", "user@test.com");
        row.put("name", "User");

        when(reportRunService.runReport(eq(10L), anyMap()))
                .thenReturn(RunReportResult.builder()
                        .columns(List.of("email", "name"))
                        .rows(List.of(row))
                        .rowCount(1)
                        .executionMs(50)
                        .build());

        List<DynamicRecipient> result = dynamicRecipientsService.resolveRecipients(job);

        assertEquals(1, result.size());
        assertFalse(result.get(0).hasFilterInfo());
    }

    @Test
    void personalize_replacesPlaceholdersWithColumnValues() {
        Map<String, String> columns = Map.of(
                "email", "alice@test.com",
                "first_name", "Alice",
                "department", "Engineering"
        );
        DynamicRecipient recipient = new DynamicRecipient("alice@test.com", columns);

        String subject = "Report for #first_name# in #department#";
        String result = dynamicRecipientsService.personalize(subject, recipient);

        assertEquals("Report for Alice in Engineering", result);
    }

    @Test
    void personalize_nullText_returnsNull() {
        DynamicRecipient recipient = new DynamicRecipient("a@b.com", Map.of("name", "X"));

        assertNull(dynamicRecipientsService.personalize(null, recipient));
    }

    @Test
    void personalize_emptyText_returnsEmpty() {
        DynamicRecipient recipient = new DynamicRecipient("a@b.com", Map.of("name", "X"));

        assertEquals("", dynamicRecipientsService.personalize("", recipient));
    }

    @Test
    void personalize_noPlaceholders_returnsOriginalText() {
        DynamicRecipient recipient = new DynamicRecipient("a@b.com", Map.of("name", "Alice"));

        String text = "Hello, this is a plain message.";
        assertEquals(text, dynamicRecipientsService.personalize(text, recipient));
    }

    @Test
    void personalize_unknownPlaceholder_remainsUnchanged() {
        DynamicRecipient recipient = new DynamicRecipient("a@b.com", Map.of("name", "Alice"));

        String text = "Hello #name#, your #unknown_field# is ready.";
        String result = dynamicRecipientsService.personalize(text, recipient);

        assertEquals("Hello Alice, your #unknown_field# is ready.", result);
    }

    @Test
    void dynamicRecipient_getColumnValue_returnsEmptyForMissingColumn() {
        DynamicRecipient recipient = new DynamicRecipient("a@b.com", Map.of("name", "Alice"));

        assertEquals("", recipient.getColumnValue("nonexistent"));
        assertEquals("", recipient.getColumnValue(null));
    }

    @Test
    void dynamicRecipient_getColumnValue_nullColumnsMap() {
        DynamicRecipient recipient = new DynamicRecipient("a@b.com", null);

        assertEquals("", recipient.getColumnValue("anything"));
        assertFalse(recipient.hasFilterInfo());
    }
}
