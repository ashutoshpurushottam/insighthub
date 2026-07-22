package com.insighthub.smtp;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Properties;

/**
 * Utility class for sending emails using SMTP server configurations.
 * Builds a JavaMailSender dynamically from SmtpServerEntity settings
 * and supports HTML content with file attachments.
 */
@Component
@RequiredArgsConstructor
public class EmailSender {

    private static final Logger log = LoggerFactory.getLogger(EmailSender.class);

    /**
     * Represents an email attachment with name, content bytes, and MIME type.
     */
    public record Attachment(String name, byte[] data, String contentType) {
    }

    /**
     * Builds a JavaMailSender configured from the given SmtpServerEntity.
     *
     * @param smtp the SMTP server configuration entity
     * @return a configured JavaMailSender instance
     */
    public JavaMailSender buildMailSender(SmtpServerEntity smtp) {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(smtp.getServer());
        mailSender.setPort(smtp.getPort() != null ? smtp.getPort() : 587);

        if (smtp.isUseAuth()) {
            mailSender.setUsername(smtp.getUsername());
            mailSender.setPassword(smtp.getPassword());
        }

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", String.valueOf(smtp.isUseAuth()));
        props.put("mail.smtp.starttls.enable", String.valueOf(smtp.isUseStarttls()));
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");
        props.put("mail.smtp.writetimeout", "10000");

        return mailSender;
    }

    /**
     * Sends an email using the specified SMTP server configuration.
     *
     * @param smtp        the SMTP server entity to use for sending
     * @param to          comma-separated recipient addresses
     * @param cc          comma-separated CC addresses (nullable)
     * @param bcc         comma-separated BCC addresses (nullable)
     * @param subject     email subject
     * @param body        email body (HTML supported)
     * @param from        from address (nullable, falls back to smtp.fromAddress)
     * @param replyTo     reply-to address (nullable)
     * @param attachments list of attachments (nullable or empty for no attachments)
     * @throws MessagingException if sending fails
     */
    public void sendEmail(SmtpServerEntity smtp, String to, String cc, String bcc,
                          String subject, String body, String from, String replyTo,
                          List<Attachment> attachments) throws MessagingException {

        JavaMailSender mailSender = buildMailSender(smtp);
        MimeMessage message = mailSender.createMimeMessage();

        boolean hasAttachments = attachments != null && !attachments.isEmpty();
        MimeMessageHelper helper = new MimeMessageHelper(message, hasAttachments, "UTF-8");

        // Set recipients
        if (to != null && !to.isBlank()) {
            helper.setTo(parseAddresses(to));
        }
        if (cc != null && !cc.isBlank()) {
            helper.setCc(parseAddresses(cc));
        }
        if (bcc != null && !bcc.isBlank()) {
            helper.setBcc(parseAddresses(bcc));
        }

        // Set from address: explicit from > smtp default
        String fromAddress = (from != null && !from.isBlank()) ? from : smtp.getFromAddress();
        if (fromAddress != null && !fromAddress.isBlank()) {
            helper.setFrom(fromAddress);
        }

        // Set reply-to
        if (replyTo != null && !replyTo.isBlank()) {
            helper.setReplyTo(replyTo);
        }

        // Set subject and HTML body
        helper.setSubject(subject != null ? subject : "");
        helper.setText(body != null ? body : "", true);

        // Add attachments
        if (hasAttachments) {
            for (Attachment attachment : attachments) {
                helper.addAttachment(
                    attachment.name(),
                    new ByteArrayResource(attachment.data()),
                    attachment.contentType()
                );
            }
        }

        mailSender.send(message);
        log.info("Email sent successfully via SMTP server '{}' to: {}", smtp.getName(), to);
    }

    /**
     * Parses a comma-separated string of email addresses into an array.
     */
    private String[] parseAddresses(String addresses) {
        return addresses.split("\\s*,\\s*");
    }
}
