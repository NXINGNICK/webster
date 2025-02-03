package me.nxingnick.webster.email;

import org.bukkit.configuration.file.FileConfiguration;

import javax.mail.*;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;
import java.util.*;
import java.util.logging.Logger;

/**
 * Handles sending templated emails (registration, acceptance, denial, notifications, and verification).
 * Reads customizable template data from config.yml under email.templates.
 */
public class EmailTemplateManager {
    private final FileConfiguration config;
    private final Logger logger;
    private final Properties emailProperties;
    private final Session emailSession;

    /**
     * Constructs an EmailTemplateManager with the given configuration and logger.
     * Fetches SMTP properties from config.yml, such as host, port, username, and password.
     */
    public EmailTemplateManager(FileConfiguration config, Logger logger) {
        this.config = config;
        this.logger = logger;
        this.emailProperties = setupEmailProperties();
        this.emailSession = createEmailSession();
    }

    private Properties setupEmailProperties() {
        Properties props = new Properties();
        props.put("mail.smtp.auth", config.getBoolean("email.smtp.auth", true));
        props.put("mail.smtp.starttls.enable", config.getBoolean("email.smtp.starttls", true));
        props.put("mail.smtp.host", config.getString("email.smtp.host", "smtp.gmail.com"));
        props.put("mail.smtp.port", config.getInt("email.smtp.port", 587));
        return props;
    }

    private Session createEmailSession() {
        return Session.getInstance(emailProperties, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(
                    config.getString("email.smtp.username"),
                    config.getString("email.smtp.password")
                );
            }
        });
    }

    public void sendTemplatedEmail(String templateType, Map<String, String> replacements, String recipient) {
        try {
            logger.info("Preparing to send '" + templateType + "' email to " + recipient);

            String subject = config.getString("email.templates." + templateType + ".subject");
            String bodyTemplate = config.getString("email.templates." + templateType + ".body");

            if (subject == null || subject.isEmpty()) {
                logger.warning("Missing or empty 'subject' for email template: " + templateType);
                return;
            }
            if (bodyTemplate == null || bodyTemplate.isEmpty()) {
                logger.warning("Missing or empty 'body' for email template: " + templateType);
                return;
            }

            String emailBody = bodyTemplate;
            for (Map.Entry<String, String> replacement : replacements.entrySet()) {
                String placeholder = "{" + replacement.getKey() + "}";
                String value = replacement.getValue() != null ? replacement.getValue() : "N/A";
                emailBody = emailBody.replace(placeholder, value);
            }

            sendEmail(recipient, subject, emailBody);

        } catch (Exception e) {
            logger.severe("Failed to send templated email for '" + templateType + "': " + e.getMessage());
        }
    }

    public void sendRegistrationEmail(String username, String ign, String discord, String telegram, String email) {
        Map<String, String> replacements = new HashMap<>();
        replacements.put("username", username);
        replacements.put("ign", ign);
        replacements.put("discord", discord);
        replacements.put("telegram", telegram);
        replacements.put("email", email);

        sendTemplatedEmail("registration", replacements, email);
    }

    public void sendAcceptanceEmail(String username, String email) {
        Map<String, String> replacements = new HashMap<>();
        replacements.put("username", username);
        sendTemplatedEmail("acceptance", replacements, email);
    }

    public void sendDenialEmail(String username, String reason, String email) {
        Map<String, String> replacements = new HashMap<>();
        replacements.put("username", username);
        replacements.put("reason", reason);
        sendTemplatedEmail("denial", replacements, email);
    }

    public void sendAdminNotification(String ign, String discord, String telegram, String email, String type) {
        Map<String, String> replacements = new HashMap<>();
        replacements.put("ign", ign);
        replacements.put("discord", discord);
        replacements.put("telegram", telegram);
        replacements.put("email", email);
        replacements.put("type", type);

        List<String> adminEmails = config.getStringList("registration.notifications.admin_emails");
        if (adminEmails.isEmpty()) {
            logger.warning("No admin emails configured. Skipping admin_notification email.");
            return;
        }

        for (String adminEmail : adminEmails) {
            sendTemplatedEmail("admin_notification", replacements, adminEmail);
        }
    }

    public void sendVerificationEmail(String username, String verificationLink, String email) {
        Map<String, String> replacements = new HashMap<>();
        replacements.put("username", username);
        replacements.put("verification_link", verificationLink);

        sendTemplatedEmail("verification", replacements, email);
    }

    private void sendEmail(String recipient, String subject, String body) {
        try {
            logger.info("Attempting to send email to " + recipient + " with subject [" + subject + "]");
            Message message = new MimeMessage(emailSession);
            message.setFrom(new InternetAddress(config.getString("email.smtp.username")));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(recipient));
            message.setSubject(subject);
            message.setText(body);

            Transport.send(message);
            logger.info("Email sent successfully to: " + recipient);
        } catch (MessagingException e) {
            logger.severe("Failed to send email to " + recipient + ": " + e.getMessage());
        }
    }

    public String getTemplateSubject(String templateType) {
        return config.getString("email.templates." + templateType + ".subject", "No Subject");
    }

    public String getTemplateBody(String templateType) {
        return config.getString("email.templates." + templateType + ".body", "No Body");
    }
} 