package me.nxingnick.webster.email;

import org.bukkit.configuration.file.FileConfiguration;

import javax.mail.*;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.logging.Logger;

public class EmailService {
    private final Properties props;
    private final String username;
    private final String password;
    private final String from;
    private final Logger logger;
    private final WebsterPlugin plugin;

    public EmailService(WebsterPlugin plugin) {
        this.plugin = plugin;
        this.logger = plugin.getLogger();
        
        FileConfiguration config = plugin.getConfig();
        this.username = config.getString("email.smtp.username");
        this.password = config.getString("email.smtp.password");
        this.from = config.getString("email.smtp.from", username);

        props = new Properties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.host", config.getString("email.smtp.host"));
        props.put("mail.smtp.port", config.getString("email.smtp.port"));
        
        // Add debug for troubleshooting
        props.put("mail.debug", "true");
        props.put("mail.debug.auth", "true");
    }

    public void sendTemplatedEmail(String to, String templateName, Map<String, String> data) {
        try {
            String templatePath = "email-templates/" + plugin.getConfig().getString("email.templates." + templateName + ".template");
            String subject = plugin.getConfig().getString("email.templates." + templateName + ".subject");
            
            // Load template
            String template = loadTemplate(templatePath);
            if (template == null) {
                logger.severe("Failed to load email template: " + templatePath);
                return;
            }

            // Replace placeholders
            String content = replacePlaceholders(template, data);

            // Send email
            Session session = Session.getInstance(props, new Authenticator() {
                @Override
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(username, password);
                }
            });

            // Enable session debug
            session.setDebug(true);

            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(from));
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(to));
            message.setSubject(subject);

            // Set HTML content
            message.setContent(content, "text/html; charset=utf-8");

            logger.info("Sending email to: " + to);
            Transport.send(message);
            logger.info("Email sent successfully to: " + to);

        } catch (Exception e) {
            logger.severe("Failed to send email to " + to + ": " + e.getMessage());
            e.printStackTrace();
        }
    }

    private String loadTemplate(String path) {
        try {
            InputStream is = plugin.getResource(path);
            if (is == null) {
                logger.severe("Template not found: " + path);
                return null;
            }
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            logger.severe("Error loading template " + path + ": " + e.getMessage());
            return null;
        }
    }

    private String replacePlaceholders(String template, Map<String, String> data) {
        String result = template;
        for (Map.Entry<String, String> entry : data.entrySet()) {
            result = result.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }
        return result;
    }

    public boolean testConnection() {
        try {
            Session session = Session.getInstance(props, new Authenticator() {
                @Override
                protected PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(username, password);
                }
            });

            Transport transport = session.getTransport("smtp");
            transport.connect();
            transport.close();
            logger.info("SMTP connection test successful");
            return true;
        } catch (Exception e) {
            logger.severe("SMTP connection test failed: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
} 
} 
} 