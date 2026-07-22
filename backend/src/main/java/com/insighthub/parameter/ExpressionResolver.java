package com.insighthub.parameter;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Resolves expression keywords in parameter default values.
 * <p>
 * Supported expressions:
 * <ul>
 *   <li>{@code CURDATE()} — current date in yyyy-MM-dd format</li>
 *   <li>{@code CURRENT_DATE} — current date in yyyy-MM-dd format</li>
 *   <li>{@code NOW()} — current date-time in yyyy-MM-dd HH:mm:ss format</li>
 *   <li>{@code CURRENT_USER} — authenticated username from Spring SecurityContext</li>
 *   <li>{@code FIRST_DAY_OF_MONTH} — first day of current month in yyyy-MM-dd format</li>
 *   <li>{@code LAST_DAY_OF_MONTH} — last day of current month in yyyy-MM-dd format</li>
 *   <li>{@code today} — current date in yyyy-MM-dd format (case-insensitive)</li>
 *   <li>{@code now} — current date-time in yyyy-MM-dd HH:mm:ss format (case-insensitive)</li>
 *   <li>{@code add &lt;unit&gt; &lt;offset&gt;} — date arithmetic (e.g., "add days 1", "add months -1")</li>
 *   <li>{@code firstday month [offset]} — first day of current (or offset) month</li>
 *   <li>{@code firstday year [offset]} — January 1st of current (or offset) year</li>
 *   <li>{@code lastday month [offset]} — last day of current (or offset) month</li>
 *   <li>{@code lastday year [offset]} — December 31st of current (or offset) year</li>
 * </ul>
 * <p>
 * The {@code add} expression supports the following units:
 * <ul>
 *   <li>Date units (output yyyy-MM-dd): days, weeks, months, years</li>
 *   <li>Time units (output yyyy-MM-dd HH:mm:ss): hours, minutes, seconds, milliseconds</li>
 * </ul>
 * <p>
 * If the input value is not a recognized expression, it is returned unchanged.
 * Expressions are resolved before SQL parameter substitution.
 */
@Component
public class ExpressionResolver {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * Pattern for "add <unit> <offset>" expressions.
     * Case-insensitive. Captures the unit and the integer offset (with optional +/- sign).
     */
    private static final Pattern ADD_PATTERN = Pattern.compile(
            "^add\\s+(days|weeks|months|years|hours|minutes|seconds|milliseconds)\\s+([+-]?\\d+)$",
            Pattern.CASE_INSENSITIVE
    );

    /**
     * Pattern for firstday/lastday expressions.
     * Format: firstday|lastday period [offset]
     * Examples: "firstday month", "lastday year -1", "firstday month +2"
     * Case-insensitive.
     */
    private static final Pattern FIRSTLAST_DAY_PATTERN = Pattern.compile(
            "^(firstday|lastday)\\s+(month|year)(?:\\s+([+-]?\\d+))?$",
            Pattern.CASE_INSENSITIVE
    );

    /**
     * Date units produce output in yyyy-MM-dd format.
     */
    private static final Set<String> DATE_UNITS = Set.of("days", "weeks", "months", "years");

    /**
     * Resolves a parameter default value if it matches a recognized expression keyword.
     * If the value is not a recognized expression, it is returned unchanged.
     *
     * @param defaultValue the raw default value string (may be an expression keyword)
     * @return the resolved value, or the original string if not an expression
     */
    public String resolve(String defaultValue) {
        if (defaultValue == null || defaultValue.isBlank()) {
            return defaultValue;
        }

        String trimmed = defaultValue.trim();

        // Check for "add <unit> <offset>" pattern
        Matcher addMatcher = ADD_PATTERN.matcher(trimmed);
        if (addMatcher.matches()) {
            return resolveAdd(addMatcher.group(1), addMatcher.group(2));
        }

        // Check for "firstday/lastday <period> [offset]" pattern
        Matcher firstLastMatcher = FIRSTLAST_DAY_PATTERN.matcher(trimmed);
        if (firstLastMatcher.matches()) {
            return resolveFirstLastDay(firstLastMatcher);
        }

        // Case-insensitive check for "today" and "now"
        if (trimmed.equalsIgnoreCase("today")) {
            return resolveCurrentDate();
        }
        if (trimmed.equalsIgnoreCase("now")) {
            return resolveNow();
        }

        // Case-sensitive legacy keywords
        return switch (trimmed) {
            case "CURDATE()", "CURRENT_DATE" -> resolveCurrentDate();
            case "NOW()" -> resolveNow();
            case "CURRENT_USER" -> resolveCurrentUser();
            case "FIRST_DAY_OF_MONTH" -> resolveFirstDayOfMonth();
            case "LAST_DAY_OF_MONTH" -> resolveLastDayOfMonth();
            default -> defaultValue;
        };
    }

    /**
     * Resolves firstday/lastday expressions with optional period offset.
     * <p>
     * Format: {@code firstday|lastday month|year [offset]}
     * <p>
     * Examples:
     * <ul>
     *   <li>"firstday month" → first day of current month</li>
     *   <li>"firstday month -1" → first day of previous month</li>
     *   <li>"firstday month +1" → first day of next month</li>
     *   <li>"firstday year" → January 1st of current year</li>
     *   <li>"firstday year -1" → January 1st of previous year</li>
     *   <li>"lastday month" → last day of current month</li>
     *   <li>"lastday month -1" → last day of previous month</li>
     *   <li>"lastday year" → December 31st of current year</li>
     *   <li>"lastday year -1" → December 31st of previous year</li>
     * </ul>
     *
     * @param matcher the regex matcher with captured groups
     * @return the resolved date string in yyyy-MM-dd format
     */
    private String resolveFirstLastDay(Matcher matcher) {
        String direction = matcher.group(1).toLowerCase(); // "firstday" or "lastday"
        String period = matcher.group(2).toLowerCase();     // "month" or "year"
        String offsetStr = matcher.group(3);                // optional offset like "-1", "+2", "3"
        int offset = (offsetStr != null) ? Integer.parseInt(offsetStr) : 0;

        LocalDate today = LocalDate.now();

        if ("firstday".equals(direction)) {
            return resolveFirstDay(today, period, offset);
        } else {
            return resolveLastDay(today, period, offset);
        }
    }

    /**
     * Resolves "firstday" expressions for the given period and offset.
     */
    private String resolveFirstDay(LocalDate today, String period, int offset) {
        if ("month".equals(period)) {
            LocalDate adjusted = today.plusMonths(offset);
            return adjusted.with(TemporalAdjusters.firstDayOfMonth()).format(DATE_FORMAT);
        } else { // "year"
            LocalDate adjusted = today.plusYears(offset);
            return adjusted.with(TemporalAdjusters.firstDayOfYear()).format(DATE_FORMAT);
        }
    }

    /**
     * Resolves "lastday" expressions for the given period and offset.
     */
    private String resolveLastDay(LocalDate today, String period, int offset) {
        if ("month".equals(period)) {
            LocalDate adjusted = today.plusMonths(offset);
            return adjusted.with(TemporalAdjusters.lastDayOfMonth()).format(DATE_FORMAT);
        } else { // "year"
            LocalDate adjusted = today.plusYears(offset);
            return adjusted.with(TemporalAdjusters.lastDayOfYear()).format(DATE_FORMAT);
        }
    }

    /**
     * Resolves "add <unit> <offset>" expressions using date/time arithmetic.
     * <p>
     * For date units (days, weeks, months, years), the result is formatted as yyyy-MM-dd.
     * For time units (hours, minutes, seconds, milliseconds), the result is formatted as yyyy-MM-dd HH:mm:ss.
     *
     * @param unit   the time unit (case-insensitive)
     * @param offset the integer offset as a string (may include +/- prefix)
     * @return the computed date or datetime string
     */
    private String resolveAdd(String unit, String offset) {
        String unitLower = unit.toLowerCase();
        long amount = Long.parseLong(offset);

        if (DATE_UNITS.contains(unitLower)) {
            LocalDate result = switch (unitLower) {
                case "days" -> LocalDate.now().plusDays(amount);
                case "weeks" -> LocalDate.now().plusWeeks(amount);
                case "months" -> LocalDate.now().plusMonths(amount);
                case "years" -> LocalDate.now().plusYears(amount);
                default -> LocalDate.now();
            };
            return result.format(DATE_FORMAT);
        } else {
            // Time units: hours, minutes, seconds, milliseconds
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime result = switch (unitLower) {
                case "hours" -> now.plusHours(amount);
                case "minutes" -> now.plusMinutes(amount);
                case "seconds" -> now.plusSeconds(amount);
                case "milliseconds" -> now.plus(amount, ChronoUnit.MILLIS);
                default -> now;
            };
            return result.format(DATETIME_FORMAT);
        }
    }

    /**
     * Resolves CURDATE() / CURRENT_DATE to the current date in yyyy-MM-dd format.
     */
    private String resolveCurrentDate() {
        return LocalDate.now().format(DATE_FORMAT);
    }

    /**
     * Resolves NOW() to the current date-time in yyyy-MM-dd HH:mm:ss format.
     */
    private String resolveNow() {
        return LocalDateTime.now().format(DATETIME_FORMAT);
    }

    /**
     * Resolves CURRENT_USER to the authenticated username from Spring SecurityContext.
     * Returns "anonymous" if no authentication is available.
     */
    private String resolveCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return "anonymous";
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserDetails userDetails) {
            return userDetails.getUsername();
        }

        return principal.toString();
    }

    /**
     * Resolves FIRST_DAY_OF_MONTH to the first day of the current month in yyyy-MM-dd format.
     */
    private String resolveFirstDayOfMonth() {
        return YearMonth.now().atDay(1).format(DATE_FORMAT);
    }

    /**
     * Resolves LAST_DAY_OF_MONTH to the last day of the current month in yyyy-MM-dd format.
     */
    private String resolveLastDayOfMonth() {
        return YearMonth.now().atEndOfMonth().format(DATE_FORMAT);
    }
}
