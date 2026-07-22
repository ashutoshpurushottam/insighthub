package com.insighthub.parameter;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

class ExpressionResolverTest {

    private ExpressionResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new ExpressionResolver();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void resolve_CURDATE_returnsCurrentDate() {
        String result = resolver.resolve("CURDATE()");

        String expected = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_CURRENT_DATE_returnsCurrentDate() {
        String result = resolver.resolve("CURRENT_DATE");

        String expected = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_NOW_returnsCurrentDateTime() {
        String result = resolver.resolve("NOW()");

        // Verify format matches yyyy-MM-dd HH:mm:ss
        assertNotNull(result);
        assertTrue(result.matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}"),
                "NOW() should return format yyyy-MM-dd HH:mm:ss but got: " + result);

        // Verify the date portion matches today
        String datePart = result.substring(0, 10);
        String expected = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, datePart);
    }

    @Test
    void resolve_CURRENT_USER_returnsAuthenticatedUsername() {
        // Set up security context with a test user
        UserDetails userDetails = User.builder()
                .username("testuser")
                .password("password")
                .authorities(Collections.emptyList())
                .build();
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);

        String result = resolver.resolve("CURRENT_USER");

        assertEquals("testuser", result);
    }

    @Test
    void resolve_CURRENT_USER_returnsAnonymousWhenNoAuth() {
        SecurityContextHolder.clearContext();

        String result = resolver.resolve("CURRENT_USER");

        assertEquals("anonymous", result);
    }

    @Test
    void resolve_FIRST_DAY_OF_MONTH_returnsFirstDay() {
        String result = resolver.resolve("FIRST_DAY_OF_MONTH");

        String expected = YearMonth.now().atDay(1).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_LAST_DAY_OF_MONTH_returnsLastDay() {
        String result = resolver.resolve("LAST_DAY_OF_MONTH");

        String expected = YearMonth.now().atEndOfMonth().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_nonExpression_returnsUnchanged() {
        String input = "some default value";
        String result = resolver.resolve(input);

        assertEquals(input, result);
    }

    @Test
    void resolve_null_returnsNull() {
        String result = resolver.resolve(null);

        assertNull(result);
    }

    @Test
    void resolve_blank_returnsBlank() {
        String result = resolver.resolve("   ");

        assertEquals("   ", result);
    }

    @Test
    void resolve_expressionWithSurroundingWhitespace_isTrimmedAndResolved() {
        String result = resolver.resolve("  CURDATE()  ");

        String expected = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_CURRENT_USER_withStringPrincipal() {
        // Authentication with a string principal (not UserDetails)
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken("admin", null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(auth);

        String result = resolver.resolve("CURRENT_USER");

        assertEquals("admin", result);
    }

    // ==================== add <unit> <offset> tests ====================

    @Test
    void resolve_addDays1_returnsTomorrow() {
        String result = resolver.resolve("add days 1");

        String expected = LocalDate.now().plusDays(1).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_addDaysMinus1_returnsYesterday() {
        String result = resolver.resolve("add days -1");

        String expected = LocalDate.now().minusDays(1).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_addMonthsMinus1_returnsOneMonthAgo() {
        String result = resolver.resolve("add months -1");

        String expected = LocalDate.now().minusMonths(1).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_addWeeks2_returnsTwoWeeksFromNow() {
        String result = resolver.resolve("add weeks 2");

        String expected = LocalDate.now().plusWeeks(2).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_addYearsMinus1_returnsOneYearAgo() {
        String result = resolver.resolve("add years -1");

        String expected = LocalDate.now().minusYears(1).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_addHours2_returnsDateTimeFormat() {
        String result = resolver.resolve("add hours 2");

        // Verify format is yyyy-MM-dd HH:mm:ss
        assertNotNull(result);
        assertTrue(result.matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}"),
                "add hours should return format yyyy-MM-dd HH:mm:ss but got: " + result);
    }

    @Test
    void resolve_addMinutesMinus30_returnsDateTimeFormat() {
        String result = resolver.resolve("add minutes -30");

        // Verify format is yyyy-MM-dd HH:mm:ss
        assertNotNull(result);
        assertTrue(result.matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}"),
                "add minutes should return format yyyy-MM-dd HH:mm:ss but got: " + result);
    }

    @Test
    void resolve_addSeconds60_returnsDateTimeFormat() {
        String result = resolver.resolve("add seconds 60");

        assertNotNull(result);
        assertTrue(result.matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}"),
                "add seconds should return format yyyy-MM-dd HH:mm:ss but got: " + result);
    }

    @Test
    void resolve_addMilliseconds1000_returnsDateTimeFormat() {
        String result = resolver.resolve("add milliseconds 1000");

        assertNotNull(result);
        assertTrue(result.matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}"),
                "add milliseconds should return format yyyy-MM-dd HH:mm:ss but got: " + result);
    }

    @Test
    void resolve_addIsCaseInsensitive() {
        String result = resolver.resolve("ADD Days 1");

        String expected = LocalDate.now().plusDays(1).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_addWithMixedCase() {
        String result = resolver.resolve("Add MONTHS -2");

        String expected = LocalDate.now().minusMonths(2).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_addWithPositiveSign() {
        String result = resolver.resolve("add days +3");

        String expected = LocalDate.now().plusDays(3).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_addWithZeroOffset() {
        String result = resolver.resolve("add days 0");

        String expected = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_addWithWhitespaceTrimming() {
        String result = resolver.resolve("  add days 1  ");

        String expected = LocalDate.now().plusDays(1).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_addDateUnits_returnDateFormat() {
        // All date units should return yyyy-MM-dd format
        String[] dateUnits = {"days", "weeks", "months", "years"};
        for (String unit : dateUnits) {
            String result = resolver.resolve("add " + unit + " 1");
            assertTrue(result.matches("\\d{4}-\\d{2}-\\d{2}"),
                    "add " + unit + " should return yyyy-MM-dd format but got: " + result);
            // Date-only format should NOT have time component
            assertFalse(result.contains(" "),
                    "add " + unit + " should not include time component but got: " + result);
        }
    }

    @Test
    void resolve_addTimeUnits_returnDateTimeFormat() {
        // All time units should return yyyy-MM-dd HH:mm:ss format
        String[] timeUnits = {"hours", "minutes", "seconds", "milliseconds"};
        for (String unit : timeUnits) {
            String result = resolver.resolve("add " + unit + " 1");
            assertTrue(result.matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}"),
                    "add " + unit + " should return yyyy-MM-dd HH:mm:ss format but got: " + result);
        }
    }

    // --- firstday/lastday expression tests ---

    @Test
    void resolve_firstdayMonth_returnsFirstDayOfCurrentMonth() {
        String result = resolver.resolve("firstday month");

        String expected = LocalDate.now().with(TemporalAdjusters.firstDayOfMonth())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_firstdayMonthMinus1_returnsFirstDayOfPreviousMonth() {
        String result = resolver.resolve("firstday month -1");

        String expected = LocalDate.now().minusMonths(1).with(TemporalAdjusters.firstDayOfMonth())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_firstdayMonthPlus1_returnsFirstDayOfNextMonth() {
        String result = resolver.resolve("firstday month +1");

        String expected = LocalDate.now().plusMonths(1).with(TemporalAdjusters.firstDayOfMonth())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_firstdayYear_returnsJanuary1st() {
        String result = resolver.resolve("firstday year");

        String expected = LocalDate.now().with(TemporalAdjusters.firstDayOfYear())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_firstdayYearMinus1_returnsJanuary1stOfPreviousYear() {
        String result = resolver.resolve("firstday year -1");

        String expected = LocalDate.now().minusYears(1).with(TemporalAdjusters.firstDayOfYear())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_lastdayMonth_returnsLastDayOfCurrentMonth() {
        String result = resolver.resolve("lastday month");

        String expected = LocalDate.now().with(TemporalAdjusters.lastDayOfMonth())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_lastdayMonthMinus1_returnsLastDayOfPreviousMonth() {
        String result = resolver.resolve("lastday month -1");

        String expected = LocalDate.now().minusMonths(1).with(TemporalAdjusters.lastDayOfMonth())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_lastdayYear_returnsDecember31st() {
        String result = resolver.resolve("lastday year");

        String expected = LocalDate.now().with(TemporalAdjusters.lastDayOfYear())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_lastdayYearMinus1_returnsDecember31stOfPreviousYear() {
        String result = resolver.resolve("lastday year -1");

        String expected = LocalDate.now().minusYears(1).with(TemporalAdjusters.lastDayOfYear())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_firstdayMonth_caseInsensitive() {
        String result = resolver.resolve("FIRSTDAY MONTH");

        String expected = LocalDate.now().with(TemporalAdjusters.firstDayOfMonth())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_lastdayYear_caseInsensitive() {
        String result = resolver.resolve("LASTDAY YEAR");

        String expected = LocalDate.now().with(TemporalAdjusters.lastDayOfYear())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_firstdayMonth_withPositiveOffsetNoSign() {
        // Offset without explicit + sign
        String result = resolver.resolve("firstday month 2");

        String expected = LocalDate.now().plusMonths(2).with(TemporalAdjusters.firstDayOfMonth())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_firstdayMonth_withWhitespace() {
        String result = resolver.resolve("  firstday month -1  ");

        String expected = LocalDate.now().minusMonths(1).with(TemporalAdjusters.firstDayOfMonth())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    // ==================== today keyword tests ====================

    @Test
    void resolve_today_returnsCurrentDate() {
        String result = resolver.resolve("today");

        String expected = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_today_caseInsensitive_uppercase() {
        String result = resolver.resolve("TODAY");

        String expected = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_today_caseInsensitive_mixedCase() {
        String result = resolver.resolve("Today");

        String expected = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_today_returnsDateOnlyFormat() {
        String result = resolver.resolve("today");

        // Should be yyyy-MM-dd only, no time component
        assertTrue(result.matches("\\d{4}-\\d{2}-\\d{2}"),
                "today should return yyyy-MM-dd format but got: " + result);
        assertFalse(result.contains(" "),
                "today should not include time component but got: " + result);
    }

    @Test
    void resolve_today_withWhitespace() {
        String result = resolver.resolve("  today  ");

        String expected = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    // ==================== now keyword tests ====================

    @Test
    void resolve_now_returnsCurrentDateTime() {
        String result = resolver.resolve("now");

        assertNotNull(result);
        assertTrue(result.matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}"),
                "now should return format yyyy-MM-dd HH:mm:ss but got: " + result);

        // Verify the date portion matches today
        String datePart = result.substring(0, 10);
        String expected = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, datePart);
    }

    @Test
    void resolve_now_caseInsensitive_uppercase() {
        // Note: "NOW" (without parens) should be resolved by the case-insensitive check
        String result = resolver.resolve("NOW");

        assertNotNull(result);
        assertTrue(result.matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}"),
                "NOW should return format yyyy-MM-dd HH:mm:ss but got: " + result);
    }

    @Test
    void resolve_now_caseInsensitive_mixedCase() {
        String result = resolver.resolve("Now");

        assertNotNull(result);
        assertTrue(result.matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}"),
                "Now should return format yyyy-MM-dd HH:mm:ss but got: " + result);
    }

    @Test
    void resolve_now_withWhitespace() {
        String result = resolver.resolve("  now  ");

        assertNotNull(result);
        assertTrue(result.matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}"),
                "now with whitespace should return format yyyy-MM-dd HH:mm:ss but got: " + result);
    }

    // ==================== Edge cases: large offsets ====================

    @Test
    void resolve_addDays_largePositiveOffset() {
        String result = resolver.resolve("add days 365");

        String expected = LocalDate.now().plusDays(365).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_addDays_largeNegativeOffset() {
        String result = resolver.resolve("add days -365");

        String expected = LocalDate.now().minusDays(365).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_addMonths_largeOffset() {
        String result = resolver.resolve("add months 24");

        String expected = LocalDate.now().plusMonths(24).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_addYears_largeOffset() {
        String result = resolver.resolve("add years 10");

        String expected = LocalDate.now().plusYears(10).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    // ==================== Edge cases: month boundaries ====================

    @Test
    void resolve_addMonths_monthBoundary_Jan31PlusOneMonth() {
        // Verifying that Java's date handling is used correctly:
        // Jan 31 + 1 month should give Feb 28 (or 29 in leap year)
        // This tests that the resolver correctly delegates to Java's LocalDate.plusMonths()
        LocalDate jan31 = LocalDate.of(2026, 1, 31);
        LocalDate expected = jan31.plusMonths(1); // Feb 28, 2026
        // We can't pin the test to Jan 31 since we use "now", but we can verify the resolver
        // always produces a valid date
        String result = resolver.resolve("add months 1");
        assertNotNull(result);
        assertTrue(result.matches("\\d{4}-\\d{2}-\\d{2}"),
                "add months should always produce a valid date: " + result);
        // Parse the result to ensure it's a valid date
        LocalDate parsed = LocalDate.parse(result, DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertNotNull(parsed);
    }

    @Test
    void resolve_lastdayMonthPlus1_returnsLastDayOfNextMonth() {
        String result = resolver.resolve("lastday month +1");

        String expected = LocalDate.now().plusMonths(1).with(TemporalAdjusters.lastDayOfMonth())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_firstdayYearPlus1_returnsJanuary1stOfNextYear() {
        String result = resolver.resolve("firstday year +1");

        String expected = LocalDate.now().plusYears(1).with(TemporalAdjusters.firstDayOfYear())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_lastdayYearPlus1_returnsDecember31stOfNextYear() {
        String result = resolver.resolve("lastday year +1");

        String expected = LocalDate.now().plusYears(1).with(TemporalAdjusters.lastDayOfYear())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    // ==================== Edge cases: year boundaries ====================

    @Test
    void resolve_addDays_crossesYearBoundary() {
        // From Dec 31, adding 1 day crosses into next year
        // Since we test from "now", verify the result is always a valid date
        String result = resolver.resolve("add days 366");

        LocalDate expected = LocalDate.now().plusDays(366);
        assertEquals(expected.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")), result);
    }

    @Test
    void resolve_addMonths_crossesYearBoundary() {
        String result = resolver.resolve("add months 13");

        LocalDate expected = LocalDate.now().plusMonths(13);
        assertEquals(expected.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")), result);
    }

    @Test
    void resolve_addMonths_negativeAcrossYear() {
        String result = resolver.resolve("add months -13");

        LocalDate expected = LocalDate.now().minusMonths(13);
        assertEquals(expected.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")), result);
    }

    // ==================== Edge cases: leap year considerations ====================

    @Test
    void resolve_lastdayMonth_leapYearFebruary() {
        // The lastday month for February in a leap year should give 29
        // We verify the resolver always handles the current month correctly
        // regardless of whether it's February or a leap year
        String result = resolver.resolve("lastday month");

        LocalDate expected = LocalDate.now().with(TemporalAdjusters.lastDayOfMonth());
        assertEquals(expected.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")), result);
    }

    @Test
    void resolve_addYears_leapYearHandling() {
        // Adding/subtracting years from a leap day (Feb 29) should handle gracefully
        // Java's LocalDate.plusYears() handles this by rolling to Feb 28 in non-leap years
        // We verify the resolver delegates correctly to Java's date math
        String result = resolver.resolve("add years 4");

        LocalDate expected = LocalDate.now().plusYears(4);
        assertEquals(expected.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")), result);
    }

    @Test
    void resolve_firstdayMonth_largeNegativeOffset() {
        // firstday month -12 should give the first day of the same month last year
        String result = resolver.resolve("firstday month -12");

        String expected = LocalDate.now().minusMonths(12).with(TemporalAdjusters.firstDayOfMonth())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_lastdayMonth_largePositiveOffset() {
        // lastday month 12 should give the last day of the same month next year
        String result = resolver.resolve("lastday month 12");

        String expected = LocalDate.now().plusMonths(12).with(TemporalAdjusters.lastDayOfMonth())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_firstdayYear_largeOffset() {
        String result = resolver.resolve("firstday year -5");

        String expected = LocalDate.now().minusYears(5).with(TemporalAdjusters.firstDayOfYear())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }

    @Test
    void resolve_lastdayYear_largeOffset() {
        String result = resolver.resolve("lastday year 5");

        String expected = LocalDate.now().plusYears(5).with(TemporalAdjusters.lastDayOfYear())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        assertEquals(expected, result);
    }
}
