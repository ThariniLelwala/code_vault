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
    const languageSelect = document.getElementById('language');
    const contentTextarea = document.getElementById('content');
    const detectedLangBadge = document.getElementById('detectedLangBadge');

    // State
    let snippets = [];
    let currentFilter = {
        lang: '',
        query: '',
        tag: ''
    };

    // Language Name Dictionary for clean display names
    const languageNames = {
        'python': 'Python',
        'javascript': 'JavaScript',
        'typescript': 'TypeScript',
        'html': 'HTML',
        'xml': 'XML',
        'css': 'CSS',
        'scss': 'SCSS',
        'sql': 'SQL',
        'cpp': 'C++',
        'c': 'C',
        'csharp': 'C#',
        'java': 'Java',
        'go': 'Go',
        'rust': 'Rust',
        'json': 'JSON',
        'yaml': 'YAML',
        'markdown': 'Markdown',
        'graphql': 'GraphQL',
        'php': 'PHP',
        'ruby': 'Ruby',
        'bash': 'Bash',
        'shell': 'Shell',
        'powershell': 'PowerShell',
        'kotlin': 'Kotlin',
        'swift': 'Swift',
        'dart': 'Dart',
        'r': 'R',
        'lua': 'Lua',
        'dockerfile': 'Dockerfile',
        'plaintext': 'Plain Text'
    };

    function formatLanguageName(langKey) {
        if (!langKey) return 'Plain Text';
        const lower = langKey.toLowerCase().trim();
        return languageNames[lower] || (langKey.charAt(0).toUpperCase() + langKey.slice(1));
    }

    function getNormalizedLangKey(langName) {
        if (!langName) return 'auto';
        const lower = langName.toLowerCase().trim();
        for (const [key, name] of Object.entries(languageNames)) {
            if (key === lower || name.toLowerCase() === lower) {
                return key;
            }
        }
        return lower;
    }

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
        const li = e.target.closest('li');
        if (li) {
            Array.from(languageFilters.querySelectorAll('li')).forEach(item => item.classList.remove('active'));
            li.classList.add('active');
            
            currentFilter.lang = li.dataset.lang || '';
            renderSnippets();
        }
    });

    // Auto-detection on input & paste
    contentTextarea.addEventListener('input', debounce(() => {
        handleAutoDetect();
    }, 200));

    contentTextarea.addEventListener('paste', () => {
        setTimeout(handleAutoDetect, 50);
    });

    languageSelect.addEventListener('change', () => {
        if (languageSelect.value === 'auto') {
            handleAutoDetect();
        } else {
            detectedLangBadge.style.display = 'none';
        }
    });

    function handleAutoDetect() {
        if (languageSelect.value !== 'auto') return;

        const code = contentTextarea.value.trim();
        if (code.length >= 8 && window.hljs) {
            try {
                const result = hljs.highlightAuto(code);
                if (result && result.language) {
                    const readableName = formatLanguageName(result.language);
                    detectedLangBadge.querySelector('strong').textContent = readableName;
                    detectedLangBadge.style.display = 'inline-block';
                    return result.language;
                }
            } catch (err) {
                console.error('Language detection error:', err);
            }
        }
        detectedLangBadge.style.display = 'none';
        return null;
    }

    // API Calls
    async function fetchSnippets() {
        try {
            let url = '/api/snippets?';
            if (currentFilter.query) url += `query=${encodeURIComponent(currentFilter.query)}&`;
            if (currentFilter.tag) url += `tag=${encodeURIComponent(currentFilter.tag)}&`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch snippets');
            snippets = await response.json();
            updateLanguageFilters();
            renderSnippets();
        } catch (error) {
            console.error('Error fetching snippets:', error);
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        
        const id = document.getElementById('snippetId').value;
        let selectedLang = languageSelect.value;
        const codeContent = contentTextarea.value;

        // Resolve language if set to auto
        if (selectedLang === 'auto') {
            if (window.hljs && codeContent.trim()) {
                const detected = hljs.highlightAuto(codeContent.trim());
                selectedLang = detected && detected.language ? formatLanguageName(detected.language) : 'Plain Text';
            } else {
                selectedLang = 'Plain Text';
            }
        } else {
            selectedLang = formatLanguageName(selectedLang);
        }

        // Process and normalize tags (automatically include language tag, omit 'general')
        const rawTags = document.getElementById('tags').value;
        let tagList = rawTags
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0 && t.toLowerCase() !== 'general');

        // Automatically add detected/selected language as a tag if valid
        if (selectedLang && selectedLang.toLowerCase() !== 'plain text') {
            const langTag = selectedLang.toLowerCase();
            const exists = tagList.some(t => t.toLowerCase() === langTag || t.toLowerCase() === selectedLang.toLowerCase());
            if (!exists) {
                tagList.push(langTag);
            }
        }

        const snippetData = {
            title: document.getElementById('title').value,
            language: selectedLang,
            tags: tagList.join(', '),
            content: codeContent
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

    // Dynamic Language Filter in Sidebar
    function updateLanguageFilters() {
        const uniqueLanguages = new Set();
        snippets.forEach(s => {
            if (s.language && s.language.trim()) {
                uniqueLanguages.add(s.language.trim());
            }
        });

        const sortedLanguages = Array.from(uniqueLanguages).sort((a, b) => a.localeCompare(b));

        let html = `<li class="${currentFilter.lang === '' ? 'active' : ''}" data-lang="">All Languages</li>`;
        sortedLanguages.forEach(lang => {
            const isActive = currentFilter.lang.toLowerCase() === lang.toLowerCase();
            html += `<li class="${isActive ? 'active' : ''}" data-lang="${escapeHtml(lang)}">${escapeHtml(lang)}</li>`;
        });

        languageFilters.innerHTML = html;
    }

    // UI Rendering
    function renderSnippets() {
        snippetGrid.innerHTML = '';
        
        let filteredSnippets = snippets;
        if (currentFilter.lang) {
            filteredSnippets = snippets.filter(s => 
                (s.language || '').toLowerCase() === currentFilter.lang.toLowerCase()
            );
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
                ? snippet.tags.split(',').filter(t => t.trim()).map(tag => `<span class="tag">${escapeHtml(tag.trim())}</span>`).join('')
                : '';

            // Syntax highlighting with highlight.js
            let highlightedCode = '';
            const normalizedKey = getNormalizedLangKey(snippet.language);
            
            if (window.hljs) {
                try {
                    if (normalizedKey !== 'auto' && normalizedKey !== 'plaintext' && hljs.getLanguage(normalizedKey)) {
                        highlightedCode = hljs.highlight(snippet.content, { language: normalizedKey, ignoreIllegals: true }).value;
                    } else {
                        const autoResult = hljs.highlightAuto(snippet.content);
                        highlightedCode = autoResult.value || escapeHtml(snippet.content);
                    }
                } catch (e) {
                    highlightedCode = escapeHtml(snippet.content);
                }
            } else {
                highlightedCode = escapeHtml(snippet.content);
            }

            card.innerHTML = `
                <div class="card-header">
                    <div>
                        <h3>${escapeHtml(snippet.title)}</h3>
                    </div>
                    <span class="lang-badge">${escapeHtml(snippet.language || 'Plain Text')}</span>
                </div>
                <div class="card-content">
                    <pre><code class="hljs">${highlightedCode}</code></pre>
                </div>
                <div class="card-footer">
                    <div class="tags-container">
                        ${tagsHtml}
                    </div>
                    <div class="card-actions">
                        <button class="icon-btn" onclick="window.copyToClipboard(${snippet.id})" title="Copy Code">
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
        document.getElementById('tags').value = snippet ? snippet.tags : '';
        contentTextarea.value = snippet ? snippet.content : '';
        
        if (snippet) {
            const normalized = getNormalizedLangKey(snippet.language);
            let optionFound = false;
            for (let i = 0; i < languageSelect.options.length; i++) {
                if (languageSelect.options[i].value.toLowerCase() === normalized) {
                    languageSelect.selectedIndex = i;
                    optionFound = true;
                    break;
                }
            }
            if (!optionFound) {
                // If custom language not in select list, select auto or plaintext
                languageSelect.value = 'auto';
            }
            detectedLangBadge.style.display = 'none';
        } else {
            languageSelect.value = 'auto';
            detectedLangBadge.style.display = 'none';
        }
        
        modalOverlay.classList.add('active');
        if (!snippet) {
            document.getElementById('title').focus();
        }
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
        snippetForm.reset();
        detectedLangBadge.style.display = 'none';
    }

    // Global exposed functions for inline onclick handlers
    window.editSnippet = (id) => {
        const snippet = snippets.find(s => s.id === id);
        if (snippet) openModal(snippet);
    };

    window.deleteSnippet = deleteSnippet;

    window.copyToClipboard = (id) => {
        const snippet = snippets.find(s => s.id === id);
        if (!snippet) return;
        
        navigator.clipboard.writeText(snippet.content).then(() => {
            // Visual feedback
            const toast = document.createElement('div');
            toast.textContent = 'Code copied to clipboard!';
            toast.style.position = 'fixed';
            toast.style.bottom = '2rem';
            toast.style.right = '2rem';
            toast.style.backgroundColor = 'var(--accent-primary)';
            toast.style.color = '#fff';
            toast.style.padding = '0.75rem 1.25rem';
            toast.style.borderRadius = '8px';
            toast.style.boxShadow = 'var(--shadow-lg)';
            toast.style.zIndex = '9999';
            toast.style.fontSize = '0.875rem';
            toast.style.fontWeight = '500';
            toast.style.animation = 'fadeIn 0.2s ease-out';
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 2000);
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
