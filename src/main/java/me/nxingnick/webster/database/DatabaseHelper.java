package me.nxingnick.webster.database;

import java.sql.*;
import java.util.*;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * DatabaseHelper handles all database interactions for Webster.
 * Updated to support multi-language page_content entries by adding a "language" column
 * and new methods like userExists(...) to align with APIRouteHandler usage.
 */
public class DatabaseHelper {
    private final String host;
    private final int port;
    private final String database;
    private final String username;
    private final String password;
    private final Logger logger;
    private Connection pooledConnection;
    private long lastConnectionCheck;
    private static final long CONNECTION_TIMEOUT = 300000; // 5 minutes

    public DatabaseHelper(String host, int port, String database, String username, String password) {
        this.host = host;
        this.port = port;
        this.database = database;
        this.username = username;
        this.password = password;
        this.logger = Logger.getLogger("Webster");
    }

    public Connection getConnection() throws SQLException {
        if (pooledConnection == null || pooledConnection.isClosed() || 
            System.currentTimeMillis() - lastConnectionCheck > CONNECTION_TIMEOUT) {
            
            String url = String.format("jdbc:mysql://%s:%d/%s", host, port, database);
            pooledConnection = DriverManager.getConnection(url, username, password);
            lastConnectionCheck = System.currentTimeMillis();
        }
        return pooledConnection;
    }

    public void initializeContentTable() {
        try (Connection conn = getConnection()) {
            String sql = """
                CREATE TABLE IF NOT EXISTS page_content (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    page_id VARCHAR(50) NOT NULL,
                    section_id VARCHAR(50) NOT NULL,
                    language VARCHAR(10) NOT NULL DEFAULT 'en',
                    content TEXT,
                    modified_by VARCHAR(255),
                    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_content (page_id, section_id, language)
                )
            """;
            try (Statement stmt = conn.createStatement()) {
                stmt.execute(sql);
            }
        } catch (SQLException e) {
            logger.severe("Failed to initialize content table: " + e.getMessage());
        }
    }

    public boolean verifyAdminToken(String token) {
        if (token == null || token.isEmpty()) return false;
        
        try (Connection conn = getConnection()) {
            String sql = "SELECT 1 FROM admin_accounts WHERE token = ? AND token_created > DATE_SUB(NOW(), INTERVAL 24 HOUR)";
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, token);
                try (ResultSet rs = stmt.executeQuery()) {
                    return rs.next();
                }
            }
        } catch (SQLException e) {
            logger.severe("Failed to verify admin token: " + e.getMessage());
            return false;
        }
    }

    public boolean storeAdminToken(String email, String token) {
        try (Connection conn = getConnection()) {
            String sql = "UPDATE admin_accounts SET token = ?, token_created = CURRENT_TIMESTAMP WHERE email = ?";
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, token);
                stmt.setString(2, email);
                return stmt.executeUpdate() > 0;
            }
        } catch (SQLException e) {
            logger.severe("Failed to store admin token: " + e.getMessage());
            return false;
        }
    }

    public boolean createUserAccount(String email, String password) {
        try (Connection conn = getConnection()) {
            String sql = "INSERT INTO user_accounts (email, password) VALUES (?, ?)";
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, email);
                stmt.setString(2, password);
                return stmt.executeUpdate() > 0;
            }
        } catch (SQLException e) {
            logger.severe("Failed to create user account: " + e.getMessage());
            return false;
        }
    }

    public boolean storeVerificationToken(String email, String token) {
        try (Connection conn = getConnection()) {
            String sql = "UPDATE user_accounts SET verification_token = ?, token_created = CURRENT_TIMESTAMP WHERE email = ?";
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, token);
                stmt.setString(2, email);
                return stmt.executeUpdate() > 0;
            }
        } catch (SQLException e) {
            logger.severe("Failed to store verification token: " + e.getMessage());
            return false;
        }
    }

    // Add method for admin verification
    public boolean verifyAdminCredentials(String email, String password) {
        try (Connection conn = getConnection()) {
            String sql = "SELECT password FROM admin_accounts WHERE email = ?";
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, email);
                ResultSet rs = stmt.executeQuery();
                if (rs.next()) {
                    String storedPassword = rs.getString("password");
                    return password.equals(storedPassword);
                }
            }
        } catch (SQLException e) {
            logger.severe("Failed to verify admin credentials: " + e.getMessage());
        }
        return false;
    }

    // Add method for getting users
    public List<Map<String, String>> getUsers(String type) {
        List<Map<String, String>> users = new ArrayList<>();
        
        try (Connection conn = getConnection()) {
            String sql;
            if (type.equals("all")) {
                sql = "SELECT * FROM users";
            } else {
                sql = "SELECT * FROM users WHERE status = ?";
            }
            
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                if (!type.equals("all")) {
                    stmt.setString(1, type);
                }
                
                ResultSet rs = stmt.executeQuery();
                while (rs.next()) {
                    Map<String, String> user = new HashMap<>();
                    user.put("ign", rs.getString("ign"));
                    user.put("discord", rs.getString("discord"));
                    user.put("telegram", rs.getString("telegram"));
                    user.put("email", rs.getString("email"));
                    user.put("type", rs.getString("type"));
                    user.put("status", rs.getString("status"));
                    user.put("created_at", rs.getString("created_at"));
                    
                    // Add additional fields based on status
                    if (rs.getString("status").equals("accepted")) {
                        user.put("accepted_by", rs.getString("accepted_by"));
                        user.put("accepted_date", rs.getString("accepted_date"));
                    } else if (rs.getString("status").equals("denied")) {
                        user.put("denied_by", rs.getString("denied_by"));
                        user.put("denied_date", rs.getString("denied_date"));
                        user.put("deny_reason", rs.getString("deny_reason"));
                    }
                    
                    users.add(user);
                }
            }
            return users;
        } catch (SQLException e) {
            logger.severe("Error getting users: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    // Add methods for accepting/denying users
    public boolean acceptUser(String ign, String acceptedBy) {
        try (Connection conn = getConnection()) {
            String sql = "UPDATE users SET status = 'accepted', accepted_by = ?, accepted_date = CURRENT_TIMESTAMP WHERE ign = ?";
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, acceptedBy);
                stmt.setString(2, ign);
                return stmt.executeUpdate() > 0;
            }
        } catch (SQLException e) {
            logger.severe("Failed to accept user: " + e.getMessage());
            return false;
        }
    }

    public boolean denyUser(String ign, String deniedBy, String reason) {
        try (Connection conn = getConnection()) {
            String sql = "UPDATE users SET status = 'denied', denied_by = ?, deny_reason = ?, denied_date = CURRENT_TIMESTAMP WHERE ign = ?";
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, deniedBy);
                stmt.setString(2, reason);
                stmt.setString(3, ign);
                return stmt.executeUpdate() > 0;
            }
        } catch (SQLException e) {
            logger.severe("Failed to deny user: " + e.getMessage());
            return false;
        }
    }

    /**
     * Initialize all required database tables
     */
    public void initializeTables() {
        createUsersTable();
        createUserAccountsTable();
        createAdminAccountsTable();
        createContentTable();
    }

    private void createUsersTable() {
        try (Connection conn = getConnection()) {
            String sql = """
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    ign VARCHAR(255),
                    discord VARCHAR(255) NOT NULL,
                    telegram VARCHAR(255),
                    email VARCHAR(255) NOT NULL,
                    type VARCHAR(50),
                    status ENUM('pending', 'accepted', 'denied') DEFAULT 'pending',
                    accepted_by VARCHAR(255),
                    accepted_date TIMESTAMP NULL,
                    denied_by VARCHAR(255),
                    deny_reason TEXT,
                    denied_date TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """;
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.execute();
                logger.info("Users table initialized");
            }
        } catch (SQLException e) {
            logger.severe("Failed to create users table: " + e.getMessage());
        }
    }

    private void createUserAccountsTable() {
        try (Connection conn = getConnection()) {
            String sql = """
                CREATE TABLE IF NOT EXISTS user_accounts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    verification_token VARCHAR(64),
                    token VARCHAR(64),          -- Added for session token
                    token_created TIMESTAMP,    -- Added for token expiry
                    verified BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP NULL
                )
            """;
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.execute();
                logger.info("User accounts table initialized");
            }
        } catch (SQLException e) {
            logger.severe("Failed to create user_accounts table: " + e.getMessage());
        }
    }

    private void createAdminAccountsTable() {
        try (Connection conn = getConnection()) {
            String sql = """
                CREATE TABLE IF NOT EXISTS admin_accounts (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    token VARCHAR(64),
                    token_created TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP NULL
                )
            """;
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.execute();
                logger.info("Admin accounts table initialized");
            }
        } catch (SQLException e) {
            logger.severe("Failed to create admin_accounts table: " + e.getMessage());
        }
    }

    private void createContentTable() {
        try (Connection conn = getConnection()) {
            String sql = """
                CREATE TABLE IF NOT EXISTS page_content (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    page_id VARCHAR(50) NOT NULL,
                    section_id VARCHAR(50) NOT NULL,
                    language VARCHAR(10) NOT NULL DEFAULT 'en',
                    content TEXT,
                    modified_by VARCHAR(255),
                    modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_content (page_id, section_id, language)
                )
            """;
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.execute();
                logger.info("Content table initialized");
            }
        } catch (SQLException e) {
            logger.severe("Failed to create content table: " + e.getMessage());
        }
    }

    /**
     * Wipes all data from Webster tables and recreates them empty
     */
    public void wipeAllData() {
        try (Connection conn = getConnection()) {
            // First drop all tables
            String[] dropStatements = {
                "DROP TABLE IF EXISTS users",
                "DROP TABLE IF EXISTS user_accounts",
                "DROP TABLE IF EXISTS admin_accounts",
                "DROP TABLE IF EXISTS page_content"
            };

            for (String sql : dropStatements) {
                try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                    stmt.execute();
                }
            }

            // Then recreate all tables empty
            initializeTables();
            
            logger.info("Successfully wiped and recreated all Webster tables");
        } catch (SQLException e) {
            logger.severe("Failed to wipe database: " + e.getMessage());
            throw new RuntimeException("Database wipe failed", e);
        }
    }
} 