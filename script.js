let banksData = null;
let banksList = null;
let ifscData = null;
let branchesData = {};

// Fetch all required data when the page loads
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

        // Pre-process IFSC data
        await processIFSCData();
        
        initializeBankSearch();
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading bank data. Please try again later.');
    }
}

// Process IFSC data to create a searchable structure
async function processIFSCData() {
    branchesData = {};
    for (const [bankCode, branches] of Object.entries(ifscData)) {
        if (!branchesData[bankCode]) {
            branchesData[bankCode] = {
                states: new Set(),
                districts: {},
                branches: {}
            };
        }

        for (const ifscCode of branches) {
            const bank = banksData[bankCode];
            if (bank && bank.ifsc) {
                const stateName = "MAHARASHTRA"; // Default state for testing
                const districtName = "MUMBAI"; // Default district for testing
                const branchName = `Branch ${ifscCode}`; // Default branch name

                branchesData[bankCode].states.add(stateName);

                if (!branchesData[bankCode].districts[stateName]) {
                    branchesData[bankCode].districts[stateName] = new Set();
                }
                branchesData[bankCode].districts[stateName].add(districtName);

                if (!branchesData[bankCode].branches[districtName]) {
                    branchesData[bankCode].branches[districtName] = new Map();
                }
                branchesData[bankCode].branches[districtName].set(branchName, ifscCode);
            }
        }
    }
}

// Initialize the bank search functionality
function initializeBankSearch() {
    const bankSearch = document.getElementById('bankSearch');
    const searchResults = document.getElementById('bankSearchResults');
    const bankSelect = document.getElementById('bankName');

    // Enable the search input
    bankSearch.disabled = false;

    // Add event listener for search input
    bankSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (searchTerm.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

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

    // Add event listener for search result selection
    searchResults.addEventListener('click', (e) => {
        const selectedBank = e.target.closest('div');
        if (selectedBank) {
            const bankCode = selectedBank.dataset.code;
            const bankName = selectedBank.textContent;
            
            bankSearch.value = bankName;
            searchResults.style.display = 'none';
            
            // Update the hidden select and trigger state loading
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
    
    if (branchesData[bankCode] && branchesData[bankCode].states) {
        const states = [...branchesData[bankCode].states].sort();
        
        stateSelect.innerHTML = `
            <option value="">Select State</option>
            ${states.map(state => `<option value="${state}">${state}</option>`).join('')}
        `;
        stateSelect.disabled = false;
    }

    // Reset dependent dropdowns
    resetSelect('district', true);
    resetSelect('branch', true);
}

// Load districts for selected state
function loadDistricts(state) {
    const bankCode = document.getElementById('bankName').value;
    const districtSelect = document.getElementById('district');

    if (branchesData[bankCode] && branchesData[bankCode].districts[state]) {
        const districts = [...branchesData[bankCode].districts[state]].sort();

        districtSelect.innerHTML = `
            <option value="">Select District</option>
            ${districts.map(district => `<option value="${district}">${district}</option>`).join('')}
        `;
        districtSelect.disabled = false;
    }

    // Reset branch dropdown
    resetSelect('branch', true);
}

// Load branches for selected district
function loadBranches(district) {
    const bankCode = document.getElementById('bankName').value;
    const branchSelect = document.getElementById('branch');

    if (branchesData[bankCode] && branchesData[bankCode].branches[district]) {
        const branches = [...branchesData[bankCode].branches[district]].sort((a, b) => a[0].localeCompare(b[0]));

        branchSelect.innerHTML = `
            <option value="">Select Branch</option>
            ${branches.map(([branch, code]) => `<option value="${code}">${branch}</option>`).join('')}
        `;
        branchSelect.disabled = false;
    }
}

// Reset select element
function resetSelect(id, disable = false) {
    const select = document.getElementById(id);
    select.innerHTML = '<option value="">Select ' + id.charAt(0).toUpperCase() + id.slice(1) + '</option>';
    select.disabled = disable;
}

// Add event listeners
document.addEventListener('DOMContentLoaded', () => {
    fetchData();

    // State selection change
    document.getElementById('state').addEventListener('change', (e) => {
        if (e.target.value) {
            loadDistricts(e.target.value);
        }
    });

    // District selection change
    document.getElementById('district').addEventListener('change', (e) => {
        if (e.target.value) {
            loadBranches(e.target.value);
        }
    });

    // Find IFSC button click
    document.getElementById('findIfsc').addEventListener('click', () => {
        const branchSelect = document.getElementById('branch');
        const resultContainer = document.getElementById('result');
        const bankCode = document.getElementById('bankName').value;
        const state = document.getElementById('state').value;
        const district = document.getElementById('district').value;

        if (branchSelect.value) {
            const ifscCode = branchSelect.value;
            resultContainer.innerHTML = `
                <h3>IFSC Code: ${ifscCode}</h3>
                <p><strong>Bank:</strong> ${banksList[bankCode]}</p>
                <p><strong>Branch:</strong> ${branchSelect.options[branchSelect.selectedIndex].text}</p>
                <p><strong>District:</strong> ${district}</p>
                <p><strong>State:</strong> ${state}</p>
            `;
            resultContainer.style.display = 'block';
        }
    });
});
