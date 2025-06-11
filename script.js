let banksData = null;
let banksList = null;
let ifscData = null;

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

        initializeBankSearch();
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading bank data. Please try again later.');
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
    const states = new Set();

    // Get all IFSC codes for the selected bank
    const bankIFSCs = ifscData[bankCode] || [];
    
    // Iterate through the IFSC codes to get states
    bankIFSCs.forEach(ifscCode => {
        // Make API call to get branch details
        fetch(`https://ifsc.razorpay.com/${ifscCode}`)
            .then(response => response.json())
            .then(data => {
                if (data && data.STATE) {
                    states.add(data.STATE);
                    updateStateDropdown(states, stateSelect);
                }
            })
            .catch(error => console.error('Error fetching branch details:', error));
    });

    // Enable state dropdown
    stateSelect.disabled = false;
}

// Update state dropdown with collected states
function updateStateDropdown(states, stateSelect) {
    // Sort states alphabetically
    const sortedStates = [...states].sort();

    // Update state dropdown
    stateSelect.innerHTML = `
        <option value="">Select State</option>
        ${sortedStates.map(state => `<option value="${state}">${state}</option>`).join('')}
    `;
}

// Load districts for selected state
function loadDistricts(state) {
    const bankCode = document.getElementById('bankName').value;
    const districtSelect = document.getElementById('district');
    const districts = new Set();

    // Get all IFSC codes for the selected bank
    const bankIFSCs = ifscData[bankCode] || [];
    
    // Iterate through the IFSC codes to get districts
    bankIFSCs.forEach(ifscCode => {
        fetch(`https://ifsc.razorpay.com/${ifscCode}`)
            .then(response => response.json())
            .then(data => {
                if (data && data.STATE === state && data.DISTRICT) {
                    districts.add(data.DISTRICT);
                    updateDistrictDropdown(districts, districtSelect);
                }
            })
            .catch(error => console.error('Error fetching branch details:', error));
    });

    // Enable district dropdown
    districtSelect.disabled = false;
}

// Update district dropdown with collected districts
function updateDistrictDropdown(districts, districtSelect) {
    // Sort districts alphabetically
    const sortedDistricts = [...districts].sort();

    // Update district dropdown
    districtSelect.innerHTML = `
        <option value="">Select District</option>
        ${sortedDistricts.map(district => `<option value="${district}">${district}</option>`).join('')}
    `;
}

// Load branches for selected district
function loadBranches(district) {
    const bankCode = document.getElementById('bankName').value;
    const state = document.getElementById('state').value;
    const branchSelect = document.getElementById('branch');
    const branches = new Map();

    // Get all IFSC codes for the selected bank
    const bankIFSCs = ifscData[bankCode] || [];
    
    // Iterate through the IFSC codes to get branches
    bankIFSCs.forEach(ifscCode => {
        fetch(`https://ifsc.razorpay.com/${ifscCode}`)
            .then(response => response.json())
            .then(data => {
                if (data && data.STATE === state && data.DISTRICT === district && data.BRANCH) {
                    branches.set(data.BRANCH, ifscCode);
                    updateBranchDropdown(branches, branchSelect);
                }
            })
            .catch(error => console.error('Error fetching branch details:', error));
    });

    // Enable branch dropdown
    branchSelect.disabled = false;
}

// Update branch dropdown with collected branches
function updateBranchDropdown(branches, branchSelect) {
    // Sort branches alphabetically
    const sortedBranches = [...branches.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    // Update branch dropdown
    branchSelect.innerHTML = `
        <option value="">Select Branch</option>
        ${sortedBranches.map(([branch, code]) => `<option value="${code}">${branch}</option>`).join('')}
    `;
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

        if (branchSelect.value) {
            fetch(`https://ifsc.razorpay.com/${branchSelect.value}`)
                .then(response => response.json())
                .then(data => {
                    resultContainer.innerHTML = `
                        <h3>IFSC Code: ${data.IFSC}</h3>
                        <p><strong>Bank:</strong> ${banksList[data.BANK]}</p>
                        <p><strong>Branch:</strong> ${data.BRANCH}</p>
                        <p><strong>Address:</strong> ${data.ADDRESS}</p>
                        <p><strong>District:</strong> ${data.DISTRICT}</p>
                        <p><strong>State:</strong> ${data.STATE}</p>
                    `;
                    resultContainer.style.display = 'block';
                })
                .catch(error => {
                    console.error('Error fetching IFSC details:', error);
                    alert('Error fetching branch details. Please try again.');
                });
        }
    });
});
