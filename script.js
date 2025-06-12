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
        
        // Load other data in the background
        const [banksResponse, ifscResponse] = await Promise.all([
            fetch('src/banks.json'),
            fetch('src/IFSC.json')
        ]);

        banksData = await banksResponse.json();
        ifscData = await ifscResponse.json();
        
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
            
            // Load states
            await loadStates(bankCode);
            hideLoading(stateSelect);
        }
    });
}

// Load states for selected bank
async function loadStates(bankCode) {
    const stateSelect = document.getElementById('state');
    
    if (!ifscData) {
        // If IFSC data isn't loaded yet, wait for it
        showLoading(stateSelect);
        await new Promise(resolve => {
            const checkData = setInterval(() => {
                if (ifscData) {
                    clearInterval(checkData);
                    resolve();
                }
            }, 100);
        });
        hideLoading(stateSelect);
    }
    
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
async function loadCities(state) {
    const bankCode = document.getElementById('bankName').value;
    const citySelect = document.getElementById('district');
    
    showLoading(citySelect);
    
    if (!ifscData) {
        // Wait for IFSC data to load
        await new Promise(resolve => {
            const checkData = setInterval(() => {
                if (ifscData) {
                    clearInterval(checkData);
                    resolve();
                }
            }, 100);
        });
    }
    
    if (ifscData[bankCode] && ifscData[bankCode].cities[state]) {
        const cities = ifscData[bankCode].cities[state];
        citySelect.innerHTML = `
            <option value="">Select City/District</option>
            ${cities.map(city => `<option value="${city}">${city}</option>`).join('')}
        `;
        citySelect.disabled = false;
    }
    hideLoading(citySelect);
    resetSelect('branch', true);
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', fetchData);
