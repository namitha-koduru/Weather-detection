const searchBox = document.querySelector(".search input");
const searchBtn = document.querySelector("#search-btn");
const locBtn = document.querySelector("#loc-btn");
const weatherIcon = document.querySelector("#icon");

// 1. Get Coordinates first (Geocoding)
async function checkWeather(city) {
    try {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=en&format=json`;
        const geoResponse = await fetch(geoUrl);
        const geoData = await geoResponse.json();

        if (!geoData.results) {
            alert("City not found!");
            return;
        }

        const lat = geoData.results[0].latitude;
        const lon = geoData.results[0].longitude;
        const name = geoData.results[0].name;

        fetchWeatherByCoords(lat, lon, name);
    } catch (error) {
        console.error("Error:", error);
    }
}

// 2. Get Weather Data
async function fetchWeatherByCoords(lat, lon, cityName) {
    // Note: Added windspeed_unit=ms to get simpler numbers
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    
    try {
        const response = await fetch(weatherUrl);
        const data = await response.json();
        const currentTemp = data.current_weather.temperature;

        // Update Text
        document.querySelector("#city-name").innerText = cityName || "My Location";
        document.querySelector("#temp").innerText = Math.round(currentTemp) + "°C";
        document.querySelector("#humidity").innerText = data.current_weather.windspeed + " km/h";

        // Update Icon
        updateIcon(data.current_weather.weathercode);

        // Update Thermometer visual
        updateThermometer(currentTemp);

    } catch (error) {
        console.error(error);
    }
}

// 3. Thermometer Logic
function updateThermometer(temp) {
    // We define the range of our thermometer:
    // Bottom (-10°C) is 0% height
    // Top (50°C) is 100% height
    const minTemp = -10;
    const maxTemp = 50;

    // Math formula to convert temp to percentage
    let percentage = ((temp - minTemp) / (maxTemp - minTemp)) * 100;

    // Clamp the value between 0% and 100% so it doesn't overflow
    percentage = Math.max(0, Math.min(100, percentage));

    document.getElementById("mercury").style.height = percentage + "%";
}

// 4. Icon Logic
function updateIcon(code) {
    if (code === 0) weatherIcon.src = "https://cdn-icons-png.flaticon.com/512/869/869869.png";
    else if (code <= 3) weatherIcon.src = "https://cdn-icons-png.flaticon.com/512/1146/1146869.png";
    else if (code <= 67) weatherIcon.src = "https://cdn-icons-png.flaticon.com/512/1163/1163657.png";
    else if (code <= 77) weatherIcon.src = "https://cdn-icons-png.flaticon.com/512/2315/2315309.png";
    else weatherIcon.src = "https://cdn-icons-png.flaticon.com/512/1146/1146860.png";
}

// Event Listeners
locBtn.addEventListener("click", () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude, "My Location");
        });
    }
});

searchBtn.addEventListener("click", () => checkWeather(searchBox.value));
searchBox.addEventListener("keypress", (e) => {
    if (e.key === "Enter") checkWeather(searchBox.value);
});
// ... [Your existing Weather Logic from previous answers] ...

// --- Add this to the BOTTOM of script.js ---

const toggleBtn = document.getElementById('theme-btn');

// 1. Check LocalStorage on Load
if(localStorage.getItem('theme') === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
}

// 2. Toggle Event
toggleBtn.addEventListener('click', () => {
    if (document.documentElement.getAttribute('data-theme') === 'light') {
        // Switch to Dark
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        // Switch to Light
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
});