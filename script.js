let banksData = null;
let banksList = null;
let ifscData = null;

// Add loading indicator
function showLoading(element) {
    element.classList.add('loading');
    element.disabled = true;
}

function hideLoading(element) {
    element.classList.remove('loading');
    element.disabled = false;
}

// Helper function to reset select elements
function resetSelect(elementId, disable = true) {
    const select = document.getElementById(elementId);
    select.innerHTML = `<option value="">Select ${elementId.charAt(0).toUpperCase() + elementId.slice(1)}</option>`;
    select.disabled = disable;
}

// Progressive data loading
async function fetchData() {
    try {
        // Show loading state
        const bankSearch = document.getElementById('bankSearch');
        showLoading(bankSearch);
        
        // First, only load banknames.json as it's small
        const bankNamesResponse = await fetch('src/banknames.json');
        banksList = await bankNamesResponse.json();
        
        // Enable bank search immediately after loading bank names
        hideLoading(bankSearch);
        initializeBankSearch();
        
        // Load IFSC data immediately after banknames
        const ifscResponse = await fetch('src/IFSC.json');
        ifscData = await ifscResponse.json();
        
        // Load banks data in background
        fetch('src/banks.json')
            .then(response => response.json())
            .then(data => {
                banksData = data;
            })
            .catch(error => console.error('Error loading banks data:', error));
        
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading bank data. Please try again later.');
    }
}

// Initialize bank search functionality
function initializeBankSearch() {
    const bankSearch = document.getElementById('bankSearch');
    const searchResults = document.getElementById('bankSearchResults');
    
    // Enable search input
    bankSearch.disabled = false;
    bankSearch.placeholder = "Start typing bank name...";

    // Add search input listener with debounce
    let debounceTimer;
    bankSearch.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const searchTerm = e.target.value.toLowerCase();
        
        if (searchTerm.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        debounceTimer = setTimeout(() => {
            // Filter matching banks
            const matches = Object.entries(banksList)
                .filter(([_, name]) => name.toLowerCase().includes(searchTerm))
                .slice(0, 10);

            if (matches.length > 0) {
                searchResults.innerHTML = matches
                    .map(([code, name]) => `
                        <div class="search-result-item" data-code="${code}">
                            <i class="fas fa-bank"></i>
                            <span>${name}</span>
                        </div>
                    `).join('');
                searchResults.style.display = 'block';
            } else {
                searchResults.style.display = 'none';
            }
        }, 150); // Debounce delay
    });

    // Add click listener for search results
    searchResults.addEventListener('click', async (e) => {
        const selectedBank = e.target.closest('.search-result-item');
        if (selectedBank) {
            const bankCode = selectedBank.dataset.code;
            const bankName = selectedBank.querySelector('span').textContent;
            
            bankSearch.value = bankName;
            searchResults.style.display = 'none';
            
            // Show loading while getting states
            const stateSelect = document.getElementById('state');
            showLoading(stateSelect);
            
            // Store selected bank code
            bankSearch.dataset.selectedBank = bankCode;
            
            // Load states
            await loadStates(bankCode);
            hideLoading(stateSelect);
        }
    });
}

// Load states for selected bank
async function loadStates(bankCode) {
    const stateSelect = document.getElementById('state');
    
    try {
        showLoading(stateSelect);
        
        // Wait for IFSC data if it's not loaded yet
        if (!ifscData) {
            await new Promise((resolve, reject) => {
                let attempts = 0;
                const checkData = setInterval(() => {
                    attempts++;
                    if (ifscData) {
                        clearInterval(checkData);
                        resolve();
                    }
                    if (attempts > 50) { // 5 seconds timeout
                        clearInterval(checkData);
                        reject(new Error('Timeout waiting for IFSC data'));
                    }
                }, 100);
            });
        }

        if (ifscData && ifscData[bankCode]) {
            const states = Object.keys(ifscData[bankCode]);
            
            if (states.length > 0) {
                stateSelect.innerHTML = `
                    <option value="">Select State</option>
                    ${states.sort().map(state => `<option value="${state}">${state}</option>`).join('')}
                `;
                stateSelect.disabled = false;

                // Add event listener for state selection
                stateSelect.addEventListener('change', function() {
                    if (this.value) {
                        loadCities(this.value, bankCode);
                    } else {
                        resetSelect('district', true);
                        resetSelect('branch', true);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading states:', error);
        alert('Error loading states. Please try again.');
    } finally {
        hideLoading(stateSelect);
    }
}

// Load cities for selected state
async function loadCities(state, bankCode) {
    const citySelect = document.getElementById('district');
    
    try {
        showLoading(citySelect);
        
        if (ifscData && ifscData[bankCode] && ifscData[bankCode][state]) {
            const cities = Object.keys(ifscData[bankCode][state]);
            
            if (cities.length > 0) {
                citySelect.innerHTML = `
                    <option value="">Select City/District</option>
                    ${cities.sort().map(city => `<option value="${city}">${city}</option>`).join('')}
                `;
                citySelect.disabled = false;

                // Add event listener for city selection
                citySelect.addEventListener('change', function() {
                    if (this.value) {
                        loadBranches(bankCode, state, this.value);
                    } else {
                        resetSelect('branch', true);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading cities:', error);
        alert('Error loading cities. Please try again.');
    } finally {
        hideLoading(citySelect);
    }
}

// Load branches for selected city
async function loadBranches(bankCode, state, city) {
    const branchSelect = document.getElementById('branch');
    
    try {
        showLoading(branchSelect);
        
        if (ifscData && ifscData[bankCode][state][city]) {
            const branches = Object.keys(ifscData[bankCode][state][city]);
            
            if (branches.length > 0) {
                branchSelect.innerHTML = `
                    <option value="">Select Branch</option>
                    ${branches.sort().map(branch => `<option value="${branch}">${branch}</option>`).join('')}
                `;
                branchSelect.disabled = false;
            }
        }
    } catch (error) {
        console.error('Error loading branches:', error);
        alert('Error loading branches. Please try again.');
    } finally {
        hideLoading(branchSelect);
    }
}

// Add loading indicator CSS
const style = document.createElement('style');
style.textContent = `
    .loading {
        position: relative;
        pointer-events: none;
    }
    .loading::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 20px;
        height: 20px;
        margin: -10px 0 0 -10px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Find IFSC button click handler
document.getElementById('findIfsc').addEventListener('click', async function() {
    const bankCode = document.getElementById('bankSearch').dataset.selectedBank;
    const state = document.getElementById('state').value;
    const city = document.getElementById('district').value;
    const branch = document.getElementById('branch').value;

    if (!bankCode || !state || !city || !branch) {
        alert('Please select all fields');
        return;
    }

    try {
        if (ifscData && ifscData[bankCode][state][city][branch]) {
            const ifscCode = ifscData[bankCode][state][city][branch];
            const bankName = banksList[bankCode];

            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = `
                <div class="ifsc-result">
                    <div class="ifsc-header">
                        <h3>IFSC Code Details</h3>
                        <button class="copy-btn" onclick="copyToClipboard('${ifscCode}')">
                            <i class="far fa-copy"></i> Copy IFSC
                        </button>
                    </div>
                    <div class="bank-details">
                        <div class="detail-row">
                            <label><i class="fas fa-university"></i> Bank:</label>
                            <span>${bankName}</span>
                        </div>
                        <div class="detail-row">
                            <label><i class="fas fa-map-marker-alt"></i> State:</label>
                            <span>${state}</span>
                        </div>
                        <div class="detail-row">
                            <label><i class="fas fa-city"></i> City:</label>
                            <span>${city}</span>
                        </div>
                        <div class="detail-row">
                            <label><i class="fas fa-building"></i> Branch:</label>
                            <span>${branch}</span>
                        </div>
                        <div class="detail-row">
                            <label><i class="fas fa-qrcode"></i> IFSC:</label>
                            <span>${ifscCode}</span>
                        </div>
                    </div>
                </div>
            `;
            resultDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Error finding IFSC:', error);
        alert('Error finding IFSC code. Please try again.');
    }
});

// Copy to clipboard function
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.innerHTML = '<i class="fas fa-check-circle"></i> IFSC Code copied!';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy IFSC code');
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', fetchData);
