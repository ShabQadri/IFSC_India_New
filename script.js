let banksData = null;
let banksList = null;
let ifscData = null;

// Fetch all required data
async function fetchData() {
    try {
        const [banksResponse, bankNamesResponse, ifscResponse] = await Promise.all([
            fetch('src/banks.json'),
            fetch('src/banknames.json'),
            fetch('src/IFSC.json')
        ]);

        banksData = await banksResponse.json();
        banksList = await bankNamesResponse.json();
        ifscData = await ifscResponse.json();
        
        // Initialize the search functionality
        initializeBankSearch();
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading bank data. Please try again later.');
    }
}

// Initialize bank search functionality
function initializeBankSearch() {
    const bankSearch = document.getElementById('bankSearch');
    const searchResults = document.getElementById('bankSearchResults');
    const bankSelect = document.getElementById('bankName');
    
    // Enable search input
    bankSearch.disabled = false;

    // Add search input listener
    bankSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (searchTerm.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        // Filter matching banks
        const matches = Object.entries(banksList)
            .filter(([_, name]) => name.toLowerCase().includes(searchTerm))
            .slice(0, 10);

        if (matches.length > 0) {
            searchResults.innerHTML = matches
                .map(([code, name]) => `<div data-code="${code}">${name}</div>`)
                .join('');
            searchResults.style.display = 'block';
        } else {
            searchResults.style.display = 'none';
        }
    });

    // Add click listener for search results
    searchResults.addEventListener('click', (e) => {
        const selectedBank = e.target.closest('div');
        if (selectedBank) {
            const bankCode = selectedBank.dataset.code;
            const bankName = selectedBank.textContent;
            
            bankSearch.value = bankName;
            searchResults.style.display = 'none';
            
            // Update bank select and load states
            bankSelect.innerHTML = `
                <option value="">Select Bank</option>
                <option value="${bankCode}" selected>${bankName}</option>
            `;
            loadStates(bankCode);
        }
    });
}

// Load states for selected bank
function loadStates(bankCode) {
    const stateSelect = document.getElementById('state');
    if (ifscData[bankCode] && ifscData[bankCode].states) {
        const states = ifscData[bankCode].states;
        stateSelect.innerHTML = `
            <option value="">Select State</option>
            ${states.map(state => `<option value="${state}">${state}</option>`).join('')}
        `;
        stateSelect.disabled = false;
    }
    resetSelect('district', true);
    resetSelect('branch', true);
}

// Load cities for selected state
function loadCities(state) {
    const bankCode = document.getElementById('bankName').value;
    const citySelect = document.getElementById('district');
    
    if (ifscData[bankCode] && ifscData[bankCode].cities[state]) {
        const cities = ifscData[bankCode].cities[state];
        citySelect.innerHTML = `
            <option value="">Select City/District</option>
            ${cities.map(city => `<option value="${city}">${city}</option>`).join('')}
        `;
        citySelect.disabled = false;
    }
    resetSelect('branch', true);
}

// Load branches for selected city
function loadBranches(city) {
    const bankCode = document.getElementById('bankName').value;
    const state = document.getElementById('state').value;
    const branchSelect = document.getElementById('branch');
    const cityKey = `${state}_${city}`;
    
    if (ifscData[bankCode] && ifscData[bankCode].branches[cityKey]) {
        const branches = Object.entries(ifscData[bankCode].branches[cityKey])
            .sort((a, b) => a[0].localeCompare(b[0]));
        
        branchSelect.innerHTML = `
            <option value="">Select Branch</option>
            ${branches.map(([branch, ifsc]) => `<option value="${ifsc}">${branch}</option>`).join('')}
        `;
        branchSelect.disabled = false;
    }
}

// Reset select element
function resetSelect(id, disable = false) {
    const select = document.getElementById(id);
    const label = id === 'district' ? 'City/District' : id.charAt(0).toUpperCase() + id.slice(1);
    select.innerHTML = `<option value="">Select ${label}</option>`;
    select.disabled = disable;
}

// Copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show copied notification
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.textContent = 'IFSC copied!';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Add event listeners when page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchData();

    // Add change listeners for dropdowns
    document.getElementById('state').addEventListener('change', (e) => {
        if (e.target.value) {
            loadCities(e.target.value);
        }
    });

    document.getElementById('district').addEventListener('change', (e) => {
        if (e.target.value) {
            loadBranches(e.target.value);
        }
    });

    // Add click listener for find IFSC button
    document.getElementById('findIfsc').addEventListener('click', () => {
        const branchSelect = document.getElementById('branch');
        const resultContainer = document.getElementById('result');
        
        if (branchSelect.value) {
            const ifscCode = branchSelect.value;
            const branchInfo = banksData[ifscCode];
            resultContainer.innerHTML = `
                <div class="ifsc-result">
                    <div class="ifsc-header">
                        <h3>IFSC Code: ${ifscCode}</h3>
                        <button onclick="copyToClipboard('${ifscCode}')" class="copy-btn">
                            <i class="fas fa-copy"></i> Copy Code
                        </button>
                    </div>
                    <div class="bank-details">
                        <div class="detail-row">
                            <label>Bank:</label>
                            <span>${branchInfo.bank}</span>
                        </div>
                        <div class="detail-row">
                            <label>Branch:</label>
                            <span>${branchInfo.branch}</span>
                        </div>
                        <div class="detail-row">
                            <label>Address:</label>
                            <span>${branchInfo.address}</span>
                        </div>
                        <div class="detail-row">
                            <label>City:</label>
                            <span>${branchInfo.city}</span>
                        </div>
                        ${branchInfo.city2 ? `
                            <div class="detail-row">
                                <label>District:</label>
                                <span>${branchInfo.city2}</span>
                            </div>
                        ` : ''}
                        <div class="detail-row">
                            <label>State:</label>
                            <span>${branchInfo.state}</span>
                        </div>
                        ${(branchInfo.stdcode || branchInfo.phone) ? `
                            <div class="detail-row">
                                <label>Contact:</label>
                                <span>${branchInfo.stdcode ? branchInfo.stdcode + '-' : ''}${branchInfo.phone || 'N/A'}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            resultContainer.style.display = 'block';
        }
    });
});
