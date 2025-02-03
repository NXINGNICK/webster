package me.nxingnick.webster.security;

import java.security.SecureRandom;

public class SecurityUtils {
    private static final String ADMIN_PASSWORD_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    private static final int ADMIN_PASSWORD_LENGTH = 16;
    private static final String TOKEN_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final int TOKEN_LENGTH = 32;
    private static final SecureRandom secureRandom = new SecureRandom();

    public static String generateSecureToken() {
        return generateRandomString(TOKEN_CHARS, TOKEN_LENGTH);
    }

    public static String generateSecurePassword() {
        return generateRandomString(ADMIN_PASSWORD_CHARS, ADMIN_PASSWORD_LENGTH);
    }

    private static String generateRandomString(String chars, int length) {
        StringBuilder result = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            result.append(chars.charAt(secureRandom.nextInt(chars.length())));
        }
        return result.toString();
    }
} 