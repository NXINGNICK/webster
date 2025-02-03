"use strict";

/**
 * Checks if the user is on alogin.html. If not, and there's no "isAdmin", then redirect.
 */
(function checkAdminPrivilege() {
    const currentPath = window.location.pathname;
    // If we're not on alogin.html and user isn't flagged as admin, redirect.
    if (!currentPath.includes("alogin.html") && !localStorage.getItem("isAdmin")) {
        window.location.href = "/login/login.html";
    }
})();

// Load initial data for the pending tab
document.addEventListener("DOMContentLoaded", () => {
    if (!checkAdminAuth()) return;
    console.log("Admin auth successful, loading data...");
    loadTabData("pending");
});

// Tab switching functionality
const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach(button => {
    button.addEventListener("click", () => {
        const tabName = button.dataset.tab;
        
        // Update active states
        tabButtons.forEach(btn => btn.classList.remove("active"));
        tabContents.forEach(content => content.classList.remove("active"));
        
        button.classList.add("active");
        document.getElementById(tabName).classList.add("active");
        
        // Load data for the selected tab
        loadTabData(tabName);
    });
});

async function loadTabData(tabName) {
    try {
        const response = await fetchAPI(`${API_CONFIG.endpoints.users}?type=${tabName}`);
        console.log('Users response:', response); // Add logging
        
        if (!response || !response.success) {
            throw new Error(response?.message || "Failed to load data");
        }
        
        updateTable(tabName, response.users || []);
    } catch (error) {
        console.error("Error loading data:", error);
        if (error.message.includes('Unauthorized')) {
            window.location.href = "/login/alogin.html";
        } else {
            alert("Failed to load data. Please try again.");
        }
    }
}

function updateTable(tabName, users) {
    const tbody = document.getElementById(`${tabName}Table`);
    if (!tbody) return;
    tbody.innerHTML = "";

    users.forEach(user => {
        const row = document.createElement("tr");
        const [javaIgn, bedrockIgn] = user.ign.split("[]");

        switch (tabName) {
            case "pending":
                row.innerHTML = `
                    <td>${javaIgn === "none" ? "N/A" : javaIgn}</td>
                    <td>${bedrockIgn === "none" ? "N/A" : bedrockIgn}</td>
                    <td>${user.discord}</td>
                    <td>${user.telegram || "N/A"}</td>
                    <td>${user.email}</td>
                    <td>
                        <button onclick="acceptUser('${user.ign}')" class="action-btn accept-btn">Accept</button>
                        <button onclick="showDenyModal('${user.ign}')" class="action-btn deny-btn">Deny</button>
                    </td>
                `;
                break;
            case "accepted":
                row.innerHTML = `
                    <td>${javaIgn === "none" ? "N/A" : javaIgn}</td>
                    <td>${bedrockIgn === "none" ? "N/A" : bedrockIgn}</td>
                    <td>${user.discord}</td>
                    <td>${user.telegram || "N/A"}</td>
                    <td>${user.email}</td>
                    <td>${user.accepted_by}</td>
                    <td>${new Date(user.accepted_date).toLocaleString()}</td>
                `;
                break;
            case "denied":
                row.innerHTML = `
                    <td>${javaIgn === "none" ? "N/A" : javaIgn}</td>
                    <td>${bedrockIgn === "none" ? "N/A" : bedrockIgn}</td>
                    <td>${user.discord}</td>
                    <td>${user.telegram || "N/A"}</td>
                    <td>${user.email}</td>
                    <td>${user.denied_by}</td>
                    <td>${user.reason}</td>
                    <td>${new Date(user.denied_date).toLocaleString()}</td>
                `;
                break;
            case "audit":
                row.innerHTML = `
                    <td>${new Date(user.action_date).toLocaleString()}</td>
                    <td>${user.action_type}</td>
                    <td>${user.user_ign}</td>
                    <td>${user.performed_by || "System"}</td>
                    <td>${user.details}</td>
                `;
                break;
        }
        tbody.appendChild(row);
    });
}

async function acceptUser(ign) {
    try {
        const response = await fetchAPI("/users/accept", {
            method: "POST",
            body: {
                ign,
                acceptedBy: localStorage.getItem("userEmail")
            }
        });

        if (response.success) {
            loadTabData("pending");
            loadTabData("accepted");
        }
    } catch (error) {
        alert(`Failed to accept user: ${error.message}`);
    }
}

// Deny user functionality
const denyModal = document.getElementById("denyModal");
let currentIgn = null;

function showDenyModal(ign) {
    currentIgn = ign;
    denyModal.style.display = "block";
}

document.getElementById("cancelDeny")?.addEventListener("click", () => {
    denyModal.style.display = "none";
    document.getElementById("denyReason").value = "";
});

document.getElementById("confirmDeny")?.addEventListener("click", async () => {
    const reason = document.getElementById("denyReason").value.trim();
    if (!reason) {
        alert("Please provide a reason for denial.");
        return;
    }

    try {
        const response = await fetchAPI("/users/deny", {
            method: "POST",
            body: {
                ign: currentIgn,
                reason,
                deniedBy: localStorage.getItem("userEmail")
            }
        });

        if (response.success) {
            denyModal.style.display = "none";
            document.getElementById("denyReason").value = "";
            loadTabData("pending");
            loadTabData("denied");
        }
    } catch (error) {
        alert(`Failed to deny user: ${error.message}`);
    }
});

function checkAdminAuth() {
    const isAdmin = localStorage.getItem("isAdmin") === "true";
    const token = localStorage.getItem("authToken");
    
    if (!isAdmin || !token) {
        window.location.href = "/login/alogin.html";
        return false;
    }
    return true;
}