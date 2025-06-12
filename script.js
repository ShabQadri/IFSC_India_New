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
        
        // First, load banknames.json and banks.json as they're needed for search
        const [bankNamesResponse, banksResponse] = await Promise.all([
            fetch('src/banknames.json'),
            fetch('src/banks.json')
        ]);
        
        banksList = await bankNamesResponse.json();
        banksData = await banksResponse.json();
        
        // Enable bank search immediately after loading bank names
        hideLoading(bankSearch);
        initializeBankSearch();
        
        // Load IFSC data
        const ifscResponse = await fetch('src/IFSC.json');
        ifscData = await ifscResponse.json();
        
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading bank data. Please try again.');
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
            
            // Store selected bank code
            bankSearch.dataset.selectedBank = bankCode;
            
            // Show loading while getting states
            const stateSelect = document.getElementById('state');
            showLoading(stateSelect);
            
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

        // Get states from IFSC data
        if (ifscData && ifscData[bankCode]) {
            const states = ifscData[bankCode].states || [];
            
            if (states.length > 0) {
                stateSelect.innerHTML = `
                    <option value="">Select State</option>
                    ${states.sort().map(state => `<option value="${state}">${state}</option>`).join('')}
                `;
                stateSelect.disabled = false;

                // Add event listener for state selection
                stateSelect.onchange = function() {
                    if (this.value) {
                        loadCities(this.value, bankCode);
                    } else {
                        resetSelect('district', true);
                        resetSelect('branch', true);
                    }
                };
            }
        } else {
            console.error('No data found for bank code:', bankCode);
            stateSelect.innerHTML = '<option value="">No states found</option>';
            stateSelect.disabled = true;
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
        
        if (ifscData && ifscData[bankCode] && ifscData[bankCode].cities && ifscData[bankCode].cities[state]) {
            const cities = ifscData[bankCode].cities[state];
            
            if (cities.length > 0) {
                citySelect.innerHTML = `
                    <option value="">Select City/District</option>
                    ${cities.sort().map(city => `<option value="${city}">${city}</option>`).join('')}
                `;
                citySelect.disabled = false;

                // Add event listener for city selection
                citySelect.onchange = function() {
                    if (this.value) {
                        loadBranches(bankCode, state, this.value);
                    } else {
                        resetSelect('branch', true);
                    }
                };
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
        
        const branchKey = `${state}_${city}`;
        if (ifscData && ifscData[bankCode].branches && ifscData[bankCode].branches[branchKey]) {
            const branches = Object.entries(ifscData[bankCode].branches[branchKey]);
            
            if (branches.length > 0) {
                branchSelect.innerHTML = `
                    <option value="">Select Branch</option>
                    ${branches.sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([name, ifsc]) => `<option value="${ifsc}">${name}</option>`).join('')}
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

// Find IFSC button click handler
document.getElementById('findIfsc').addEventListener('click', function() {
    const bankCode = document.getElementById('bankSearch').dataset.selectedBank;
    const state = document.getElementById('state').value;
    const city = document.getElementById('district').value;
    const ifscCode = document.getElementById('branch').value;
    const branchName = document.getElementById('branch').selectedOptions[0].text;

    if (!bankCode || !state || !city || !ifscCode) {
        alert('Please select all fields');
        return;
    }

    // Get branch details from banks.json
    const branchInfo = banksData[ifscCode];
    if (!branchInfo) {
        alert('Branch information not found');
        return;
    }

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
                    <span>${banksList[bankCode]}</span>
                </div>
                <div class="detail-row">
                    <label><i class="fas fa-building"></i> Branch:</label>
                    <span>${branchName}</span>
                </div>
                <div class="detail-row">
                    <label><i class="fas fa-map-marker-alt"></i> State:</label>
                    <span>${branchInfo.state || state}</span>
                </div>
                <div class="detail-row">
                    <label><i class="fas fa-city"></i> City:</label>
                    <span>${branchInfo.city || city}</span>
                </div>
                ${branchInfo.district ? `
                    <div class="detail-row">
                        <label><i class="fas fa-map"></i> District:</label>
                        <span>${branchInfo.district}</span>
                    </div>
                ` : ''}
                <div class="detail-row">
                    <label><i class="fas fa-map-marked-alt"></i> Address:</label>
                    <span>${branchInfo.address || 'N/A'}</span>
                </div>
                ${(branchInfo.contact || branchInfo.phone) ? `
                    <div class="detail-row">
                        <label><i class="fas fa-phone"></i> Contact:</label>
                        <span>${branchInfo.contact || branchInfo.phone || 'N/A'}</span>
                    </div>
                ` : ''}
                <div class="detail-row">
                    <label><i class="fas fa-qrcode"></i> IFSC:</label>
                    <span>${ifscCode}</span>
                </div>
            </div>
        </div>
    `;
    resultDiv.style.display = 'block';
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
