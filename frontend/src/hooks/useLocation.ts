/**
 * useLocation — Geolocation hook with weather and reverse geocoding.
 *
 * Uses:
 *  - navigator.geolocation for coordinates
 *  - Open-Meteo API for weather (free, no key)
 *  - Nominatim API for reverse geocoding (free, no key)
 *  - 30-minute localStorage cache
 */

import { useState, useEffect, useCallback } from 'react';

interface WeatherData {
  temp: number;
  condition: string;
  emoji: string;
  humidity: number;
}

interface LocationData {
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  weather: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => void;
}

interface CachedLocation {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  weather: WeatherData;
  cachedAt: number;
}

const CACHE_KEY = 'mindtrack_location';
const PREF_KEY = 'mindtrack_location_pref';
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

function weatherCodeToEmoji(code: number): { emoji: string; condition: string } {
  if (code === 0) return { emoji: '☀️', condition: 'Clear sky' };
  if (code >= 1 && code <= 3) return { emoji: '🌤', condition: 'Partly cloudy' };
  if (code === 45 || code === 48) return { emoji: '🌫', condition: 'Foggy' };
  if (code >= 51 && code <= 67) return { emoji: '🌧', condition: 'Rainy' };
  if (code >= 71 && code <= 77) return { emoji: '❄️', condition: 'Snowy' };
  if (code >= 80 && code <= 82) return { emoji: '🌦', condition: 'Showers' };
  if (code >= 95 && code <= 99) return { emoji: '⛈', condition: 'Thunderstorm' };
  return { emoji: '🌤', condition: 'Partly cloudy' };
}

export function useLocation(): LocationData {
  const [city, setCity] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyCache = useCallback((cached: CachedLocation) => {
    setCity(cached.city);
    setCountry(cached.country);
    setLatitude(cached.latitude);
    setLongitude(cached.longitude);
    setTimezone(cached.timezone);
    setWeather(cached.weather);
  }, []);

  const fetchLocationData = useCallback(async (lat: number, lon: number) => {
    try {
      // Fetch weather from Open-Meteo
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m`
      );
      let weatherData: WeatherData | null = null;
      if (weatherRes.ok) {
        const wJson = await weatherRes.json();
        const current = wJson.current_weather;
        const { emoji, condition } = weatherCodeToEmoji(current?.weathercode ?? 1);
        const humidity = wJson.hourly?.relativehumidity_2m?.[0] ?? 50;
        weatherData = {
          temp: Math.round(current?.temperature ?? 0),
          condition,
          emoji,
          humidity,
        };
      }

      // Reverse geocode with Nominatim
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { 'User-Agent': 'MindTrackAI/1.0' } }
      );
      let cityName: string | null = null;
      let countryName: string | null = null;
      if (geoRes.ok) {
        const gJson = await geoRes.json();
        cityName =
          gJson.address?.city ||
          gJson.address?.town ||
          gJson.address?.village ||
          gJson.address?.suburb ||
          null;
        countryName = gJson.address?.country || null;
      }

      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

      setCity(cityName);
      setCountry(countryName);
      setLatitude(lat);
      setLongitude(lon);
      setTimezone(tz);
      setWeather(weatherData);

      // Cache
      if (cityName && weatherData) {
        const cached: CachedLocation = {
          city: cityName,
          country: countryName || '',
          latitude: lat,
          longitude: lon,
          timezone: tz,
          weather: weatherData,
          cachedAt: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
      }
    } catch {
      // Silently fail
      setError('Unable to fetch location data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setIsLoading(true);
    setError(null);
    localStorage.setItem(PREF_KEY, 'allowed');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchLocationData(position.coords.latitude, position.coords.longitude);
      },
      () => {
        setIsLoading(false);
        setError('Location permission denied');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  }, [fetchLocationData]);

  // On mount: check cache or auto-request if preference is set
  useEffect(() => {
    // Check cache first
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: CachedLocation = JSON.parse(raw);
        if (Date.now() - cached.cachedAt < CACHE_DURATION_MS) {
          applyCache(cached);
          return;
        }
      }
    } catch {
      // ignore invalid cache
    }

    // If user previously allowed, auto-request
    const pref = localStorage.getItem(PREF_KEY);
    if (pref === 'allowed') {
      requestPermission();
    }
  }, [applyCache, requestPermission]);

  return {
    city,
    country,
    latitude,
    longitude,
    timezone,
    weather,
    isLoading,
    error,
    requestPermission,
  };
}

export function getLocationPref(): string | null {
  return localStorage.getItem(PREF_KEY);
}

export function setLocationPref(pref: string): void {
  localStorage.setItem(PREF_KEY, pref);
}
