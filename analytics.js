const params = new URLSearchParams(window.location.search);
let city = params.get('city') || "New York"; 
document.getElementById('city-display').innerText = city;

// Global State
let currentLat = 0;
let currentLon = 0;
let myChart = null;

// Dates Setup
const date = new Date();
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// 1. Calculate Month Names
const currMonthIdx = date.getMonth();
const prevMonthIdx = (currMonthIdx - 1 + 12) % 12;
const nextMonthIdx = (currMonthIdx + 1) % 12;

// Set Tab Text
document.getElementById('tab-prev').innerText = months[prevMonthIdx];
document.getElementById('tab-curr').innerText = months[currMonthIdx];
document.getElementById('tab-next').innerText = months[nextMonthIdx];

// 2. Initialize
window.onload = async () => {
    const coords = await getCoords(city);
    if(coords) {
        currentLat = coords.lat;
        currentLon = coords.lon;
        
        // Set default dates for Current Month
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0); // Last day of this month
        
        // Format date for input field (YYYY-MM-DD)
        document.getElementById('date-from').value = firstDay.toISOString().split('T')[0];
        document.getElementById('date-to').value = lastDay.toISOString().split('T')[0];
        
        // Load Current Month by default
        setMode('curr');
    }
};

// 3. Tab Switching Logic
function setMode(mode) {
    // UI Updates
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${mode}`).classList.add('active');

    // Hide Date Inputs if not "Current"
    const dateInputDiv = document.getElementById('date-inputs');
    if (mode === 'curr') {
        dateInputDiv.style.display = 'block';
        dateInputDiv.style.opacity = '1';
        document.getElementById('avg-label').innerText = "Average (Selected Range)";
    } else {
        // Hide inputs smoothly
        dateInputDiv.style.display = 'none'; 
        document.getElementById('avg-label').innerText = mode === 'next' ? "Predicted Average (Total Month)" : "Total Average (Past Month)";
    }

    // Fetch Data based on Mode
    if (mode === 'prev') fetchPreviousMonth();
    else if (mode === 'curr') fetchCurrentMonth();
    else if (mode === 'next') fetchNextMonth();
}

// --- DATA FETCHING FUNCTIONS ---

async function fetchPreviousMonth() {
    // Calculate dates for the COMPLETE previous month
    const year = date.getMonth() === 0 ? date.getFullYear() - 1 : date.getFullYear(); // Handle Jan -> Dec wrap
    const month = (date.getMonth() - 1 + 12) % 12;
    
    // First and Last day of prev month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const start = firstDay.toISOString().split('T')[0];
    const end = lastDay.toISOString().split('T')[0];

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${currentLat}&longitude=${currentLon}&start_date=${start}&end_date=${end}&daily=temperature_2m_mean&timezone=auto`;
    processAndRender(url, 'mean');
}

async function fetchCurrentMonth() {
    // Use the dates from the INPUT fields
    const start = document.getElementById('date-from').value;
    const end = document.getElementById('date-to').value;

    // Use Forecast API (it usually covers recent past + future days)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${currentLat}&longitude=${currentLon}&daily=temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${start}&end_date=${end}`;
    processAndRender(url, 'minmax');
}

async function fetchNextMonth() {
    // Note: Free Forecast API only gives 16 days. We will fetch those 16 days to show a prediction.
    const year = date.getMonth() === 11 ? date.getFullYear() + 1 : date.getFullYear();
    const month = (date.getMonth() + 1) % 12;
    
    // Start of next month
    const firstDay = new Date(year, month, 1);
    // Add 14 days (API Limit)
    const endDay = new Date(year, month, 15); 

    const start = firstDay.toISOString().split('T')[0];
    const end = endDay.toISOString().split('T')[0];

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${currentLat}&longitude=${currentLon}&daily=temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${start}&end_date=${end}`;
    processAndRender(url, 'minmax');
}

// --- HELPER FUNCTIONS ---

async function processAndRender(url, type) {
    try {
        const res = await fetch(url);
        const data = await res.json();
        
        if(!data.daily) {
            alert("No data available for this range");
            return;
        }

        let temps = [];
        let labels = data.daily.time;

        if (type === 'mean') {
            temps = data.daily.temperature_2m_mean;
        } else {
            // Calculate Mean from Min/Max
            temps = data.daily.temperature_2m_max.map((max, i) => (max + data.daily.temperature_2m_min[i]) / 2);
        }

        // Calculate Average
        const validTemps = temps.filter(t => t !== null);
        const sum = validTemps.reduce((a, b) => a + b, 0);
        const avg = sum / validTemps.length || 0;

        // Update UI
        document.getElementById('avg-temp').innerText = Math.round(avg) + "°C";
        
        // Update Chart
        renderChart(labels, temps);

    } catch (e) {
        console.error(e);
    }
}

async function getCoords(cityName) {
    try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${cityName}&count=1&language=en&format=json`;
        const res = await fetch(url);
        const data = await res.json();
        if(data.results) return { lat: data.results[0].latitude, lon: data.results[0].longitude };
        return null;
    } catch(e) { return null; }
}

function renderChart(labels, data) {
    const ctx = document.getElementById('climateChart').getContext('2d');
    
    // Create unique gradients for visual variety
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(231, 76, 60, 0.8)');
    gradient.addColorStop(1, 'rgba(243, 156, 18, 0.2)');

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(d => d.slice(8)), // Just the day number
            datasets: [{
                data: data,
                borderColor: '#e74c3c',
                borderWidth: 2,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4, // Smooth waves
                pointRadius: 3,
                pointBackgroundColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { display: false }
            }
        }
    });
}

// Date Input Listeners
document.getElementById('date-from').addEventListener('change', () => setMode('curr'));
document.getElementById('date-to').addEventListener('change', () => setMode('curr'));