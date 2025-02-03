package me.nxingnick.webster.http;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import fi.iki.elonen.NanoHTTPD;
import me.nxingnick.webster.WebsterPlugin;
import me.nxingnick.webster.database.DatabaseHelper;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

import static fi.iki.elonen.NanoHTTPD.newFixedLengthResponse;

public class WebsterHttpServer extends NanoHTTPD {
    private final WebsterPlugin plugin;
    private final DatabaseHelper databaseHelper;
    private final Logger logger;
    private final APIRouteHandler apiHandler;

    public WebsterHttpServer(int port, WebsterPlugin plugin, DatabaseHelper databaseHelper) throws IOException {
        super(port);
        this.plugin = plugin;
        this.databaseHelper = databaseHelper;
        this.logger = plugin.getLogger();
        this.apiHandler = new APIRouteHandler(plugin, databaseHelper);
        start();
        logger.info("Webster HTTP server started on port " + port);
    }

    @Override
    public Response serve(IHTTPSession session) {
        String uri = session.getUri();
        
        // API endpoints
        if (uri.startsWith("/api/")) {
            if (uri.startsWith("/api/content")) {
                return session.getMethod() == Method.GET ? 
                    apiHandler.handleContentGet(session) : 
                    apiHandler.handleContentUpdate(session);
            }
            // ... other API routes
        }
        
        // Auth endpoints
        if (uri.startsWith("/auth/")) {
            if (uri.equals("/auth/login")) {
                return apiHandler.handleLogin(session);
            } else if (uri.equals("/auth/signup")) {
                return apiHandler.handleSignup(session);
            }
        }

        // Admin endpoints
        if (uri.startsWith("/admin/login")) {
            return apiHandler.handleAdminLogin(session);
        }
        if (uri.startsWith("/users")) {
            // Check admin auth first - using public method
            Response authCheck = apiHandler.checkAdminAuth(session);
            if (authCheck != null) return authCheck;
            
            if (uri.equals("/users/accept")) {
                return apiHandler.handleUserAccept(session);
            } else if (uri.equals("/users/deny")) {
                return apiHandler.handleUserDeny(session);
            } else {
                return apiHandler.handleUsersList(session);
            }
        }

        // Static file serving
        return serveFile(session);
    }

    private Response handleSignup(IHTTPSession session) {
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
                if (plugin.getConfig().getBoolean("email.enabled", true) && plugin.emailManager != null) {
                    String verificationToken = plugin.generateSecureToken();
                    databaseHelper.storeVerificationToken(email, verificationToken);

                    String linkBase = plugin.getConfig().getString(
                        "email.verificationLinkBase",
                        "http://localhost:8080/verify?token="
                    );
                    String verificationLink = linkBase + verificationToken;

                    plugin.emailManager.sendVerificationEmail(email, verificationLink, email);
                }

                Map<String, Object> responseData = new HashMap<>();
                responseData.put("success", true);
                responseData.put("token", plugin.generateSecureToken());
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
            logger.severe("Error in fallback /auth/signup: " + e.getMessage());
            return newFixedLengthResponse(
                Response.Status.INTERNAL_ERROR,
                "application/json",
                "{\"success\":false,\"message\":\"Signup error.\"}"
            );
        }
    }

    private Response handleAdminLogin(IHTTPSession session) {
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

            if (databaseHelper.verifyAdminCredentials(email, password)) {
                Map<String, Object> responseData = new HashMap<>();
                responseData.put("success", true);
                responseData.put("isAdmin", true);
                responseData.put("token", plugin.generateSecureToken());
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
            logger.severe("Admin login fallback error: " + e.getMessage());
            return newFixedLengthResponse(
                Response.Status.INTERNAL_ERROR,
                "application/json",
                "{\"success\":false,\"message\":\"Admin login error.\"}"
            );
        }
    }

    private Response handleUsersList() {
        try {
            List<Map<String, String>> users = databaseHelper.getUsers("all");
            return newFixedLengthResponse(
                Response.Status.OK,
                "application/json",
                new Gson().toJson(users)
            );
        } catch (Exception e) {
            logger.severe("Error in fallback /users: " + e.getMessage());
            return newFixedLengthResponse(
                Response.Status.INTERNAL_ERROR,
                "application/json",
                "{\"success\":false,\"message\":\"Failed to fetch users.\"}"
            );
        }
    }

    private Response serveFile(IHTTPSession session) {
        String uri = session.getUri();
        File activeFolder = new File(plugin.getDataFolder(), "active");

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

    private String getMimeType(String fileName) {
        if (fileName.endsWith(".html")) return "text/html";
        if (fileName.endsWith(".css")) return "text/css";
        if (fileName.endsWith(".js")) return "application/javascript";
        if (fileName.endsWith(".png")) return "image/png";
        if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) return "image/jpeg";
        return "text/plain";
    }
} 