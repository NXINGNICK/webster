package me.nxingnick.webster;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import fi.iki.elonen.NanoHTTPD;
import fi.iki.elonen.NanoHTTPD.IHTTPSession;
import fi.iki.elonen.NanoHTTPD.Method;
import fi.iki.elonen.NanoHTTPD.Response;
import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;

import javax.mail.*;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.security.SecureRandom;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.*;
import java.util.logging.Logger;
import java.util.stream.Collectors;

import static fi.iki.elonen.NanoHTTPD.newFixedLengthResponse;

import me.nxingnick.webster.commands.WebsterCommandExecutor;
import me.nxingnick.webster.database.DatabaseHelper;
import me.nxingnick.webster.email.EmailService;
import me.nxingnick.webster.email.EmailTemplateManager;
import me.nxingnick.webster.http.WebsterHttpServer;
import me.nxingnick.webster.security.SecurityUtils;
import me.nxingnick.webster.http.APIRouteHandler;

/**
 * Main plugin class. Combines multi-language content handling,
 * user signup, admin login, content management, email, CLI commands,
 * and integration with APIRouteHandler & DatabaseHelper.
 */
public final class WebsterPlugin extends JavaPlugin implements TabCompleter {

    private WebsterHttpServer server;
    private DatabaseHelper databaseHelper;
    private EmailService emailService;

    // Exposed so that others (like APIRouteHandler) can access the EmailTemplateManager
    public EmailTemplateManager emailManager;

    @Override
    public void onEnable() {
        getLogger().info("Webster plugin is starting...");
        saveDefaultConfig();
        loadConfig();
        setupDatabase();
        setupDirectories();
        this.emailManager = new EmailTemplateManager(getConfig(), getLogger());
        this.emailService = new EmailService(this);
        
        // Register commands
        WebsterCommandExecutor commandExecutor = new WebsterCommandExecutor(this);
        getCommand("wb").setExecutor(commandExecutor);
        getCommand("wb").setTabCompleter(commandExecutor);
        
        startServer();
        initializeEmail();
    }

    private void loadConfig() {
        boolean emailEnabled = getConfig().getBoolean("email.enabled", true);
        if (emailEnabled) {
            getLogger().info("Email functionality is enabled.");
        } else {
            getLogger().info("Email functionality is disabled.");
        }
    }

    /**
     * Generates a secure random token (length TOKEN_LENGTH).
     */
    public String generateSecureToken() {
        return SecurityUtils.generateSecureToken();
    }

    /**
     * Verifies an admin token in admin_accounts, ensuring it hasn't expired if that's how your DB logic is set up.
     */
    private boolean verifyAdminToken(String token) {
        if (token == null || token.isEmpty()) {
            return false;
        }
        return databaseHelper.verifyAdminToken(token);
    }

    /**
     * Sets up the DatabaseHelper instance from config, then prepares admin table if needed.
     */
    private void setupDatabase() {
        String host = getConfig().getString("mysql.host", "localhost");
        int port = getConfig().getInt("mysql.port", 3306);
        String database = getConfig().getString("mysql.database", "webster_db");
        String username = getConfig().getString("mysql.username", "root");
        String password = getConfig().getString("mysql.password", "password");

        databaseHelper = new DatabaseHelper(host, port, database, username, password);
        
        // Initialize all required tables
        databaseHelper.initializeTables();
    }

    /**
     * Creates admin_accounts table if not already present.
     */
    private void setupAdminTable() {
        try (Connection connection = databaseHelper.getConnection()) {
            String createAdminTableSql =
                  "CREATE TABLE IF NOT EXISTS admin_accounts ("
                + "id INT AUTO_INCREMENT PRIMARY KEY, "
                + "email VARCHAR(255) NOT NULL UNIQUE, "
                + "password VARCHAR(255) NOT NULL, "
                + "token VARCHAR(32), "
                + "token_created TIMESTAMP, "
                + "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, "
                + "last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)";
            try (PreparedStatement statement = connection.prepareStatement(createAdminTableSql)) {
                statement.execute();
            }
            getLogger().info("Admin accounts table initialized successfully");
        } catch (SQLException e) {
            getLogger().severe("Failed to initialize admin accounts table: " + e.getMessage());
        }
    }

    /**
     * Generates a secure password for newly created admin accounts (length ADMIN_PASSWORD_LENGTH).
     */
    public String generateSecurePassword() {
        return SecurityUtils.generateSecurePassword();
    }

    /**
     * Creates or updates an admin account. On conflict, updates the password.
     */
    public boolean createOrUpdateAdminAccount(String email, String password) {
        try (Connection connection = databaseHelper.getConnection()) {
            String upsertSql =
                "INSERT INTO admin_accounts (email, password) VALUES (?, ?) "
              + "ON DUPLICATE KEY UPDATE password = ?, last_login = CURRENT_TIMESTAMP";
            try (PreparedStatement statement = connection.prepareStatement(upsertSql)) {
                statement.setString(1, email);
                statement.setString(2, password);
                statement.setString(3, password);
                statement.executeUpdate();
                return true;
            }
        } catch (SQLException e) {
            getLogger().severe("Failed to create/update admin account: " + e.getMessage());
            return false;
        }
    }

    /**
     * Creates directories in plugin data folder if needed (like /active).
     */
    private void setupDirectories() {
        File activeFolder = new File(getDataFolder(), "active");
        if (!activeFolder.exists()) {
            activeFolder.mkdirs();
        }
    }

    /**
     * Starts the NanoHTTPD server, delegating most routes to APIRouteHandler,
     * but still providing fallback methods for certain routes or static file serving.
     */
    public void startServer() {
        if (!isServerRunning()) {
            int port = getConfig().getInt("server-port", 8080);
            try {
                // Handler that covers /auth/signup, /auth/login, /register, /users, /verify, /api/content, etc.
                APIRouteHandler apiHandler = new APIRouteHandler(this, databaseHelper);

                server = new WebsterHttpServer(port, this, databaseHelper);

                // Content management setup (page_content), default content
                setupContentManagement();

            } catch (IOException e) {
                getLogger().severe("Failed to start Webster HTTP server: " + e.getMessage());
            }
        }
    }

    /**
     * Fallback user signup if APIRouteHandler doesn't catch it.
     */
    private Response handleSignup(NanoHTTPD.IHTTPSession session) {
        try {
            Map<String, String> headers = session.getHeaders();
            int contentLength = Integer.parseInt(headers.getOrDefault("content-length", "0"));
            if (contentLength <= 0) {
                return newFixedLengthResponse(
                        Response.Status.BAD_REQUEST,
                        "application/json",
                        "{\"success\":false,\"message\":\"No request body.\"}"
                );
            }

            byte[] buffer = new byte[contentLength];
            session.getInputStream().read(buffer);
            String requestBody = new String(buffer);

            Map<String, String> body = new Gson().fromJson(
                    requestBody,
                    new TypeToken<Map<String, String>>(){}.getType()
            );
            String email = body.getOrDefault("email", "").trim();
            String password = body.getOrDefault("password", "").trim();

            if (email.isEmpty() || password.isEmpty()) {
                return newFixedLengthResponse(
                        Response.Status.BAD_REQUEST,
                        "application/json",
                        "{\"success\":false,\"message\":\"Email and password required.\"}"
                );
            }

            if (databaseHelper.createUserAccount(email, password)) {
                // optional email verification
                if (getConfig().getBoolean("email.enabled", true) && emailManager != null) {
                    String verificationToken = generateSecureToken();
                    databaseHelper.storeVerificationToken(email, verificationToken);

                    String linkBase = getConfig().getString(
                            "email.verificationLinkBase",
                            "http://localhost:8080/verify?token="
                    );
                    String verificationLink = linkBase + verificationToken;

                    emailManager.sendVerificationEmail(email, verificationLink, email);
                }

                Map<String, Object> responseData = new HashMap<>();
                responseData.put("success", true);
                responseData.put("token", generateSecureToken());
                return newFixedLengthResponse(
                        Response.Status.OK,
                        "application/json",
                        new Gson().toJson(responseData)
                );
            } else {
                return newFixedLengthResponse(
                        Response.Status.CONFLICT,
                        "application/json",
                        "{\"success\":false,\"message\":\"User may already exist.\"}"
                );
            }
        } catch (Exception e) {
            getLogger().severe("Error in fallback /auth/signup: " + e.getMessage());
            return newFixedLengthResponse(
                    Response.Status.INTERNAL_ERROR,
                    "application/json",
                    "{\"success\":false,\"message\":\"Signup error.\"}"
            );
        }
    }

    /**
     * Fallback admin login if APIRouteHandler doesn't cover it.
     */
    private Response handleAdminLogin(NanoHTTPD.IHTTPSession session) {
        try {
            Map<String, String> headers = session.getHeaders();
            int contentLength = Integer.parseInt(headers.getOrDefault("content-length", "0"));
            if (contentLength <= 0) {
                return newFixedLengthResponse(
                        Response.Status.BAD_REQUEST,
                        "application/json",
                        "{\"success\":false,\"message\":\"No request body.\"}"
                );
            }

            byte[] buffer = new byte[contentLength];
            session.getInputStream().read(buffer);
            String requestBody = new String(buffer);

            Map<String, String> body = new Gson().fromJson(
                    requestBody,
                    new TypeToken<Map<String, String>>(){}.getType()
            );
            String email = body.get("email");
            String password = body.get("password");

            if (verifyAdminLogin(email, password)) {
                // Typically you'd generate a new token or retrieve an existing one
                Map<String, Object> responseData = new HashMap<>();
                responseData.put("success", true);
                responseData.put("isAdmin", true);
                responseData.put("token", "SomeTokenHere");
                return newFixedLengthResponse(
                        Response.Status.OK,
                        "application/json",
                        new Gson().toJson(responseData)
                );
            } else {
                return newFixedLengthResponse(
                        Response.Status.UNAUTHORIZED,
                        "application/json",
                        "{\"success\":false,\"message\":\"Invalid admin credentials.\"}"
                );
            }
        } catch (Exception e) {
            getLogger().severe("Admin login fallback error: " + e.getMessage());
            return newFixedLengthResponse(
                    Response.Status.INTERNAL_ERROR,
                    "application/json",
                    "{\"success\":false,\"message\":\"Admin login error.\"}"
            );
        }
    }

    /**
     * Fallback GET /users => returns all users from DB.
     */
    private Response handleUsersList() {
        try {
            List<Map<String, String>> users = databaseHelper.getUsers("all");
            return newFixedLengthResponse(
                    Response.Status.OK,
                    "application/json",
                    new Gson().toJson(users)
            );
        } catch (Exception e) {
            getLogger().severe("Error in fallback /users: " + e.getMessage());
            return newFixedLengthResponse(
                    Response.Status.INTERNAL_ERROR,
                    "application/json",
                    "{\"success\":false,\"message\":\"Failed to fetch users.\"}"
            );
        }
    }

    /**
     * Requires valid admin token in 'authorization' header for any /admin/*
     * except the /admin/alogin.html page, which is handled outside this method.
     */
    private Response handleAdminProtectedRequest(IHTTPSession session, String uri) {
        String authToken = session.getHeaders().get("authorization");
        if (!verifyAdminToken(authToken)) {
            // Return 401 or 404 to avoid exposing the path
            return newFixedLengthResponse(
                    Response.Status.UNAUTHORIZED,
                    "text/plain",
                    "Admin token invalid or missing."
            );
        }

        // If token is valid, serve the requested file from /active/admin
        File f = new File(getDataFolder(), "active" + uri);
        if (f.exists() && f.isFile()) {
            return fileResponse(f);
        } else {
            return newFixedLengthResponse(
                    Response.Status.NOT_FOUND,
                    "text/plain",
                    "File not found: " + uri
            );
        }
    }

    /**
     * Serves a file from the /active folder or returns 404 if missing.
     */
    private NanoHTTPD.Response serveFile(NanoHTTPD.IHTTPSession session) {
        String uri = session.getUri();
        File activeFolder = new File(getDataFolder(), "active");

        // If the user requests "/", try index.html
        if (uri.equals("/")) {
            File indexFile = new File(activeFolder, "index.html");
            if (indexFile.exists() && indexFile.isFile()) {
                return fileResponse(indexFile);
            }
            return newFixedLengthResponse(
                    Response.Status.NOT_FOUND,
                    "text/plain",
                    "index.html not found."
            );
        }

        File requestedFile = new File(activeFolder, uri);
        if (requestedFile.exists() && requestedFile.isFile()) {
            return fileResponse(requestedFile);
        }

        return newFixedLengthResponse(
                Response.Status.NOT_FOUND,
                "text/plain",
                "File not found: " + uri
        );
    }

    /**
     * Creates an HTTP response from a file with the correct MIME type based on extension.
     */
    private Response fileResponse(File file) {
        try {
            String mimeType = getMimeType(file.getName());
            byte[] content = java.nio.file.Files.readAllBytes(file.toPath());
            return newFixedLengthResponse(
                    Response.Status.OK,
                    mimeType,
                    new ByteArrayInputStream(content),
                    content.length
            );
        } catch (IOException e) {
            return newFixedLengthResponse(
                    Response.Status.INTERNAL_ERROR,
                    "text/plain",
                    "Error reading file: " + e.getMessage()
            );
        }
    }

    /**
     * Basic MIME type determination by file extension.
     */
    private String getMimeType(String fileName) {
        if (fileName.endsWith(".html")) return "text/html";
        if (fileName.endsWith(".css")) return "text/css";
        if (fileName.endsWith(".js")) return "application/javascript";
        if (fileName.endsWith(".png")) return "image/png";
        if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) return "image/jpeg";
        return "text/plain";
    }

    /**
     * Sends an email notice to admin emails if configured, using fallback approach.
     */
    private void sendEmailToAdmins(String subject, String body) {
        List<String> adminEmails = getConfig().getStringList("adminEmails");
        if (adminEmails.isEmpty()) {
            getLogger().warning("No admin emails configured. Skipping admin email notifications.");
            return;
        }
        for (String adminEmail : adminEmails) {
            emailService.sendEmail(adminEmail, subject, body);
        }
    }

    /**
     * Called after a user registers. Attempts a templated email using EmailTemplateManager,
     * or a fallback if manager is null, and notifies admins of new registration.
     */
    protected void handleRegistrationEmail(String ign, String discord, String telegram, String email, String type) {
        if (emailManager != null) {
            Map<String, String> replacements = new HashMap<>();
            replacements.put("ign", ign);
            replacements.put("discord", discord);
            replacements.put("telegram", telegram);
            replacements.put("email", email);
            replacements.put("type", type);

            // Send a registration email to the user
            emailManager.sendTemplatedEmail("registration", replacements, email);

            // Notify admins
            List<String> adminEmails = getConfig().getStringList("registration.notifications.admin_emails");
            for (String adminEmail : adminEmails) {
                emailManager.sendTemplatedEmail("admin_notification", replacements, adminEmail);
            }
        } else {
            // Fallback if emailManager is null
            if (getConfig().getBoolean("email.enabled", true)) {
                emailService.sendEmail(email, "Welcome to Eden Gate 2.0!", "Thank you for registering!");
            }

            String adminSubject = "New User Registration";
            String adminBody = String.format(
                    "A new user has registered:\n\n"
                            + "IGN: %s\n"
                            + "Discord: %s\n"
                            + "Telegram: %s\n"
                            + "Email: %s\n"
                            + "Platform: %s\n\n"
                            + "Please review the registration and take action.",
                    ign, discord, telegram, email, type
            );
            sendEmailToAdmins(adminSubject, adminBody);
        }
    }

    /**
     * Cleanly stops the HTTP server on plugin disable.
     */
    @Override
    public void onDisable() {
        if (server != null) {
            server.stop();
            getLogger().info("Webster HTTP server stopped.");
        }
    }

    /**
     * CLI commands for controlling the HTTP server, admin accounts, user registration management, etc.
     */
    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!command.getName().equalsIgnoreCase("wb") && !command.getName().equalsIgnoreCase("webster")) {
            return false;
        }
        if (args.length == 0) {
            sender.sendMessage("Usage: /wb <start|stop|status|reg list|reg accept|reg deny|alogin|email>");
            return true;
        }

        switch (args[0].toLowerCase()) {
            case "start" -> {
                if (isServerRunning()) {
                    sender.sendMessage("Webster server is already running.");
                } else {
                    startServer();
                    sender.sendMessage("Webster server started.");
                }
            }
            case "stop" -> {
                if (!isServerRunning()) {
                    sender.sendMessage("Webster server is not running.");
                } else {
                    stopServer();
                    sender.sendMessage("Webster server stopped.");
                }
            }
            case "status" -> {
                if (isServerRunning()) {
                    sender.sendMessage("Webster server is running.");
                } else {
                    sender.sendMessage("Webster server is not running.");
                }
            }
            case "alogin" -> {
                // Create or update admin accounts from console or in-game
                if (!sender.hasPermission("webster.admin")) {
                    sender.sendMessage("§cYou don't have permission to use this command.");
                    return true;
                }
                if (args.length != 2) {
                    sender.sendMessage("§cUsage: /wb alogin <email>");
                    return true;
                }

                String adminEmail = args[1].toLowerCase();
                String generatedPassword = generateSecurePassword();

                if (createOrUpdateAdminAccount(adminEmail, generatedPassword)) {
                    sender.sendMessage("§aAdmin account created/updated!");
                    sender.sendMessage("§6Email: §f" + adminEmail);
                    sender.sendMessage("§6Password: §f" + generatedPassword);
                    sender.sendMessage("§ePassword is only shown once!");
                    getLogger().info("Admin account created/updated for: " + adminEmail);
                } else {
                    sender.sendMessage("§cFailed to create or update admin account.");
                }
            }
            case "reg" -> {
                // Registration management: /wb reg list|accept|deny
                if (args.length < 2) {
                    sender.sendMessage("Usage: /wb reg <list|accept|deny>");
                    return true;
                }
                switch (args[1].toLowerCase()) {
                    case "list" -> {
                        String listType = (args.length > 2) ? args[2].toLowerCase() : "all";
                        if (!listType.equals("all") && !listType.equals("accepted") && !listType.equals("denied")) {
                            sender.sendMessage("Usage: /wb reg list <all|accepted|denied>");
                            return true;
                        }
                        List<Map<String, String>> users = databaseHelper.getUsers(listType);
                        if (users.isEmpty()) {
                            sender.sendMessage("No users found for type: " + listType);
                        } else {
                            sender.sendMessage("=== " + listType.toUpperCase() + " Users ===");
                            for (Map<String, String> user : users) {
                                sender.sendMessage(
                                    "IGN: " + user.get("ign")
                                        + ", Discord: " + user.get("discord")
                                        + ", Telegram: " + user.get("telegram")
                                        + ", Email: " + user.get("email")
                                        + ", Type: " + user.get("type")
                                );
                            }
                        }
                    }
                    case "accept" -> {
                        if (args.length < 3) {
                            sender.sendMessage("Usage: /wb reg accept <ign>");
                            return true;
                        }
                        String providedIgn = args[2].replace("\"", "");
                        boolean userFound = false;

                        List<Map<String, String>> allUsers = databaseHelper.getUsers("all");
                        for (Map<String, String> user : allUsers) {
                            String storedIgn = user.get("ign");
                            if (storedIgn == null) continue;

                            String[] ignParts = storedIgn.split("\\[]");
                            boolean matchFound = Arrays.stream(ignParts)
                                    .anyMatch(part -> part.equalsIgnoreCase(providedIgn));

                            if (matchFound) {
                                boolean accepted = databaseHelper.acceptUser(
                                        storedIgn,
                                        (sender instanceof Player) ? sender.getName() : "Console"
                                );
                                if (accepted) {
                                    sender.sendMessage("User " + storedIgn + " accepted; proceed to whitelist.");

                                    String javaIgn = ignParts[0];
                                    String bedrockIgn = (ignParts.length > 1) ? ignParts[1] : null;

                                    String javaCommand = getConfig().getString(
                                            "whitelist.java",
                                            "/whitelist add {ign}"
                                    ).replace("{ign}", javaIgn);
                                    getServer().dispatchCommand(
                                            getServer().getConsoleSender(),
                                            javaCommand
                                    );

                                    if (bedrockIgn != null && !bedrockIgn.equals("none")) {
                                        String bedrockCommand = getConfig().getString(
                                                "whitelist.bedrock",
                                                "/fwhitelist add \"{ign}\""
                                        ).replace("{ign}", bedrockIgn);
                                        getServer().dispatchCommand(
                                                getServer().getConsoleSender(),
                                                bedrockCommand
                                        );
                                    }
                                    userFound = true;
                                    break;
                                }
                            }
                        }
                        if (!userFound) sender.sendMessage("User " + providedIgn + " not found.");
                    }
                    case "deny" -> {
                        if (args.length < 4) {
                            sender.sendMessage("Usage: /wb reg deny <ign> <reason>");
                            return true;
                        }
                        String ign = args[2].replace("\"", "");
                        String reason = Arrays.stream(args).skip(3).collect(Collectors.joining(" "));
                        String deniedBy = (sender instanceof Player) ? sender.getName() : "Console";

                        if (databaseHelper.denyUser(ign, deniedBy, reason)) {
                            sender.sendMessage("User " + ign + " denied. Reason: " + reason);
                        } else {
                            sender.sendMessage("User " + ign + " not found in 'users'.");
                        }
                    }
                    default -> sender.sendMessage("Usage: /wb reg <list|accept|deny>");
                }
            }
            case "email" -> {
                // /wb email <recipient> <message>
                if (args.length < 3) {
                    sender.sendMessage("Usage: /wb email <recipient> <message>");
                    return true;
                }
                String recipient = args[1];
                String textMessage = Arrays.stream(args).skip(2).collect(Collectors.joining(" "));

                emailService.sendEmail(recipient, "This is a text email", textMessage);
                sender.sendMessage("Email sent to " + recipient + " subject 'This is a text email'");
            }
            default -> {
                sender.sendMessage("Unknown command. /wb <start|stop|status|reg list|reg accept|reg deny|alogin|email>");
            }
        }
        return true;
    }

    /**
     * Basic tab completion for /wb commands.
     */
    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        if (!command.getName().equalsIgnoreCase("wb") && !command.getName().equalsIgnoreCase("webster")) {
            return Collections.emptyList();
        }
        if (args.length == 1) {
            List<String> cmds = new ArrayList<>(Arrays.asList("start", "stop", "status", "reg", "email"));
            if (sender.hasPermission("webster.admin")) {
                cmds.add("alogin");
            }
            return cmds;
        } else if (args.length == 2 && args[0].equalsIgnoreCase("reg")) {
            return Arrays.asList("list", "accept", "deny");
        } else if (args.length == 3 && args[0].equalsIgnoreCase("reg") && args[1].equalsIgnoreCase("list")) {
            return Arrays.asList("all", "accepted", "denied");
        }
        return Collections.emptyList();
    }

    /**
     * Checks if the server is running (i.e., server != null).
     */
    public boolean isServerRunning() {
        return server != null;
    }

    /**
     * Verifies admin credentials by email & password, and stores a new token if valid.
     */
    public boolean verifyAdminLogin(String email, String password) {
        try (Connection connection = databaseHelper.getConnection()) {
            String sql = "SELECT password FROM admin_accounts WHERE email = ?";
            try (PreparedStatement stmt = connection.prepareStatement(sql)) {
                stmt.setString(1, email);
                var rs = stmt.executeQuery();
                if (rs.next()) {
                    String storedPassword = rs.getString("password");
                    if (password.equals(storedPassword)) {
                        // store a new token
                        String token = generateSecureToken();
                        return databaseHelper.storeAdminToken(email, token);
                    }
                }
            }
        } catch (SQLException e) {
            getLogger().severe("Failed to verify admin login: " + e.getMessage());
        }
        return false;
    }

    /**
     * Ensures page_content table is created and loads default content if table is empty.
     */
    private void setupContentManagement() {
        if (databaseHelper != null) {
            databaseHelper.initializeContentTable();
            getLogger().info("Content management system initialized successfully.");
        } else {
            getLogger().severe("Failed to initialize content management; databaseHelper is null.");
        }
    }

    public DatabaseHelper getDatabaseHelper() {
        return databaseHelper;
    }

    public EmailService getEmailService() {
        return emailService;
    }

    public void stopServer() {
        if (server != null) {
            server.stop();
            server = null;
            getLogger().info("Webster HTTP server stopped.");
        }
    }

    public EmailTemplateManager getEmailManager() {
        return emailManager;
    }

    private void initializeEmail() {
        if (getConfig().getBoolean("email.enabled", true)) {
            try {
                emailService = new EmailService(this);
                if (emailService.testConnection()) {
                    getLogger().info("Email service initialized successfully");
                } else {
                    getLogger().warning("Email service failed connection test");
                }
            } catch (Exception e) {
                getLogger().severe("Failed to initialize email service: " + e.getMessage());
                e.printStackTrace();
            }
        } else {
            getLogger().info("Email service is disabled in config");
        }
    }
}