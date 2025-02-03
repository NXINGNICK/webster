"use strict";

/**
 * Enhanced script.js integrating the Eden Gate 2.0 backend features:
 *  1) /user/register: Submits IGN, Discord, Telegram, etc. for server registration
 *  2) /auth/signup: Creates user accounts, triggers email verification
 *  3) /auth/login: Login endpoint for normal users
 *  4) /admin/login: Login endpoint for admin users
 *  5) /auth/verify?token=...: Token-based email verification
 *
 * Also includes:
 *  - Local storage-based session control
 *  - Theme toggling
 *  - Simple route checks (public vs. private)
 *
 * In this version:
 *  - login.html is used for normal user logins
 *  - alogin.html is used for admin logins
 *
 * Admin logins receive a token immediately, bypassing any email verification logic
 * that normal user logins might require.
 */

// Update API_CONFIG to match our actual backend endpoints
const API_CONFIG = {
  baseURL: window.location.origin, // This will automatically use the correct host
  endpoints: {
    signup: "/auth/signup",
    login: "/auth/login",
    adminLogin: "/admin/login",
    register: "/register", // Changed from /user/register to match our backend
    verify: "/verify",
    users: "/users",
    content: "/api/content"
  }
};

/**
 * Generic API helper for JSON-based requests.
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  const token = localStorage.getItem("authToken");
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        ...(isAdmin ? { "X-Admin": "true" } : {}),
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.clear();
        // Redirect to appropriate login page
        window.location.href = isAdmin ? "/login/alogin.html" : "/login/login.html";
        throw new Error("Session expired. Please login again.");
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

/**
 * Theme Toggle functionality
 */
function initializeThemeToggle() {
  const themeToggle = document.querySelector(".theme-toggle");
  const body = document.body;

  // Load the user's preferred theme or default to "dark-mode"
  const savedTheme = localStorage.getItem("theme") || "dark-mode";
  body.classList.add(savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      body.classList.toggle("light-mode");
      const newTheme = body.classList.contains("light-mode") ? "light-mode" : "dark-mode";
      localStorage.setItem("theme", newTheme);
    });
  }
}

/**
 * Public routes (not requiring login).
 * Adjust according to your folder/file structure.
 */
const publicRoutes = [
  "index.html",
  "login.html",
  "alogin.html",
  "signup.html",
  "logos",
  "verify.html"
];

/**
 * Checks if the current route is listed as a public route.
 */
function isPublicRoute(path) {
  return publicRoutes.some(route => path.endsWith(route));
}

/**
 * If the route is not public and the user is not logged in, redirect to normal login.
 */
function checkAuthForCurrentPage() {
  const currentPath = window.location.pathname;
  const isLoggedIn = localStorage.getItem("isLoggedIn");

  if (!isPublicRoute(currentPath) && !isLoggedIn) {
    // By default, we redirect to normal login—change if you have a custom flow.
    window.location.href = "/login/login.html";
  }
}

/**
 * Registration form logic (IGN, Discord, Telegram, Email, Type).
 * Submits data to /user/register. On success, redirect or show a success message.
 */
function initializeRegistrationForm() {
  const form = document.getElementById("registrationForm");
  if (!form) return;

  // Show/hide IGN fields based on platform selection
  const platformRadios = form.querySelectorAll('input[name="type"]');
  platformRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      const javaField = document.getElementById("javaIgnField");
      const bedrockField = document.getElementById("bedrockIgnField");
      
      switch(e.target.value) {
        case "Java":
          javaField.style.display = "block";
          bedrockField.style.display = "none";
          break;
        case "Bedrock":
          javaField.style.display = "none";
          bedrockField.style.display = "block";
          break;
        case "Both":
          javaField.style.display = "block";
          bedrockField.style.display = "block";
          break;
      }
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const type = formData.get("type");
    const javaIgn = formData.get("javaIgn") || "none";
    const bedrockIgn = formData.get("bedrockIgn") || "none";
    
    try {
      const response = await fetchAPI(API_CONFIG.endpoints.register, {
        method: "POST",
        body: {
          type,
          ign: `${javaIgn}[]${bedrockIgn}`, // Format expected by backend
          discord: formData.get("discord"),
          telegram: formData.get("telegram"),
          email: formData.get("email")
        }
      });

      if (response.success) {
        window.location.href = "/registered.html";
      } else {
        throw new Error(response.message || "Registration failed");
      }
    } catch (error) {
      alert(error.message);
    }
  });
}

/**
 * Sign-up (account creation) flow -> /auth/signup.
 * Creates the account in user_accounts and triggers an email verification if enabled.
 */
function initializeSignupForm() {
  const signupForm = document.querySelector("#signupForm");
  if (!signupForm) return;

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const messageEl = document.getElementById("message");

    try {
      const formData = getWebsiteSignupFormData();
      validateWebsiteSignupData(formData);

      const data = await fetchAPI(API_CONFIG.endpoints.signup, {
        method: "POST",
        body: formData
      });

      if (data.success) {
        // If you want to mark them as logged in right away:
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userEmail", formData.email);
        if (data.token) {
          localStorage.setItem("authToken", data.token);
        }

        // Possibly redirect them to a "check your email" page or success page
        window.location.href = "verification-success.html";
      } else {
        throw new Error(data.message || "Failed to sign up (login).");
      }
    } catch (error) {
      if (messageEl) messageEl.textContent = error.message;
    }
  });
}

function getWebsiteSignupFormData() {
  return {
    email: document.getElementById("email")?.value.trim() || "",
    password: document.getElementById("password")?.value.trim() || "",
    confirmPassword: document.getElementById("confirmPassword")?.value.trim() || ""
  };
}

function validateWebsiteSignupData({ email, password, confirmPassword }) {
  if (!email || !password || !confirmPassword) {
    throw new Error("Please fill out all fields.");
  }
  if (password !== confirmPassword) {
    throw new Error("Passwords do not match.");
  }
}

/**
 * Normal user login -> /auth/login
 * If the user is not verified, you might prompt them to verify via email.
 */
async function handleLoginForm(event) {
    event.preventDefault();
    const messageEl = document.querySelector(".message");
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetchAPI(API_CONFIG.endpoints.login, {
            method: "POST",
            body: { email, password }
        });

        if (response.success) {
            // Store token and user info in localStorage
            localStorage.setItem("authToken", response.token);
            localStorage.setItem("userEmail", response.email);
            localStorage.setItem("isLoggedIn", "true");

            // Redirect to main page
            window.location.href = "/index.html";
        } else {
            throw new Error(response.message || "Login failed");
        }
    } catch (error) {
        if (messageEl) messageEl.textContent = error.message;
    }
}

// Make sure login form is properly initialized
function initializeLoginForm() {
    const form = document.querySelector(".login-form");
    if (form) {
        form.addEventListener("submit", handleLoginForm);
    }
}

/**
 * Admin login -> /admin/login
 */
async function handleAdminLoginForm(event) {
    event.preventDefault();
    const messageEl = document.getElementById("adminMessage");
    const email = document.getElementById("adminEmail").value;
    const password = document.getElementById("adminPassword").value;

    try {
        const response = await fetchAPI(API_CONFIG.endpoints.adminLogin, {
            method: "POST",
            body: { email, password }
        });

        if (response.success) {
            // Store admin token and info
            localStorage.setItem("authToken", response.token);
            localStorage.setItem("userEmail", email);
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("isAdmin", "true");  // Add this flag

            // Redirect to admin panel
            window.location.href = "/admin/admin.html";
        } else {
            throw new Error(response.message || "Admin login failed");
        }
    } catch (error) {
        if (messageEl) messageEl.textContent = error.message;
    }
}

function initializeAdminLoginForm() {
    const form = document.querySelector("#adminLoginForm");
    if (form) {
        form.addEventListener("submit", handleAdminLoginForm);
    }
}

/**
 * Universal or admin-friendly logout. Clears local storage, then redirects to login.
 */
function handleLogout() {
  localStorage.clear();
  window.location.href = "/login/login.html";
}

/**
 * Combine sign-up, normal user login, admin login, logout logic in one place.
 */
function initializeAuthForms() {
  // Normal user signup and login
  initializeSignupForm();
  initializeLoginForm();
  // Admin login
  initializeAdminLoginForm();

  // Logout button
  const logoutButton = document.querySelector(".logout-button");
  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }
}

/**
 * (Optional) Verification flow for verify.html or pages with ?token= in the URL.
 * On success, display a message or redirect to a success page.
 */
function initializeVerificationFlow() {
  const currentPath = window.location.pathname;
  if (currentPath.includes("verify")) {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    // If a token param is present, call the verification endpoint
    if (token) {
      verifyUserToken(token);
    }
  }
}

async function verifyUserToken(token) {
  const messageEl = document.getElementById("verifyMessage");
  try {
    const response = await fetchAPI(`${API_CONFIG.endpoints.verify}?token=${token}`, {
      method: "GET"
    });

    if (response.success) {
      if (messageEl) {
        messageEl.textContent = "Email verified successfully! You can now log in.";
      }
      // Optionally auto-redirect after a short delay
      // setTimeout(() => { window.location.href = "/login/login.html"; }, 3000);
    } else {
      throw new Error(response.message || "Verification failed.");
    }
  } catch (error) {
    if (messageEl) messageEl.textContent = error.message;
  }
}

function checkAuth() {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const token = localStorage.getItem("authToken");
    const isAdmin = localStorage.getItem("isAdmin");
    
    // For admin pages
    if (window.location.pathname.startsWith("/admin/")) {
        if (!isLoggedIn || !token || !isAdmin) {
            window.location.href = "/login/alogin.html";
            return false;
        }
    } else {
        // For normal protected pages
        if (!isLoggedIn || !token) {
            window.location.href = "/login/login.html";
            return false;
        }
    }
    return true;
}

// On DOMContentLoaded, initialize the script
document.addEventListener("DOMContentLoaded", () => {
  initializeThemeToggle();
  initializeAuthForms();
  initializeRegistrationForm();
  initializeVerificationFlow();
  checkAuthForCurrentPage();
  if (document.querySelector(".protected-page")) {
    checkAuth();
  }
});

// Add to any logout buttons
document.querySelectorAll(".logout-btn").forEach(btn => {
    btn.addEventListener("click", handleLogout);
});