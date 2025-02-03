package me.nxingnick.webster.http;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import fi.iki.elonen.NanoHTTPD;
import fi.iki.elonen.NanoHTTPD.IHTTPSession;
import fi.iki.elonen.NanoHTTPD.Response;
import fi.iki.elonen.NanoHTTPD.Response.Status;
import me.nxingnick.webster.WebsterPlugin;
import me.nxingnick.webster.database.DatabaseHelper;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import java.util.logging.Logger;

import static fi.iki.elonen.NanoHTTPD.newFixedLengthResponse;

/**
 * APIRouteHandler handles various HTTP endpoints:
 *  - /auth/signup => normal user account creation
 *  - /auth/login => normal user login
 *  - /admin/login => admin login
 *  - /verify (GET/POST) => email verification
 *  - /register => external user registration
 *  - /users => retrieve a list of users
 *  - /api/content => multi-language content retrieval/updates
 */
public class APIRouteHandler {
    private final WebsterPlugin plugin;
    private final DatabaseHelper databaseHelper;
    private final Logger logger;
    private final Gson gson;

    public APIRouteHandler(WebsterPlugin plugin, DatabaseHelper databaseHelper) {
        this.plugin = plugin;
        this.databaseHelper = databaseHelper;
        this.logger = Logger.getLogger("Webster");
        this.gson = new Gson();
    }

    public Response handleRegistration(IHTTPSession session) {
        try {
            Map<String, String> body = new HashMap<>();
            session.parseBody(body);
            String jsonBody = body.get("postData");
            Map<String, String> regData = gson.fromJson(jsonBody, new TypeToken<Map<String, String>>(){}.getType());

            String ign = regData.get("ign");
            String discord = regData.get("discord");
            String telegram = regData.get("telegram");
            String email = regData.get("email");
            String type = regData.get("type");

            if (ign == null || discord == null || email == null || type == null) {
                Map<String, Object> errorMap = new HashMap<>();
                errorMap.put("success", false);
                errorMap.put("message", "All required fields must be filled");
                return newFixedLengthResponse(
                    Response.Status.BAD_REQUEST,
                    "application/json",
                    gson.toJson(errorMap)
                );
            }

            try (Connection conn = databaseHelper.getConnection()) {
                // Check existing user
                String checkSql = "SELECT status FROM users WHERE ign = ? OR discord = ? OR email = ?";
                try (PreparedStatement checkStmt = conn.prepareStatement(checkSql)) {
                    checkStmt.setString(1, ign);
                    checkStmt.setString(2, discord);
                    checkStmt.setString(3, email);
                    ResultSet rs = checkStmt.executeQuery();
                    
                    if (rs.next()) {
                        String status = rs.getString("status");
                        String message = status.equals("pending") ? 
                            "Your registration is still pending" :
                            status.equals("accepted") ? 
                                "You are already registered" :
                                "Your previous registration was denied";
                        
                        Map<String, Object> errorMap = new HashMap<>();
                        errorMap.put("success", false);
                        errorMap.put("message", message);
                        return newFixedLengthResponse(
                            Response.Status.CONFLICT,
                            "application/json",
                            gson.toJson(errorMap)
                        );
                    }
                }

                // Insert new registration
                String sql = """
                    INSERT INTO users (ign, discord, telegram, email, type, status, created_at)
                    VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
                """;
                
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setString(1, ign);
                    stmt.setString(2, discord);
                    stmt.setString(3, telegram);
                    stmt.setString(4, email);
                    stmt.setString(5, type);
                    stmt.executeUpdate();

                    // Send email notifications
                    Map<String, String> emailData = new HashMap<>();
                    emailData.put("username", email);
                    emailData.put("ign", ign);
                    emailData.put("discord", discord);
                    emailData.put("telegram", telegram != null ? telegram : "Not provided");
                    emailData.put("email", email);
                    emailData.put("type", type);

                    // Send confirmation to user
                    plugin.getEmailService().sendTemplatedEmail(
                        email,
                        "registration",
                        emailData
                    );

                    // Notify admins
                    List<String> adminEmails = plugin.getConfig().getStringList("registration.notifications.admin_emails");
                    for (String adminEmail : adminEmails) {
                        plugin.getEmailService().sendTemplatedEmail(
                            adminEmail,
                            "admin_notification",
                            emailData
                        );
                    }

                    Map<String, Object> responseMap = new HashMap<>();
                    responseMap.put("success", true);
                    responseMap.put("message", "Registration submitted successfully. Please wait for admin approval.");
                    return newFixedLengthResponse(
                        Response.Status.OK,
                        "application/json",
                        gson.toJson(responseMap)
                    );
                }
            }
        } catch (Exception e) {
            logger.severe("Error in registration endpoint: " + e.getMessage());
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("success", false);
            errorMap.put("message", "Server error during registration");
            return newFixedLengthResponse(
                Response.Status.INTERNAL_ERROR,
                "application/json",
                gson.toJson(errorMap)
            );
        }
    }

    public Response handleLogin(IHTTPSession session) {
        try {
            Map<String, String> body = new HashMap<>();
            session.parseBody(body);
            String jsonBody = body.get("postData");
            Map<String, String> loginData = gson.fromJson(jsonBody, new TypeToken<Map<String, String>>(){}.getType());

            String email = loginData.get("email");
            String password = loginData.get("password");

            if (email == null || password == null) {
                Map<String, Object> errorMap = new HashMap<>();
                errorMap.put("success", false);
                errorMap.put("message", "Email and password are required");
                return newFixedLengthResponse(
                    Response.Status.BAD_REQUEST,
                    "application/json",
                    gson.toJson(errorMap)
                );
            }

            try (Connection conn = databaseHelper.getConnection()) {
                String sql = """
                    SELECT id, verified 
                    FROM user_accounts 
                    WHERE email = ? AND password = ?
                """;
                
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setString(1, email);
                    stmt.setString(2, password); // Note: In production, use proper password hashing
                    
                    var rs = stmt.executeQuery();
                    if (rs.next()) {
                        boolean verified = rs.getBoolean("verified");
                        if (!verified) {
                            Map<String, Object> errorMap = new HashMap<>();
                            errorMap.put("success", false);
                            errorMap.put("message", "Please verify your email before logging in");
                            return newFixedLengthResponse(
                                Response.Status.UNAUTHORIZED,
                                "application/json",
                                gson.toJson(errorMap)
                            );
                        }

                        String token = plugin.generateSecureToken();
                        
                        String updateSql = """
                            UPDATE user_accounts 
                            SET token = ?, token_created = CURRENT_TIMESTAMP, last_login = CURRENT_TIMESTAMP 
                            WHERE email = ?
                        """;
                        try (PreparedStatement updateStmt = conn.prepareStatement(updateSql)) {
                            updateStmt.setString(1, token);
                            updateStmt.setString(2, email);
                            updateStmt.executeUpdate();
                        }

                        Map<String, Object> responseMap = new HashMap<>();
                        responseMap.put("success", true);
                        responseMap.put("token", token);
                        responseMap.put("email", email);

                        return newFixedLengthResponse(
                            Response.Status.OK,
                            "application/json",
                            gson.toJson(responseMap)
                        );
                    }
                }
            }

            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("success", false);
            errorMap.put("message", "Invalid email or password");
            return newFixedLengthResponse(
                Response.Status.UNAUTHORIZED,
                "application/json",
                gson.toJson(errorMap)
            );

        } catch (Exception e) {
            logger.severe("Error in login endpoint: " + e.getMessage());
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("success", false);
            errorMap.put("message", "Server error during login");
            return newFixedLengthResponse(
                Response.Status.INTERNAL_ERROR,
                "application/json",
                gson.toJson(errorMap)
            );
        }
    }

    public Response handleVerification(IHTTPSession session) {
        try {
            String token = session.getParameters().get("token").get(0);
            if (token == null || token.isEmpty()) {
                Map<String, Object> errorMap = new HashMap<>();
                errorMap.put("success", false);
                errorMap.put("message", "Token is required");
                Response response = newFixedLengthResponse(
                    Response.Status.REDIRECT,
                    "text/plain",
                    gson.toJson(errorMap)
                );
                response.addHeader("Location", "/login/verification-success.html?error=token_required");
                return response;
            }

            try (Connection conn = databaseHelper.getConnection()) {
                String sql = """
                    UPDATE user_accounts 
                    SET verified = TRUE 
                    WHERE verification_token = ? 
                    AND token_created > DATE_SUB(NOW(), INTERVAL 24 HOUR)
                    AND verified = FALSE
                """;
                
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setString(1, token);
                    int updated = stmt.executeUpdate();
                    
                    Response response;
                    if (updated > 0) {
                        Map<String, Object> successMap = new HashMap<>();
                        successMap.put("success", true);
                        successMap.put("message", "Verification successful");
                        response = newFixedLengthResponse(
                            Response.Status.REDIRECT,
                            "text/plain",
                            gson.toJson(successMap)
                        );
                        response.addHeader("Location", "/login/verification-success.html?status=success");
                    } else {
                        Map<String, Object> errorMap = new HashMap<>();
                        errorMap.put("success", false);
                        errorMap.put("message", "Invalid or expired token");
                        response = newFixedLengthResponse(
                            Response.Status.REDIRECT,
                            "text/plain",
                            gson.toJson(errorMap)
                        );
                        response.addHeader("Location", "/login/verification-success.html?error=invalid_token");
                    }
                    return response;
                }
            }
        } catch (Exception e) {
            logger.severe("Error in verification endpoint: " + e.getMessage());
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("success", false);
            errorMap.put("message", "Server error during verification");
            Response response = newFixedLengthResponse(
                Response.Status.REDIRECT,
                "text/plain",
                gson.toJson(errorMap)
            );
            response.addHeader("Location", "/login/verification-success.html?error=server_error");
            return response;
        }
    }

    public Response handleContentGet(IHTTPSession session) {
        Response authCheck = checkAdminAuth(session);
        if (authCheck != null) return authCheck;

        try {
            Map<String, List<String>> params = session.getParameters();
            String page = params.getOrDefault("page", List.of("index")).get(0);
            String lang = params.getOrDefault("lang", List.of("en")).get(0);

            try (Connection conn = databaseHelper.getConnection()) {
                String sql = """
                    SELECT section_id, content 
                    FROM page_content 
                    WHERE page_id = ? AND language = ?
                """;
                
                Map<String, String> content = new HashMap<>();
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setString(1, page);
                    stmt.setString(2, lang);
                    ResultSet rs = stmt.executeQuery();
                    
                    while (rs.next()) {
                        content.put(rs.getString("section_id"), rs.getString("content"));
                    }
                }

                Map<String, Object> responseMap = new HashMap<>();
                responseMap.put("success", true);
                responseMap.put("content", content);

                String jsonResponse = gson.toJson(responseMap);
                logger.info("Content response: " + jsonResponse);

                return newFixedLengthResponse(
                    Response.Status.OK,
                    "application/json",
                    jsonResponse
                );
            }
        } catch (Exception e) {
            logger.severe("Error getting content: " + e.getMessage());
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("success", false);
            errorMap.put("message", "Failed to load content");
            
            return newFixedLengthResponse(
                Response.Status.INTERNAL_ERROR,
                "application/json",
                gson.toJson(errorMap)
            );
        }
    }

    public Response handleContentUpdate(IHTTPSession session) {
        Response authCheck = checkAdminAuth(session);
        if (authCheck != null) return authCheck;

        try {
            Map<String, String> body = new HashMap<>();
            session.parseBody(body);
            String jsonBody = body.get("postData");
            Map<String, Object> updateData = gson.fromJson(
                jsonBody, 
                new TypeToken<Map<String, Object>>(){}.getType()
            );

            String page = (String) updateData.get("page");
            String lang = (String) updateData.get("lang");
            @SuppressWarnings("unchecked")
            Map<String, String> content = (Map<String, String>) updateData.get("content");
            String modifiedBy = (String) updateData.get("modifiedBy");

            try (Connection conn = databaseHelper.getConnection()) {
                String sql = """
                    INSERT INTO page_content (page_id, section_id, language, content, modified_by, modified_at)
                    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON DUPLICATE KEY UPDATE 
                        content = VALUES(content),
                        modified_by = VALUES(modified_by),
                        modified_at = CURRENT_TIMESTAMP
                """;

                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    for (Map.Entry<String, String> entry : content.entrySet()) {
                        stmt.setString(1, page);
                        stmt.setString(2, entry.getKey());
                        stmt.setString(3, lang);
                        stmt.setString(4, entry.getValue());
                        stmt.setString(5, modifiedBy);
                        stmt.executeUpdate();
                    }
                }

                Map<String, Object> responseMap = new HashMap<>();
                responseMap.put("success", true);
                responseMap.put("message", "Content updated successfully");
                return newFixedLengthResponse(
                    Response.Status.OK,
                    "application/json",
                    gson.toJson(responseMap)
                );
            }
        } catch (Exception e) {
            logger.severe("Error updating content: " + e.getMessage());
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("success", false);
            errorMap.put("message", "Failed to update content");
            return newFixedLengthResponse(
                Response.Status.INTERNAL_ERROR,
                "application/json",
                gson.toJson(errorMap)
            );
        }
    }

    public Response handleSignup(IHTTPSession session) {
        try {
            Map<String, String> body = new HashMap<>();
            session.parseBody(body);
            String jsonBody = body.get("postData");
            Map<String, String> signupData = gson.fromJson(jsonBody, new TypeToken<Map<String, String>>(){}.getType());

            String email = signupData.get("email");
            String password = signupData.get("password");

            if (email == null || password == null) {
                Map<String, Object> errorMap = new HashMap<>();
                errorMap.put("success", false);
                errorMap.put("message", "Email and password are required");
                return newFixedLengthResponse(
                    Response.Status.BAD_REQUEST,
                    "application/json",
                    gson.toJson(errorMap)
                );
            }

            try (Connection conn = databaseHelper.getConnection()) {
                // Check if email exists
                String checkSql = "SELECT 1 FROM user_accounts WHERE email = ?";
                try (PreparedStatement checkStmt = conn.prepareStatement(checkSql)) {
                    checkStmt.setString(1, email);
                    if (checkStmt.executeQuery().next()) {
                        Map<String, Object> errorMap = new HashMap<>();
                        errorMap.put("success", false);
                        errorMap.put("message", "Email already exists");
                        return newFixedLengthResponse(
                            Response.Status.CONFLICT,
                            "application/json",
                            gson.toJson(errorMap)
                        );
                    }
                }

                String sql = """
                    INSERT INTO user_accounts (email, password, verification_token, token_created)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                """;
                
                String verificationToken = plugin.generateSecureToken();
                
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setString(1, email);
                    stmt.setString(2, password);
                    stmt.setString(3, verificationToken);
                    stmt.executeUpdate();

                    String verificationLink = plugin.getConfig().getString("email.verificationLinkBase", "http://localhost:8080/verify?token=") 
                        + verificationToken;
                    
                    Map<String, String> emailData = new HashMap<>();
                    emailData.put("username", email);
                    emailData.put("verification_link", verificationLink);
                    
                    plugin.getEmailService().sendTemplatedEmail(
                        email,
                        "verification",
                        emailData
                    );

                    Map<String, Object> responseMap = new HashMap<>();
                    responseMap.put("success", true);
                    responseMap.put("message", "Account created. Please check your email.");
                    return newFixedLengthResponse(
                        Response.Status.OK,
                        "application/json",
                        gson.toJson(responseMap)
                    );
                }
            }
        } catch (Exception e) {
            logger.severe("Error in signup endpoint: " + e.getMessage());
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("success", false);
            errorMap.put("message", "Server error during signup");
            return newFixedLengthResponse(
                Response.Status.INTERNAL_ERROR,
                "application/json",
                gson.toJson(errorMap)
            );
        }
    }

    private boolean verifyAuthToken(String token) {
        if (token == null || token.isEmpty()) return false;
        
        try (Connection conn = databaseHelper.getConnection()) {
            // First check admin tokens
            String adminSql = """
                SELECT 1 FROM admin_accounts 
                WHERE token = ? 
                AND token_created > DATE_SUB(NOW(), INTERVAL 24 HOUR)
            """;
            try (PreparedStatement stmt = conn.prepareStatement(adminSql)) {
                stmt.setString(1, token);
                ResultSet rs = stmt.executeQuery();
                if (rs.next()) {
                    return true; // Valid admin token
                }
            }

            // If not admin token, check user tokens
            String userSql = """
                SELECT 1 FROM user_accounts 
                WHERE token = ? 
                AND token_created > DATE_SUB(NOW(), INTERVAL 24 HOUR)
                AND verified = TRUE
            """;
            try (PreparedStatement stmt = conn.prepareStatement(userSql)) {
                stmt.setString(1, token);
                ResultSet rs = stmt.executeQuery();
                return rs.next();
            }
        } catch (SQLException e) {
            logger.severe("Error verifying auth token: " + e.getMessage());
            return false;
        }
    }

    private String getAuthToken(IHTTPSession session) {
        Map<String, String> headers = session.getHeaders();
        logger.info("Headers received: " + headers);
        
        String auth = headers.get("authorization");
        logger.info("Auth header: " + (auth != null ? "present" : "missing"));
        
        if (auth != null && auth.startsWith("Bearer ")) {
            return auth.substring(7);
        }
        return null;
    }

    public Response checkAuth(IHTTPSession session) {
        String token = getAuthToken(session);
        if (!verifyAuthToken(token)) {
            return newFixedLengthResponse(
                Response.Status.UNAUTHORIZED,
                "application/json",
                "{\"success\":false,\"message\":\"Invalid or expired token\"}"
            );
        }
        return null; // Auth successful
    }

    public Response handleProtectedEndpoint(IHTTPSession session) {
        // Check auth first
        Response authCheck = checkAuth(session);
        if (authCheck != null) return authCheck;

        // Continue with endpoint logic...
        return null;
    }

    public Response handleAdminLogin(IHTTPSession session) {
        try {
            Map<String, String> body = new HashMap<>();
            session.parseBody(body);
            String jsonBody = body.get("postData");
            logger.info("Admin login attempt with body: " + jsonBody);

            Map<String, String> loginData = gson.fromJson(jsonBody, new TypeToken<Map<String, String>>(){}.getType());
            String email = loginData.get("email");
            String password = loginData.get("password");

            logger.info("Admin login attempt for email: " + email);

            if (email == null || password == null) {
                Map<String, Object> errorMap = new HashMap<>();
                errorMap.put("success", false);
                errorMap.put("message", "Email and password are required");
                
                return newFixedLengthResponse(
                    Response.Status.BAD_REQUEST,
                    "application/json",
                    gson.toJson(errorMap)
                );
            }

            try (Connection conn = databaseHelper.getConnection()) {
                String sql = "SELECT id FROM admin_accounts WHERE email = ? AND password = ?";
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.setString(1, email);
                    stmt.setString(2, password);
                    
                    ResultSet rs = stmt.executeQuery();
                    if (rs.next()) {
                        String token = plugin.generateSecureToken();
                        logger.info("Generated admin token: " + token);
                        
                        // Store token
                        String updateSql = """
                            UPDATE admin_accounts 
                            SET token = ?, 
                                token_created = CURRENT_TIMESTAMP,
                                last_login = CURRENT_TIMESTAMP 
                            WHERE email = ?
                        """;
                        try (PreparedStatement updateStmt = conn.prepareStatement(updateSql)) {
                            updateStmt.setString(1, token);
                            updateStmt.setString(2, email);
                            updateStmt.executeUpdate();
                        }

                        Map<String, Object> responseMap = new HashMap<>();
                        responseMap.put("success", true);
                        responseMap.put("token", token);
                        responseMap.put("email", email);
                        responseMap.put("isAdmin", true);

                        return newFixedLengthResponse(
                            Response.Status.OK,
                            "application/json",
                            gson.toJson(responseMap)
                        );
                    }
                }
            }

            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("success", false);
            errorMap.put("message", "Invalid admin credentials");

            return newFixedLengthResponse(
                Response.Status.UNAUTHORIZED,
                "application/json",
                gson.toJson(errorMap)
            );

        } catch (Exception e) {
            logger.severe("Error in admin login endpoint: " + e.getMessage());
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("success", false);
            errorMap.put("message", "Server error during admin login");
            
            return newFixedLengthResponse(
                Response.Status.INTERNAL_ERROR,
                "application/json",
                gson.toJson(errorMap)
            );
        }
    }

    private boolean verifyAdminToken(String token) {
        if (token == null || token.isEmpty()) {
            logger.warning("Token is null or empty");
            return false;
        }
        
        try (Connection conn = databaseHelper.getConnection()) {
            String sql = """
                SELECT 1 FROM admin_accounts 
                WHERE token = ? 
                AND token_created > DATE_SUB(NOW(), INTERVAL 24 HOUR)
            """;
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, token);
                ResultSet rs = stmt.executeQuery();
                boolean isValid = rs.next();
                logger.info("Admin token verification result: " + isValid);
                return isValid;
            }
        } catch (SQLException e) {
            logger.severe("Error verifying admin token: " + e.getMessage());
            return false;
        }
    }

    public Response checkAdminAuth(IHTTPSession session) {
        String token = getAuthToken(session);
        logger.info("Checking admin auth with token: " + (token != null ? "present" : "missing"));
        
        if (!verifyAdminToken(token)) {
            logger.warning("Admin auth failed for token");
            return newFixedLengthResponse(
                Response.Status.UNAUTHORIZED,
                "application/json",
                "{\"success\":false,\"message\":\"Admin access required\"}"
            );
        }
        logger.info("Admin auth successful");
        return null;
    }

    public Response handleUsersList(IHTTPSession session) {
        // Check admin auth first
        Response authCheck = checkAdminAuth(session);
        if (authCheck != null) return authCheck;

        try {
            String type = session.getParameters().getOrDefault("type", List.of("pending")).get(0);
            List<Map<String, String>> users = databaseHelper.getUsers(type);
            
            if (users == null) {
                users = new ArrayList<>();
            }

            Map<String, Object> responseMap = new HashMap<>();
            responseMap.put("success", true);
            responseMap.put("users", users);

            String jsonResponse = gson.toJson(responseMap);
            logger.info("Users list response: " + jsonResponse);
            
            return newFixedLengthResponse(
                Response.Status.OK,
                "application/json",
                jsonResponse
            );
        } catch (Exception e) {
            logger.severe("Error getting users list: " + e.getMessage());
            return newFixedLengthResponse(
                Response.Status.INTERNAL_ERROR,
                "application/json",
                "{\"success\":false,\"message\":\"Failed to load users\"}"
            );
        }
    }

    public Response handleUserAccept(IHTTPSession session) {
        Response authCheck = checkAdminAuth(session);
        if (authCheck != null) return authCheck;

        try {
            Map<String, String> body = new HashMap<>();
            session.parseBody(body);
            String jsonBody = body.get("postData");
            Map<String, String> acceptData = gson.fromJson(jsonBody, new TypeToken<Map<String, String>>(){}.getType());

            String ign = acceptData.get("ign");
            String acceptedBy = acceptData.get("acceptedBy");

            if (ign == null || acceptedBy == null) {
                Map<String, Object> errorMap = new HashMap<>();
                errorMap.put("success", false);
                errorMap.put("message", "IGN and acceptedBy are required");
                return newFixedLengthResponse(
                    Response.Status.BAD_REQUEST,
                    "application/json",
                    gson.toJson(errorMap)
                );
            }

            if (databaseHelper.acceptUser(ign, acceptedBy)) {
                Map<String, Object> responseMap = new HashMap<>();
                responseMap.put("success", true);
                responseMap.put("message", "User accepted successfully");
                return newFixedLengthResponse(
                    Response.Status.OK,
                    "application/json",
                    gson.toJson(responseMap)
                );
            } else {
                Map<String, Object> errorMap = new HashMap<>();
                errorMap.put("success", false);
                errorMap.put("message", "Failed to accept user");
                return newFixedLengthResponse(
                    Response.Status.NOT_FOUND,
                    "application/json",
                    gson.toJson(errorMap)
                );
            }
        } catch (Exception e) {
            logger.severe("Error accepting user: " + e.getMessage());
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("success", false);
            errorMap.put("message", "Server error while accepting user");
            return newFixedLengthResponse(
                Response.Status.INTERNAL_ERROR,
                "application/json",
                gson.toJson(errorMap)
            );
        }
    }

    public Response handleUserDeny(IHTTPSession session) {
        Response authCheck = checkAdminAuth(session);
        if (authCheck != null) return authCheck;

        try {
            Map<String, String> body = new HashMap<>();
            session.parseBody(body);
            String jsonBody = body.get("postData");
            Map<String, String> denyData = gson.fromJson(jsonBody, new TypeToken<Map<String, String>>(){}.getType());

            String ign = denyData.get("ign");
            String deniedBy = denyData.get("deniedBy");
            String reason = denyData.get("reason");

            if (ign == null || deniedBy == null || reason == null) {
                Map<String, Object> errorMap = new HashMap<>();
                errorMap.put("success", false);
                errorMap.put("message", "IGN, deniedBy, and reason are required");
                return newFixedLengthResponse(
                    Response.Status.BAD_REQUEST,
                    "application/json",
                    gson.toJson(errorMap)
                );
            }

            if (databaseHelper.denyUser(ign, deniedBy, reason)) {
                Map<String, Object> responseMap = new HashMap<>();
                responseMap.put("success", true);
                responseMap.put("message", "User denied successfully");
                return newFixedLengthResponse(
                    Response.Status.OK,
                    "application/json",
                    gson.toJson(responseMap)
                );
            } else {
                Map<String, Object> errorMap = new HashMap<>();
                errorMap.put("success", false);
                errorMap.put("message", "Failed to deny user");
                return newFixedLengthResponse(
                    Response.Status.NOT_FOUND,
                    "application/json",
                    gson.toJson(errorMap)
                );
            }
        } catch (Exception e) {
            logger.severe("Error denying user: " + e.getMessage());
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("success", false);
            errorMap.put("message", "Server error while denying user");
            return newFixedLengthResponse(
                Response.Status.INTERNAL_ERROR,
                "application/json",
                gson.toJson(errorMap)
            );
        }
    }

    public Response handleTokenVerification(IHTTPSession session) {
        String token = getAuthToken(session);
        if (verifyAuthToken(token)) {
            return newFixedLengthResponse(
                Response.Status.OK,
                "application/json",
                "{\"success\":true}"
            );
        }
        return newFixedLengthResponse(
            Response.Status.UNAUTHORIZED,
            "application/json",
            "{\"success\":false,\"message\":\"Invalid token\"}"
        );
    }
} 