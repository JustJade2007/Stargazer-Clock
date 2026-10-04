/**
 * Stargazer Weather & Location Engine
 * Manages geolocation permission, built-in offline city coordinates,
 * geocoding lookup, and live weather conditions via Open-Meteo API.
 */

(function (window) {
  'use strict';

  // Major global cities database for offline & zero-latency instant selection
  const PRESET_CITIES = [
    { name: 'New York', country: 'United States', lat: 40.7128, lon: -74.0060, timezone: 'America/New_York' },
    { name: 'Los Angeles', country: 'United States', lat: 34.0522, lon: -118.2437, timezone: 'America/Los_Angeles' },
    { name: 'Chicago', country: 'United States', lat: 41.8781, lon: -87.6298, timezone: 'America/Chicago' },
    { name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278, timezone: 'Europe/London' },
    { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, timezone: 'Europe/Paris' },
    { name: 'Berlin', country: 'Germany', lat: 52.5200, lon: 13.4050, timezone: 'Europe/Berlin' },
    { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503, timezone: 'Asia/Tokyo' },
    { name: 'Beijing', country: 'China', lat: 39.9042, lon: 116.4074, timezone: 'Asia/Shanghai' },
    { name: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093, timezone: 'Australia/Sydney' },
    { name: 'Toronto', country: 'Canada', lat: 43.6532, lon: -79.3832, timezone: 'America/Toronto' },
    { name: 'Mumbai', country: 'India', lat: 19.0760, lon: 72.8777, timezone: 'Asia/Kolkata' },
    { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lon: -46.6333, timezone: 'America/Sao_Paulo' },
    { name: 'Cairo', country: 'Egypt', lat: 30.0444, lon: 31.2357, timezone: 'Africa/Cairo' },
    { name: 'Reykjavik', country: 'Iceland', lat: 64.1466, lon: -21.9426, timezone: 'Atlantic/Reykjavik' },
    { name: 'Honolulu', country: 'United States', lat: 21.3069, lon: -157.8583, timezone: 'Pacific/Honolulu' }
  ];

  // WMO Weather interpretation codes
  const WMO_CODE_MAP = {
    0:  { category: 'clear',  name: 'Clear Sky',            emoji: '☀️', nightEmoji: '🌙' },
    1:  { category: 'clear',  name: 'Mainly Clear',         emoji: '🌤️', nightEmoji: '🌤️' },
    2:  { category: 'clouds', name: 'Partly Cloudy',        emoji: '⛅', nightEmoji: '☁️' },
    3:  { category: 'clouds', name: 'Overcast',             emoji: '☁️', nightEmoji: '☁️' },
    45: { category: 'fog',    name: 'Fog',                  emoji: '🌫️', nightEmoji: '🌫️' },
    48: { category: 'fog',    name: 'Depositing Rime Fog',  emoji: '🌫️', nightEmoji: '🌫️' },
    51: { category: 'rain',   name: 'Light Drizzle',        emoji: '🌦️', nightEmoji: '🌧️' },
    53: { category: 'rain',   name: 'Moderate Drizzle',     emoji: '🌦️', nightEmoji: '🌧️' },
    55: { category: 'rain',   name: 'Dense Drizzle',        emoji: '🌧️', nightEmoji: '🌧️' },
    56: { category: 'rain',   name: 'Freezing Drizzle',     emoji: '🌧️', nightEmoji: '🌧️' },
    57: { category: 'rain',   name: 'Dense Freezing Drizzle', emoji: '🌧️', nightEmoji: '🌧️' },
    61: { category: 'rain',   name: 'Slight Rain',          emoji: '🌦️', nightEmoji: '🌧️' },
    63: { category: 'rain',   name: 'Moderate Rain',        emoji: '🌧️', nightEmoji: '🌧️' },
    65: { category: 'rain',   name: 'Heavy Rain',           emoji: '🌧️', nightEmoji: '🌧️' },
    66: { category: 'rain',   name: 'Freezing Rain',        emoji: '🌧️', nightEmoji: '🌧️' },
    67: { category: 'rain',   name: 'Heavy Freezing Rain',  emoji: '🌧️', nightEmoji: '🌧️' },
    71: { category: 'snow',   name: 'Slight Snowfall',      emoji: '🌨️', nightEmoji: '🌨️' },
    73: { category: 'snow',   name: 'Moderate Snowfall',    emoji: '🌨️', nightEmoji: '🌨️' },
    75: { category: 'snow',   name: 'Heavy Snowfall',       emoji: '❄️', nightEmoji: '❄️' },
    77: { category: 'snow',   name: 'Snow Grains',          emoji: '❄️', nightEmoji: '❄️' },
    80: { category: 'rain',   name: 'Slight Rain Showers',  emoji: '🌦️', nightEmoji: '🌧️' },
    81: { category: 'rain',   name: 'Moderate Rain Showers', emoji: '🌧️', nightEmoji: '🌧️' },
    82: { category: 'rain',   name: 'Violent Rain Showers', emoji: '⛈️', nightEmoji: '⛈️' },
    85: { category: 'snow',   name: 'Slight Snow Showers',  emoji: '🌨️', nightEmoji: '🌨️' },
    86: { category: 'snow',   name: 'Heavy Snow Showers',   emoji: '❄️', nightEmoji: '❄️' },
    95: { category: 'thunder', name: 'Thunderstorm',        emoji: '⛈️', nightEmoji: '⛈️' },
    96: { category: 'thunder', name: 'Thunderstorm with Hail', emoji: '⛈️', nightEmoji: '⛈️' },
    99: { category: 'thunder', name: 'Severe Thunderstorm', emoji: '⛈️', nightEmoji: '⛈️' }
  };

  const CACHE_KEY = 'stargazer_weather_cache';
  const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

  // State
  let weatherState = {
    locationEnabled: false,
    latitude: null,
    longitude: null,
    cityName: 'Location Not Set',
    country: '',
    source: 'none', // 'geolocation', 'preset', 'manual'
    temperatureC: 20, // default mild
    temperatureF: 68,
    weatherCode: 0,
    category: 'clear', // 'clear', 'clouds', 'rain', 'snow', 'thunder', 'fog'
    conditionText: 'Clear',
    emoji: '☀️',
    cloudCover: 0,
    precipitation: 0,
    windSpeed: 0,
    lastUpdated: 0,
    isLoading: false,
    error: null
  };

  function parseWmoCode(code, isDaytime = true) {
    const entry = WMO_CODE_MAP[code] || WMO_CODE_MAP[0];
    return {
      category: entry.category,
      conditionText: entry.name,
      emoji: isDaytime ? entry.emoji : entry.nightEmoji
    };
  }

  function getAutoTempUnit() {
    const lang = (navigator.language || '').toUpperCase();
    return (lang.indexOf('US') !== -1 || lang.indexOf('PH') !== -1) ? 'F' : 'C';
  }

  function celsiusToFahrenheit(c) {
    return (c * 9 / 5) + 32;
  }

  function fahrenheitToCelsius(f) {
    return (f - 32) * 5 / 9;
  }

  /**
   * Loads saved cache from localStorage
   */
  function loadCachedWeather(lat, lon) {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.timestamp || (Date.now() - parsed.timestamp > CACHE_TTL_MS)) {
        return null;
      }
      // Check if coordinates roughly match
      if (Math.abs(parsed.lat - lat) < 0.1 && Math.abs(parsed.lon - lon) < 0.1) {
        return parsed.data;
      }
    } catch (e) {
      console.warn('StargazerWeather: Failed to read cache', e);
    }
    return null;
  }

  /**
   * Saves weather response to localStorage
   */
  function saveCachedWeather(lat, lon, data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        lat,
        lon,
        timestamp: Date.now(),
        data
      }));
    } catch (e) {
      // Quota exceeded or private browsing
    }
  }

  /**
   * Fetches weather data from Open-Meteo
   */
  async function fetchLiveWeather(lat, lon, cityName = null) {
    if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) return;

    weatherState.isLoading = true;
    notifyUpdate();

    // Check cache first for rapid rendering
    const cached = loadCachedWeather(lat, lon);
    if (cached) {
      applyWeatherData(cached, cityName);
      weatherState.isLoading = false;
      notifyUpdate();
      return;
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m&timezone=auto`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Open-Meteo returned status ${response.status}`);
      }

      const data = await response.json();
      if (data && data.current) {
        saveCachedWeather(lat, lon, data);
        applyWeatherData(data, cityName);
        weatherState.error = null;
      }
    } catch (err) {
      console.warn('StargazerWeather: Error fetching weather data', err);
      weatherState.error = err.message || 'Weather lookup failed';
      // Graceful fallback: maintain mild clear sky
    } finally {
      weatherState.isLoading = false;
      notifyUpdate();
    }
  }

  function applyWeatherData(data, cityName) {
    if (!data || !data.current) return;
    const cur = data.current;
    const tempC = cur.temperature_2m;
    const tempF = celsiusToFahrenheit(tempC);
    const isDay = cur.is_day === 1;
    const wmo = parseWmoCode(cur.weather_code, isDay);

    weatherState.temperatureC = Math.round(tempC * 10) / 10;
    weatherState.temperatureF = Math.round(tempF * 10) / 10;
    weatherState.weatherCode = cur.weather_code;
    weatherState.category = wmo.category;
    weatherState.conditionText = wmo.conditionText;
    weatherState.emoji = wmo.emoji;
    weatherState.cloudCover = cur.cloud_cover || 0;
    weatherState.precipitation = cur.precipitation || 0;
    weatherState.windSpeed = cur.wind_speed_10m || 0;
    weatherState.lastUpdated = Date.now();

    if (cityName) {
      weatherState.cityName = cityName;
    }
  }

  /**
   * Search city name with Open-Meteo Geocoding
   */
  async function searchCities(query) {
    if (!query || query.trim().length < 2) {
      return PRESET_CITIES;
    }
    const trimmed = query.trim().toLowerCase();
    
    // Quick filter local presets
    const localMatches = PRESET_CITIES.filter(c => 
      c.name.toLowerCase().includes(trimmed) || 
      c.country.toLowerCase().includes(trimmed)
    );

    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=en&format=json`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json && json.results && json.results.length > 0) {
          const apiResults = json.results.map(r => ({
            name: r.name,
            country: r.country || r.admin1 || '',
            lat: r.latitude,
            lon: r.longitude,
            timezone: r.timezone || 'auto'
          }));
          return apiResults;
        }
      }
    } catch (e) {
      // Offline fallback: return matched local presets
    }
    return localMatches.length > 0 ? localMatches : PRESET_CITIES.slice(0, 6);
  }

  /**
   * Requests HTML5 Geolocation with user permission
   */
  function requestCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser environment.'));
        return;
      }

      weatherState.isLoading = true;
      notifyUpdate();

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          weatherState.locationEnabled = true;
          weatherState.latitude = lat;
          weatherState.longitude = lon;
          weatherState.source = 'geolocation';
          weatherState.cityName = `Local (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;

          // Reverse geocode city name if possible via Open-Meteo or big cities
          findClosestPresetCity(lat, lon);

          await fetchLiveWeather(lat, lon);
          saveToStorage();
          resolve(weatherState);
        },
        (error) => {
          weatherState.isLoading = false;
          let msg = 'Location request was declined.';
          if (error.code === 2) msg = 'Location position unavailable.';
          if (error.code === 3) msg = 'Location request timed out.';
          weatherState.error = msg;
          notifyUpdate();
          reject(new Error(msg));
        },
        { timeout: 10000, maximumAge: 600000, enableHighAccuracy: false }
      );
    });
  }

  /**
   * Set location directly from preset or manual coords
   */
  async function setLocation(lat, lon, cityName, country = '', source = 'preset') {
    weatherState.locationEnabled = true;
    weatherState.latitude = Number(lat);
    weatherState.longitude = Number(lon);
    weatherState.cityName = cityName || `${Number(lat).toFixed(2)}°, ${Number(lon).toFixed(2)}°`;
    weatherState.country = country;
    weatherState.source = source;
    weatherState.error = null;

    saveToStorage();
    await fetchLiveWeather(weatherState.latitude, weatherState.longitude, weatherState.cityName);
    notifyUpdate();
  }

  function disableLocation() {
    weatherState.locationEnabled = false;
    weatherState.latitude = null;
    weatherState.longitude = null;
    weatherState.cityName = 'Location Disabled';
    weatherState.source = 'none';
    saveToStorage();
    notifyUpdate();
  }

  function findClosestPresetCity(lat, lon) {
    let closest = null;
    let minDist = Infinity;
    for (const city of PRESET_CITIES) {
      const d = Math.hypot(city.lat - lat, city.lon - lon);
      if (d < minDist) {
        minDist = d;
        closest = city;
      }
    }
    // If within ~50km / 0.5 degrees
    if (closest && minDist < 0.6) {
      weatherState.cityName = `${closest.name}, ${closest.country}`;
    }
  }

  function saveToStorage() {
    if (window.StargazerStorage) {
      window.StargazerStorage.set('locationSettings', {
        locationEnabled: weatherState.locationEnabled,
        latitude: weatherState.latitude,
        longitude: weatherState.longitude,
        cityName: weatherState.cityName,
        country: weatherState.country,
        source: weatherState.source
      });
    }
  }

  function notifyUpdate() {
    try {
      window.dispatchEvent(new CustomEvent('stargazer:weather-update', {
        detail: { ...weatherState }
      }));
    } catch (e) {
      // CustomEvent support
    }
  }

  /**
   * Initialize Weather Module from saved storage
   */
  function init(savedSettings = {}) {
    const loc = savedSettings.locationSettings || {};
    if (loc.locationEnabled && loc.latitude !== null && loc.longitude !== null) {
      weatherState.locationEnabled = true;
      weatherState.latitude = Number(loc.latitude);
      weatherState.longitude = Number(loc.longitude);
      weatherState.cityName = loc.cityName || 'Local Location';
      weatherState.country = loc.country || '';
      weatherState.source = loc.source || 'preset';

      // Background fetch live conditions
      fetchLiveWeather(weatherState.latitude, weatherState.longitude, weatherState.cityName);
    }
  }

  /**
   * Returns current active weather state taking Debug HUD overrides into account
   */
  function getActiveWeather() {
    let category = weatherState.category;
    let tempC = weatherState.temperatureC;
    let conditionText = weatherState.conditionText;
    let emoji = weatherState.emoji;

    // Check debug overrides
    if (window.StargazerDebug) {
      const wOverride = window.StargazerDebug.getWeatherOverride();
      if (wOverride && wOverride !== 'auto') {
        category = wOverride;
        if (category === 'clear') {
          conditionText = 'Simulated Clear';
          emoji = '☀️';
        } else if (category === 'clouds') {
          conditionText = 'Simulated Clouds';
          emoji = '☁️';
        } else if (category === 'rain') {
          conditionText = 'Simulated Rain';
          emoji = '🌧️';
        } else if (category === 'snow') {
          conditionText = 'Simulated Snow';
          emoji = '❄️';
        } else if (category === 'thunder') {
          conditionText = 'Simulated Thunder';
          emoji = '⛈️';
        } else if (category === 'fog') {
          conditionText = 'Simulated Fog';
          emoji = '🌫️';
        }
      }

      const tOverride = window.StargazerDebug.getTemperatureOverride();
      if (tOverride !== null && tOverride !== undefined) {
        tempC = Number(tOverride);
      }
    }

    const tempF = celsiusToFahrenheit(tempC);

    return {
      ...weatherState,
      category,
      temperatureC: tempC,
      temperatureF: tempF,
      conditionText,
      emoji
    };
  }

  const StargazerWeather = {
    init,
    PRESET_CITIES,
    requestCurrentLocation,
    setLocation,
    disableLocation,
    searchCities,
    fetchLiveWeather,
    getActiveWeather,
    getState: () => ({ ...weatherState }),
    getAutoTempUnit,
    celsiusToFahrenheit,
    fahrenheitToCelsius
  };

  window.StargazerWeather = StargazerWeather;
})(window);
