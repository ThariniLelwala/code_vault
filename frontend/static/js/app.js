document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const snippetGrid = document.getElementById('snippetGrid');
    const searchInput = document.getElementById('searchInput');
    const tagInput = document.getElementById('tagInput');
    const languageFilters = document.getElementById('languageFilters');
    
    // Modal Elements
    const modalOverlay = document.getElementById('snippetModal');
    const addSnippetBtn = document.getElementById('addSnippetBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const snippetForm = document.getElementById('snippetForm');
    const modalTitle = document.getElementById('modalTitle');

    // State
    let snippets = [];
    let currentFilter = {
        lang: '',
        query: '',
        tag: ''
    };

    // Initialize
    fetchSnippets();

    // Event Listeners
    addSnippetBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    snippetForm.addEventListener('submit', handleFormSubmit);

    searchInput.addEventListener('input', debounce((e) => {
        currentFilter.query = e.target.value;
        fetchSnippets();
    }, 300));

    tagInput.addEventListener('input', debounce((e) => {
        currentFilter.tag = e.target.value;
        fetchSnippets();
    }, 300));

    languageFilters.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            // Update active state
            Array.from(languageFilters.children).forEach(li => li.classList.remove('active'));
            e.target.classList.add('active');
            
            // Update filter and fetch
            currentFilter.lang = e.target.dataset.lang;
            renderSnippets(); // Can just re-render from memory for lang filter or fetch again
        }
    });

    // API Calls
    async function fetchSnippets() {
        try {
            let url = '/api/snippets?';
            if (currentFilter.query) url += `query=${encodeURIComponent(currentFilter.query)}&`;
            if (currentFilter.tag) url += `tag=${encodeURIComponent(currentFilter.tag)}&`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch snippets');
            snippets = await response.json();
            renderSnippets();
        } catch (error) {
            console.error('Error fetching snippets:', error);
            // Optionally show error toast
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        
        const id = document.getElementById('snippetId').value;
        const snippetData = {
            title: document.getElementById('title').value,
            language: document.getElementById('language').value,
            tags: document.getElementById('tags').value,
            content: document.getElementById('content').value
        };

        try {
            let response;
            if (id) {
                // Update
                response = await fetch(`/api/snippets/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(snippetData)
                });
            } else {
                // Create
                response = await fetch('/api/snippets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(snippetData)
                });
            }

            if (!response.ok) throw new Error('Failed to save snippet');
            
            closeModal();
            fetchSnippets();
        } catch (error) {
            console.error('Error saving snippet:', error);
        }
    }

    async function deleteSnippet(id) {
        if (!confirm('Are you sure you want to delete this snippet?')) return;

        try {
            const response = await fetch(`/api/snippets/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete snippet');
            fetchSnippets();
        } catch (error) {
            console.error('Error deleting snippet:', error);
        }
    }

    // UI Rendering
    function renderSnippets() {
        snippetGrid.innerHTML = '';
        
        let filteredSnippets = snippets;
        if (currentFilter.lang) {
            filteredSnippets = snippets.filter(s => s.language === currentFilter.lang);
        }

        if (filteredSnippets.length === 0) {
            snippetGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 3rem;">No snippets found. Create one!</div>';
            return;
        }

        filteredSnippets.forEach((snippet, index) => {
            const card = document.createElement('div');
            card.className = 'snippet-card';
            card.style.animationDelay = `${index * 0.05}s`;
            
            const tagsHtml = snippet.tags 
                ? snippet.tags.split(',').map(tag => `<span class="tag">${tag.trim()}</span>`).join('')
                : '';

            card.innerHTML = `
                <div class="card-header">
                    <div>
                        <h3>${escapeHtml(snippet.title)}</h3>
                    </div>
                    <span class="lang-badge">${escapeHtml(snippet.language)}</span>
                </div>
                <div class="card-content">
                    <pre><code>${escapeHtml(snippet.content)}</code></pre>
                </div>
                <div class="card-footer">
                    <div class="tags-container">
                        ${tagsHtml}
                    </div>
                    <div class="card-actions">
                        <button class="icon-btn" onclick="window.copyToClipboard(\`${escapeHtml(snippet.content).replace(/`/g, '\\`')}\`)" title="Copy">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                        <button class="icon-btn" onclick="window.editSnippet(${snippet.id})" title="Edit">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="icon-btn delete" onclick="window.deleteSnippet(${snippet.id})" title="Delete">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
            `;
            snippetGrid.appendChild(card);
        });
    }

    // Modal Handling
    function openModal(snippet = null) {
        modalTitle.textContent = snippet ? 'Edit Snippet' : 'Add New Snippet';
        
        document.getElementById('snippetId').value = snippet ? snippet.id : '';
        document.getElementById('title').value = snippet ? snippet.title : '';
        document.getElementById('language').value = snippet ? snippet.language : 'General';
        document.getElementById('tags').value = snippet ? snippet.tags : '';
        document.getElementById('content').value = snippet ? snippet.content : '';
        
        modalOverlay.classList.add('active');
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
        snippetForm.reset();
    }

    // Global exposed functions for inline onclick handlers
    window.editSnippet = (id) => {
        const snippet = snippets.find(s => s.id === id);
        if (snippet) openModal(snippet);
    };

    window.deleteSnippet = deleteSnippet;

    window.copyToClipboard = (text) => {
        // Unescape HTML entities for copying
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        navigator.clipboard.writeText(textarea.value).then(() => {
            // Could add a visual toast here
            console.log('Copied to clipboard');
        });
    };

    // Utility Functions
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }
});
