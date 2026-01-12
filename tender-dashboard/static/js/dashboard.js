// Sirona Care and Health - Tender Dashboard JavaScript

let allTenders = [];
let filteredTenders = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    loadTenders();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', refreshTenders);

    // Sort dropdown
    document.getElementById('sort-by').addEventListener('change', applyFiltersAndSort);

    // Date filters
    document.getElementById('date-from').addEventListener('change', applyFiltersAndSort);
    document.getElementById('date-to').addEventListener('change', applyFiltersAndSort);

    // Clear filters button
    document.getElementById('clear-filters').addEventListener('click', clearFilters);
}

// Load tenders from API
async function loadTenders(forceRefresh = false) {
    showLoading();
    hideError();

    try {
        const url = forceRefresh ? '/api/refresh' : '/api/tenders';
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        allTenders = data.tenders;

        updateLastUpdated(data.last_updated);
        updateTenderCount(data.count);

        applyFiltersAndSort();
        hideLoading();

    } catch (error) {
        console.error('Error loading tenders:', error);
        showError('Failed to load tender data. Please try again later.');
        hideLoading();
    }
}

// Refresh tenders
async function refreshTenders() {
    const refreshBtn = document.getElementById('refresh-btn');
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<svg class="icon spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Refreshing...';

    await loadTenders(true);

    refreshBtn.disabled = false;
    refreshBtn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Refresh Data';
}

// Apply filters and sorting
function applyFiltersAndSort() {
    // Start with all tenders
    filteredTenders = [...allTenders];

    // Apply date range filter
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;

    if (dateFrom || dateTo) {
        filteredTenders = filteredTenders.filter(tender => {
            const tenderDate = new Date(tender.date);

            if (dateFrom && tenderDate < new Date(dateFrom)) {
                return false;
            }
            if (dateTo && tenderDate > new Date(dateTo + 'T23:59:59')) {
                return false;
            }
            return true;
        });
    }

    // Apply sorting
    const sortBy = document.getElementById('sort-by').value;
    sortTenders(sortBy);

    // Display tenders
    displayTenders();
}

// Sort tenders based on selected criteria
function sortTenders(sortBy) {
    switch (sortBy) {
        case 'date-desc':
            filteredTenders.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'date-asc':
            filteredTenders.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case 'deadline-asc':
            filteredTenders.sort((a, b) => {
                const dateA = a.deadline !== 'Not specified' ? new Date(a.deadline) : new Date('9999-12-31');
                const dateB = b.deadline !== 'Not specified' ? new Date(b.deadline) : new Date('9999-12-31');
                return dateA - dateB;
            });
            break;
        case 'deadline-desc':
            filteredTenders.sort((a, b) => {
                const dateA = a.deadline !== 'Not specified' ? new Date(a.deadline) : new Date('1900-01-01');
                const dateB = b.deadline !== 'Not specified' ? new Date(b.deadline) : new Date('1900-01-01');
                return dateB - dateA;
            });
            break;
        case 'title':
            filteredTenders.sort((a, b) => a.title.localeCompare(b.title));
            break;
    }
}

// Display tenders on the page
function displayTenders() {
    const container = document.getElementById('tenders-container');
    const noResults = document.getElementById('no-results');

    if (filteredTenders.length === 0) {
        container.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';
    container.innerHTML = filteredTenders.map(tender => createTenderCard(tender)).join('');
}

// Create HTML for a tender card
function createTenderCard(tender) {
    const deadline = formatDeadline(tender.deadline);
    const isUrgent = isDeadlineUrgent(tender.deadline);
    const publishDate = formatDate(tender.date);

    return `
        <div class="tender-card">
            <h3>${escapeHtml(tender.title)}</h3>

            <div class="tender-meta">
                <div class="meta-item">
                    <span class="meta-label">Buyer</span>
                    <span class="meta-value">${escapeHtml(tender.buyer)}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Published</span>
                    <span class="meta-value">${publishDate}</span>
                </div>
                ${tender.status ? `
                <div class="meta-item">
                    <span class="meta-label">Status</span>
                    <span class="meta-value">${escapeHtml(tender.status)}</span>
                </div>
                ` : ''}
            </div>

            <p class="description">${escapeHtml(tender.description)}</p>

            <div class="tender-footer">
                <div>
                    ${tender.value ? `<span class="value-badge">💰 ${escapeHtml(tender.value)}</span>` : ''}
                    ${deadline !== 'Not specified' ? `
                        <span class="deadline-badge ${isUrgent ? 'urgent' : ''}">
                            ⏰ Deadline: ${deadline}
                        </span>
                    ` : ''}
                </div>
                ${tender.url ? `
                    <a href="${escapeHtml(tender.url)}" target="_blank" rel="noopener noreferrer" class="view-tender-btn">
                        View Tender
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                ` : ''}
            </div>
        </div>
    `;
}

// Format date for display
function formatDate(dateString) {
    if (!dateString || dateString === 'Not specified') return 'Not specified';

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

// Format deadline for display
function formatDeadline(deadline) {
    if (!deadline || deadline === 'Not specified') return 'Not specified';

    try {
        const date = new Date(deadline);
        const now = new Date();
        const diffTime = date - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return formatDate(deadline) + ' (Expired)';
        } else if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Tomorrow';
        } else if (diffDays <= 7) {
            return `${diffDays} days`;
        } else {
            return formatDate(deadline);
        }
    } catch (e) {
        return deadline;
    }
}

// Check if deadline is urgent (within 7 days)
function isDeadlineUrgent(deadline) {
    if (!deadline || deadline === 'Not specified') return false;

    try {
        const date = new Date(deadline);
        const now = new Date();
        const diffTime = date - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
    } catch (e) {
        return false;
    }
}

// Update last updated timestamp
function updateLastUpdated(timestamp) {
    const element = document.getElementById('last-updated');
    if (timestamp) {
        const date = new Date(timestamp);
        element.textContent = date.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } else {
        element.textContent = 'Never';
    }
}

// Update tender count
function updateTenderCount(count) {
    document.getElementById('tender-count').textContent = count;
}

// Clear all filters
function clearFilters() {
    document.getElementById('date-from').value = '';
    document.getElementById('date-to').value = '';
    document.getElementById('sort-by').value = 'date-desc';
    applyFiltersAndSort();
}

// Show loading state
function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('tenders-container').style.display = 'none';
    document.getElementById('no-results').style.display = 'none';
}

// Hide loading state
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('tenders-container').style.display = 'grid';
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Hide error message
function hideError() {
    document.getElementById('error-message').style.display = 'none';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Add CSS for spinning animation
const style = document.createElement('style');
style.textContent = `
    .spinning {
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
