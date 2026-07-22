package com.insighthub.job.scheduler;

/**
 * Result returned by a {@link JobOutputHandler} after processing job output.
 * <p>
 * Contains the outcome of the handler execution including success/failure status,
 * an optional output file path (for publish/burst handlers), and a descriptive message.
 * </p>
 *
 * @param success        whether the handler completed successfully
 * @param outputFilePath path to the generated output file (null if not applicable, e.g. email-only jobs)
 * @param message        descriptive message about the result (error details on failure, summary on success)
 */
public record JobHandlerResult(
        boolean success,
        String outputFilePath,
        String message
) {

    /**
     * Creates a successful result with an output file path.
     */
    public static JobHandlerResult success(String outputFilePath, String message) {
        return new JobHandlerResult(true, outputFilePath, message);
    }

    /**
     * Creates a successful result without an output file (e.g. email sent).
     */
    public static JobHandlerResult success(String message) {
        return new JobHandlerResult(true, null, message);
    }

    /**
     * Creates a failure result with an error message.
     */
    public static JobHandlerResult failure(String message) {
        return new JobHandlerResult(false, null, message);
    }
}
