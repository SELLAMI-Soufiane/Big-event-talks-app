// Application State
let appState = {
    releases: [],
    filteredReleases: [],
    selectedRelease: null,
    activeFilter: 'All',
    searchQuery: '',
    sortBy: 'newest'
};

// DOM Elements
const elements = {
    refreshBtn: document.getElementById('refresh-btn'),
    lastUpdatedText: document.getElementById('last-updated-text'),
    syncStatusDot: document.querySelector('.status-dot'),
    syncStatusText: document.querySelector('.status-text'),
    
    // Stats
    statTotal: document.getElementById('stat-total'),
    statFeatures: document.getElementById('stat-features'),
    statAnnouncements: document.getElementById('stat-announcements'),
    statSecurity: document.getElementById('stat-security'),
    statCards: document.querySelectorAll('.stat-card'),
    
    // Toolbar & Pills
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    sortSelect: document.getElementById('sort-select'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    pillsContainer: document.getElementById('pills-container'),
    pillBtns: document.querySelectorAll('.pill-btn'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    
    // Feed States
    loadingState: document.getElementById('loading-state'),
    emptyState: document.getElementById('empty-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    feedGrid: document.getElementById('feed-grid'),
    
    // Selection Bar
    selectionBar: document.getElementById('selection-bar'),
    selectedCountText: document.getElementById('selected-count-text'),
    selectedTitlePreview: document.getElementById('selected-title-preview'),
    clearSelectionBtn: document.getElementById('clear-selection-btn'),
    tweetSelectionBtn: document.getElementById('tweet-selection-btn'),
    
    // Modal
    tweetModal: document.getElementById('tweet-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    modalUpdateType: document.getElementById('modal-update-type'),
    modalUpdateDate: document.getElementById('modal-update-date'),
    modalUpdateSnippet: document.getElementById('modal-update-snippet'),
    tweetEditor: document.getElementById('tweet-editor'),
    charCounter: document.getElementById('char-counter'),
    progressCircle: document.getElementById('progress-circle'),
    copyTweetBtn: document.getElementById('copy-tweet-btn'),
    postTweetBtn: document.getElementById('post-tweet-btn')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    fetchReleases();
});

// Event Listeners Configuration
function setupEventListeners() {
    // Refresh Actions
    elements.refreshBtn.addEventListener('click', () => fetchReleases(true));
    elements.retryBtn.addEventListener('click', () => fetchReleases(true));
    
    // Search Actions
    elements.searchInput.addEventListener('input', (e) => {
        appState.searchQuery = e.target.value.toLowerCase().trim();
        elements.clearSearchBtn.style.display = appState.searchQuery ? 'flex' : 'none';
        applyFiltersAndRender();
    });
    
    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        appState.searchQuery = '';
        elements.clearSearchBtn.style.display = 'none';
        elements.searchInput.focus();
        applyFiltersAndRender();
    });
    
    // Sort Select
    elements.sortSelect.addEventListener('change', (e) => {
        appState.sortBy = e.target.value;
        applyFiltersAndRender();
    });
    
    // Export CSV Actions
    elements.exportCsvBtn.addEventListener('click', exportToCSV);
    
    // Category Pills
    elements.pillsContainer.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.pill-btn');
        if (!targetBtn) return;
        
        elements.pillBtns.forEach(btn => btn.classList.remove('active'));
        targetBtn.classList.add('active');
        
        appState.activeFilter = targetBtn.dataset.type;
        applyFiltersAndRender();
    });
    
    // Stats Dashboard Cards (Quick Filtering)
    elements.statCards.forEach(card => {
        card.addEventListener('click', () => {
            const filterType = card.dataset.filterType;
            // Activate the corresponding pill button
            elements.pillBtns.forEach(btn => {
                if (btn.dataset.type === filterType) {
                    btn.classList.add('active');
                    btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                } else {
                    btn.classList.remove('active');
                }
            });
            appState.activeFilter = filterType;
            applyFiltersAndRender();
        });
    });
    
    // Reset Filters Button
    elements.resetFiltersBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        appState.searchQuery = '';
        elements.clearSearchBtn.style.display = 'none';
        
        elements.pillBtns.forEach(btn => {
            if (btn.dataset.type === 'All') btn.classList.add('active');
            else btn.classList.remove('active');
        });
        appState.activeFilter = 'All';
        applyFiltersAndRender();
    });
    
    // Selection Bar Buttons
    elements.clearSelectionBtn.addEventListener('click', deselectAll);
    elements.tweetSelectionBtn.addEventListener('click', () => {
        if (appState.selectedRelease) {
            openTweetModal(appState.selectedRelease);
        }
    });
    
    // Modal Close
    elements.closeModalBtn.addEventListener('click', closeTweetModal);
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) closeTweetModal();
    });
    
    // Tweet Editor Input Handler (Live validation and formatting)
    elements.tweetEditor.addEventListener('input', updateCharCounter);
    
    // Modal Actions
    elements.copyTweetBtn.addEventListener('click', copyTweetText);
    elements.postTweetBtn.addEventListener('click', postTweet);
}

// Fetch Release Notes
async function fetchReleases(forceRefresh = false) {
    // Show Loading state
    elements.loadingState.style.display = 'block';
    elements.feedGrid.style.display = 'none';
    elements.emptyState.style.display = 'none';
    elements.errorState.style.display = 'none';
    
    // Update Button Spinner
    elements.refreshBtn.disabled = true;
    elements.refreshBtn.classList.add('spinning');
    
    // Update status bar
    elements.syncStatusDot.className = 'status-dot loading';
    elements.syncStatusText.textContent = 'Syncing...';
    
    const url = forceRefresh ? '/api/releases?refresh=true' : '/api/releases';
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        
        if (result.status === 'success') {
            appState.releases = result.data;
            
            // UI updates
            elements.lastUpdatedText.textContent = `Synced at ${result.last_updated.split(' ')[1] || result.last_updated}`;
            elements.syncStatusDot.className = 'status-dot green';
            elements.syncStatusText.textContent = result.source === 'network' ? 'Updated' : 'Cached';
            
            // Deselect any previous selection when reloading data
            deselectAll();
            
            // Compute and render stats
            updateStats();
            
            // Filter and render grid
            applyFiltersAndRender();
        } else {
            throw new Error(result.message || 'Unknown error occurred');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        elements.errorState.style.display = 'block';
        elements.errorMessage.textContent = error.message || 'Failed to fetch release notes from Google Cloud.';
        elements.syncStatusDot.className = 'status-dot';
        elements.syncStatusText.textContent = 'Offline';
    } finally {
        elements.loadingState.style.display = 'none';
        elements.refreshBtn.disabled = false;
        elements.refreshBtn.classList.remove('spinning');
    }
}

// Update Stats Dashboard counts
function updateStats() {
    const total = appState.releases.length;
    const features = appState.releases.filter(r => r.type.toLowerCase() === 'feature').length;
    const announcements = appState.releases.filter(r => r.type.toLowerCase() === 'announcement').length;
    
    // Security + Deprecations count
    const security = appState.releases.filter(r => {
        const t = r.type.toLowerCase();
        return t === 'security' || t === 'deprecation';
    }).length;
    
    elements.statTotal.textContent = total;
    elements.statFeatures.textContent = features;
    elements.statAnnouncements.textContent = announcements;
    elements.statSecurity.textContent = security;
}

// Apply Search Filters, Categories & Sort Orders
function applyFiltersAndRender() {
    let filtered = [...appState.releases];
    
    // 1. Category Pill Filter
    if (appState.activeFilter !== 'All') {
        if (appState.activeFilter === 'Security') {
            // Group security and deprecations under one dashboard/quick filter if clicked
            filtered = filtered.filter(r => {
                const t = r.type.toLowerCase();
                return t === 'security' || t === 'deprecation';
            });
        } else {
            filtered = filtered.filter(r => r.type.toLowerCase() === appState.activeFilter.toLowerCase());
        }
    }
    
    // 2. Search Text Query Filter
    if (appState.searchQuery) {
        filtered = filtered.filter(r => {
            return r.type.toLowerCase().includes(appState.searchQuery) ||
                   r.date.toLowerCase().includes(appState.searchQuery) ||
                   r.text.toLowerCase().includes(appState.searchQuery);
        });
    }
    
    // 3. Sorting
    filtered.sort((a, b) => {
        // Feed dates are parsed in chronological order, so we can convert the date strings or use the feed updated timestamp
        const timeA = new Date(a.updated).getTime();
        const timeB = new Date(b.updated).getTime();
        
        if (appState.sortBy === 'newest') {
            return timeB - timeA;
        } else {
            return timeA - timeB;
        }
    });
    
    appState.filteredReleases = filtered;
    renderFeedGrid();
}

// Render the grid list of release cards
function renderFeedGrid() {
    elements.feedGrid.innerHTML = '';
    
    if (appState.filteredReleases.length === 0) {
        elements.feedGrid.style.display = 'none';
        elements.emptyState.style.display = 'block';
        return;
    }
    
    elements.emptyState.style.display = 'none';
    elements.feedGrid.style.display = 'flex';
    
    appState.filteredReleases.forEach(release => {
        const isSelected = appState.selectedRelease && appState.selectedRelease.id === release.id;
        
        const card = document.createElement('div');
        card.className = `feed-card ${release.type} ${isSelected ? 'selected' : ''}`;
        card.dataset.id = release.id;
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta">
                    <span class="category-tag">${release.type}</span>
                    <span class="card-date">${release.date}</span>
                </div>
                <div class="card-selectors">
                    <label class="custom-checkbox-container" title="Select this update to Tweet">
                        <input type="checkbox" class="card-checkbox" ${isSelected ? 'checked' : ''}>
                        <span class="checkbox-checkmark"></span>
                    </label>
                </div>
            </div>
            <div class="card-body">
                ${release.html}
            </div>
            <div class="card-actions">
                <button class="card-copy-btn" title="Copy update text to clipboard">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    <span>Copy Text</span>
                </button>
                <button class="card-tweet-btn" title="Tweet this specific update">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    <span>Tweet Update</span>
                </button>
            </div>
        `;
        
        // Card Click Handler (Select/Deselect)
        card.addEventListener('click', (e) => {
            // If the user clicked a link inside the card, let it open normally
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                return;
            }
            
            // If the user clicked the direct "Copy Text" button, copy text immediately
            if (e.target.closest('.card-copy-btn')) {
                e.stopPropagation();
                copyCardText(release, e.target.closest('.card-copy-btn'));
                return;
            }
            
            // If the user clicked the direct "Tweet Update" button, open the composer modal directly
            if (e.target.closest('.card-tweet-btn')) {
                e.stopPropagation();
                selectRelease(release);
                openTweetModal(release);
                return;
            }
            
            // For general clicks, toggle selection
            toggleSelection(release);
        });
        
        elements.feedGrid.appendChild(card);
    });
}

// Toggle Selection State
function toggleSelection(release) {
    if (appState.selectedRelease && appState.selectedRelease.id === release.id) {
        deselectAll();
    } else {
        selectRelease(release);
    }
}

// Select a Release Note
function selectRelease(release) {
    appState.selectedRelease = release;
    
    // Update DOM classes for cards
    const cards = elements.feedGrid.querySelectorAll('.feed-card');
    cards.forEach(card => {
        const checkbox = card.querySelector('.card-checkbox');
        if (card.dataset.id === release.id) {
            card.classList.add('selected');
            if (checkbox) checkbox.checked = true;
        } else {
            card.classList.remove('selected');
            if (checkbox) checkbox.checked = false;
        }
    });
    
    // Update floating selection bar
    elements.selectedCountText.textContent = '1';
    elements.selectedTitlePreview.textContent = `[${release.type}] ${release.text}`;
    elements.selectionBar.classList.add('active');
}

// Deselect all cards
function deselectAll() {
    appState.selectedRelease = null;
    
    const cards = elements.feedGrid.querySelectorAll('.feed-card');
    cards.forEach(card => {
        card.classList.remove('selected');
        const checkbox = card.querySelector('.card-checkbox');
        if (checkbox) checkbox.checked = false;
    });
    
    elements.selectionBar.classList.remove('active');
}

// Tweet construction algorithm (fits under 280 limit)
function generateDefaultTweetText(release) {
    const typeStr = release.type;
    const dateStr = release.date;
    const linkStr = release.link;
    
    const prefix = `BigQuery ${typeStr} (${dateStr}): `;
    const suffix = `\n\nRead more: ${linkStr}\n#BigQuery #GCP`;
    
    // Max characters allowed for description
    const maxDesc = 280 - (prefix.length + suffix.length);
    
    let descriptionText = release.text;
    if (descriptionText.length > maxDesc) {
        // Subtract 3 for '...'
        descriptionText = descriptionText.substring(0, maxDesc - 3) + '...';
    }
    
    return `${prefix}${descriptionText}${suffix}`;
}

// Open Tweet Composer Modal
function openTweetModal(release) {
    // Populate Modal Preview Card
    elements.modalUpdateType.textContent = release.type;
    // Set matching colors for tag
    elements.modalUpdateType.className = `preview-tag ${release.type}`;
    elements.modalUpdateDate.textContent = release.date;
    elements.modalUpdateSnippet.textContent = release.text;
    
    // Generate text and insert into textarea
    const defaultText = generateDefaultTweetText(release);
    elements.tweetEditor.value = defaultText;
    
    // Open Modal
    elements.tweetModal.classList.add('active');
    
    // Focus Editor and update char counter
    elements.tweetEditor.focus();
    updateCharCounter();
}

// Close Modal
function closeTweetModal() {
    elements.tweetModal.classList.remove('active');
}

// Update Modal Character Counter and Progress Indicator Ring
function updateCharCounter() {
    const text = elements.tweetEditor.value;
    const length = text.length;
    elements.charCounter.textContent = `${length} / 280`;
    
    // Circumference of the indicator (r=9) = 2 * pi * r = 56.54
    const circumference = 56.54;
    const percent = Math.min(100, (length / 280) * 100);
    const offset = circumference - (percent / 100) * circumference;
    
    elements.progressCircle.style.strokeDashoffset = offset;
    
    if (length > 280) {
        // Limit Exceeded
        elements.progressCircle.style.stroke = '#ef4444'; // Red
        elements.charCounter.style.color = '#ef4444';
        elements.postTweetBtn.disabled = true;
    } else if (length > 250) {
        // Warning Zone
        elements.progressCircle.style.stroke = '#fbbf24'; // Yellow
        elements.charCounter.style.color = '#fbbf24';
        elements.postTweetBtn.disabled = false;
    } else {
        // Normal Zone
        elements.progressCircle.style.stroke = '#10b981'; // Green
        elements.charCounter.style.color = 'var(--text-secondary)';
        elements.postTweetBtn.disabled = false;
    }
}

// Copy Tweet text to clipboard
async function copyTweetText() {
    const text = elements.tweetEditor.value;
    try {
        await navigator.clipboard.writeText(text);
        
        // Button Feedback animation
        const originalHtml = elements.copyTweetBtn.innerHTML;
        elements.copyTweetBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span style="color: #10b981;">Copied!</span>
        `;
        
        setTimeout(() => {
            elements.copyTweetBtn.innerHTML = originalHtml;
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text:', err);
        alert('Failed to copy text. Please select and copy manually.');
    }
}

// Post Tweet opening Twitter Web Intent
function postTweet() {
    const text = elements.tweetEditor.value;
    if (text.length > 280) {
        alert('Your tweet exceeds the 280 character limit.');
        return;
    }
    
    const encoded = encodeURIComponent(text);
    const tweetUrl = `https://x.com/intent/tweet?text=${encoded}`;
    
    window.open(tweetUrl, '_blank');
}

// Copy single release note text to clipboard
async function copyCardText(release, btn) {
    const textToCopy = `BigQuery ${release.type} (${release.date}):\n${release.text}\n\nRead more: ${release.link}`;
    try {
        await navigator.clipboard.writeText(textToCopy);
        
        // Button Feedback animation
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span style="color: #10b981;">Copied!</span>
        `;
        
        setTimeout(() => {
            btn.innerHTML = originalHtml;
        }, 2000);
    } catch (err) {
        console.error('Failed to copy card text:', err);
        alert('Failed to copy text to clipboard.');
    }
}

// Export currently filtered releases to a CSV file
function exportToCSV() {
    const data = appState.filteredReleases;
    if (data.length === 0) {
        alert("No data available to export.");
        return;
    }
    
    const headers = ["ID", "Date", "Updated Timestamp", "Type", "Link", "Text Content"];
    
    const escapeCSV = (val) => {
        if (val === null || val === undefined) return "";
        let str = String(val);
        str = str.replace(/"/g, '""');
        if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
            str = `"${str}"`;
        }
        return str;
    };
    
    const csvRows = [];
    csvRows.push(headers.join(","));
    
    for (const item of data) {
        const row = [
            escapeCSV(item.id),
            escapeCSV(item.date),
            escapeCSV(item.updated),
            escapeCSV(item.type),
            escapeCSV(item.link),
            escapeCSV(item.text)
        ];
        csvRows.push(row.join(","));
    }
    
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    // Formatting filename: bigquery_releases_yyyy_mm_dd.csv
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "_");
    link.setAttribute("download", `bigquery_releases_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
