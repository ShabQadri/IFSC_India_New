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
            // Get unique states
            const states = [...new Set(Object.keys(ifscData[bankCode].states))];
            
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
        
        if (ifscData && ifscData[bankCode] && ifscData[bankCode].states[state]) {
            const cities = ifscData[bankCode].states[state];
            
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
        
        if (ifscData && ifscData[bankCode].cities && ifscData[bankCode].cities[state] && ifscData[bankCode].cities[state][city]) {
            const branches = ifscData[bankCode].cities[state][city];
            
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
