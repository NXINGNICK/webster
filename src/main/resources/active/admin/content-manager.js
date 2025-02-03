"use strict";

/**
 * content-manager.js
 * A revised version for multi-language content editing, matching the new /api/content
 * routes in our backend. Fetches and saves text by page and language, and includes
 * preview modal support. Make sure to reference the correct admin token if needed.
 */

document.addEventListener("DOMContentLoaded", async () => {
    if (!checkAdminAuth()) return;
    
    const pageSelect = document.getElementById("pageSelect");
    const langSelect = document.getElementById("langSelect");
    const editableSections = document.querySelector(".editable-sections");
    const saveButton = document.getElementById("saveContent");
    const previewButton = document.getElementById("previewContent");
    const closePreviewBtn = document.getElementById("closePreview");
    const previewModal = document.getElementById("previewModal");
    const previewFrame = document.getElementById("previewFrame");

    // Load initial content for "index" in "en"
    await loadPageContent(pageSelect.value, langSelect.value);

    pageSelect.addEventListener("change", () => {
        loadPageContent(pageSelect.value, langSelect.value);
    });

    langSelect.addEventListener("change", () => {
        loadPageContent(pageSelect.value, langSelect.value);
    });

    saveButton.addEventListener("click", saveContent);
    previewButton.addEventListener("click", previewContent);
    closePreviewBtn.addEventListener("click", () => {
        previewModal.style.display = "none";
    });

    /**
     * Fetches page content for a given page and language,
     * then populates the editable-sections container.
     */
    async function loadPageContent(pageName, lang) {
        try {
            const response = await fetchAPI(`${API_CONFIG.endpoints.content}?page=${pageName}&lang=${lang}`);
            console.log('Content response:', response);
            
            if (!response || !response.success) {
                throw new Error(response?.message || "Failed to load content");
            }
            
            if (!response.content || Object.keys(response.content).length === 0) {
                console.log('No content found, showing default template');
            }
            
            updateContentEditor(response.content || {});
        } catch (error) {
            console.error("Error loading content:", error);
            if (error.message.includes('Unauthorized')) {
                window.location.href = "/login/alogin.html";
            } else {
                alert("Failed to load content. Please try again.");
            }
        }
    }

    /**
     * Saves the current page's content for each editable section.
     */
    async function saveContent() {
        const pageName = pageSelect.value;
        const lang = langSelect.value;

        // Gather updated content from each "content-section"
        const sections = editableSections.querySelectorAll(".content-section");
        const updatedContent = {};
        sections.forEach(section => {
            const label = section.querySelector("label");
            const textarea = section.querySelector("textarea");
            if (label && textarea) {
                const sectionId = label.textContent;
                updatedContent[sectionId] = textarea.value;
            }
        });

        try {
            const response = await fetchAPI(API_CONFIG.endpoints.content, {
                method: "POST",
                body: {
                    page: pageName,
                    lang,
                    content: updatedContent,
                    modifiedBy: localStorage.getItem("userEmail")
                }
            });

            if (response.success) {
                alert("Content saved successfully!");
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error("Error saving content:", error);
            alert("Failed to save content");
        }
    }

    /**
     * Displays a simple preview of the current text in a modal.
     * In a real-use case, you'd probably open a new tab or an iframe
     * that loads the updated content from the server.
     */
    function previewContent() {
        // Build a basic HTML snippet
        const pageName = pageSelect.value;
        const lang = langSelect.value;
        let previewHTML = `<h3>Preview: Page=${pageName}, Lang=${lang}</h3>`;

        const sections = editableSections.querySelectorAll(".content-section");
        for (const section of sections) {
            const label = section.querySelector("label");
            const textarea = section.querySelector("textarea");
            previewHTML += `
                <div class="preview-section">
                    <strong>${label.textContent}:</strong>
                    <p>${textarea.value}</p>
                </div>
            `;
        }

        previewFrame.innerHTML = previewHTML.trim();
        previewModal.style.display = "block";
    }

    function updateContentEditor(content) {
        const editableSections = document.querySelector(".editable-sections");
        if (!editableSections) return;
        
        editableSections.innerHTML = ''; // Clear existing content
        
        // If no content, show default sections
        if (Object.keys(content).length === 0) {
            const defaultSections = {
                'title': 'Enter title here...',
                'description': 'Enter description here...',
                'content': 'Enter main content here...'
            };
            content = defaultSections;
        }

        // Create editable sections for each content piece
        Object.entries(content).forEach(([sectionId, text]) => {
            const section = document.createElement('div');
            section.className = 'content-section';
            section.innerHTML = `
                <label for="${sectionId}">${sectionId}</label>
                <textarea id="${sectionId}" rows="4">${text}</textarea>
            `;
            editableSections.appendChild(section);
        });
    }
});