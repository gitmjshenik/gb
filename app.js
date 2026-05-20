const state = {
  mode: "login",
  user: null,
  place: null,
  weather: null,
};

const weatherCodes = {
  0: "Ясно",
  1: "Преимущественно ясно",
  2: "Переменная облачность",
  3: "Пасмурно",
  45: "Туман",
  48: "Иней и туман",
  51: "Легкая морось",
  53: "Морось",
  55: "Сильная морось",
  61: "Небольшой дождь",
  63: "Дождь",
  65: "Сильный дождь",
  71: "Небольшой снег",
  73: "Снег",
  75: "Сильный снег",
  80: "Ливень",
  81: "Сильный ливень",
  82: "Очень сильный ливень",
  95: "Гроза",
  96: "Гроза с градом",
  99: "Сильная гроза с градом",
};

const $ = (selector) => document.querySelector(selector);
const authView = $("#authView");
const dashboard = $("#dashboard");
const authForm = $("#authForm");
const authSubmit = $("#authSubmit");
const currentWeather = $("#currentWeather");
const hourlyList = $("#hourlyList");
const dailyGrid = $("#dailyGrid");
const favoritesList = $("#favoritesList");
const alertList = $("#alertList");
const commentList = $("#commentList");

function storageKey(name) {
  return `weatherguru:${name}`;
}

function getJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(key))) ?? fallback;
  } catch {
    return fallback;
  }
}

function setJson(key, value) {
  localStorage.setItem(storageKey(key), JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function getUsers() {
  return getJson("users", {});
}

function getFavorites() {
  return getJson(`favorites:${state.user}`, []);
}

function setFavorites(items) {
  setJson(`favorites:${state.user}`, items);
}

function getComments() {
  return getJson("comments", []);
}

function setComments(items) {
  setJson("comments", items);
}

function formatTime(value) {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatDay(value) {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "short", day: "numeric", month: "short" }).format(new Date(value));
}

function describe(code) {
  return weatherCodes[code] || "Погодные данные";
}

function showMessage(text) {
  currentWeather.innerHTML = `<div class="status-line">${text}</div>`;
}

function showApp() {
  const savedUser = localStorage.getItem(storageKey("session"));
  if (savedUser) {
    state.user = savedUser;
    authView.classList.add("hidden");
    dashboard.classList.remove("hidden");
    $("#helloTitle").textContent = `Привет, ${savedUser}`;
    loadDefaultWeather();
  } else {
    authView.classList.remove("hidden");
    dashboard.classList.add("hidden");
  }
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.mode === mode);
  });
  authSubmit.textContent = mode === "login" ? "Войти" : "Зарегистрироваться";
}

async function geocodeCity(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ru&format=json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Не удалось найти город");
  const data = await response.json();
  if (!data.results?.length) throw new Error("Город не найден");
  const item = data.results[0];
  return {
    name: [item.name, item.admin1, item.country].filter(Boolean).join(", "),
    latitude: item.latitude,
    longitude: item.longitude,
  };
}

async function reverseGeocode(latitude, longitude) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=ru`;
  const response = await fetch(url);
  if (!response.ok) return "Текущее местоположение";
  const data = await response.json();
  return [data.city || data.locality, data.countryName].filter(Boolean).join(", ") || "Текущее местоположение";
}

async function fetchWeather(place) {
  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,pressure_msl",
    hourly: "temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
    timezone: "auto",
    forecast_days: "7",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error("Сервис погоды временно недоступен");
  return response.json();
}

function buildDemoWeather() {
  const now = new Date();
  const hourlyTimes = Array.from({ length: 24 }, (_, index) => {
    const time = new Date(now);
    time.setMinutes(0, 0, 0);
    time.setHours(time.getHours() + index);
    return time.toISOString();
  });
  const dailyTimes = Array.from({ length: 7 }, (_, index) => {
    const time = new Date(now);
    time.setDate(time.getDate() + index);
    return time.toISOString().slice(0, 10);
  });

  return {
    current_units: {
      temperature_2m: "°C",
      apparent_temperature: "°C",
      relative_humidity_2m: "%",
      wind_speed_10m: "м/с",
      pressure_msl: "гПа",
    },
    current: {
      time: now.toISOString(),
      temperature_2m: 18,
      apparent_temperature: 17,
      relative_humidity_2m: 63,
      precipitation: 0,
      weather_code: 2,
      wind_speed_10m: 4,
      wind_gusts_10m: 9,
      pressure_msl: 1014,
    },
    hourly: {
      time: hourlyTimes,
      temperature_2m: hourlyTimes.map((_, index) => 17 + Math.round(Math.sin(index / 3) * 4)),
      relative_humidity_2m: hourlyTimes.map((_, index) => 60 + (index % 5) * 3),
      precipitation_probability: hourlyTimes.map((_, index) => index > 7 && index < 13 ? 45 : 15),
      wind_speed_10m: hourlyTimes.map((_, index) => 3 + (index % 4)),
      weather_code: hourlyTimes.map((_, index) => index > 7 && index < 13 ? 61 : 2),
    },
    daily: {
      time: dailyTimes,
      weather_code: [2, 61, 3, 1, 0, 63, 2],
      temperature_2m_max: [21, 19, 18, 22, 24, 17, 20],
      temperature_2m_min: [13, 12, 10, 11, 14, 9, 12],
      precipitation_sum: [0, 7, 2, 0, 0, 10, 1],
      wind_speed_10m_max: [6, 8, 5, 4, 5, 9, 6],
    },
  };
}

async function loadWeather(place) {
  try {
    showMessage("Получаю свежий прогноз...");
    state.place = place;
    state.weather = await fetchWeather(place);
    renderWeather();
    renderFavorites();
    renderAlerts();
    renderComments();
  } catch (error) {
    state.place = place;
    state.weather = buildDemoWeather();
    renderWeather();
    renderFavorites();
    renderAlerts();
    renderComments();
    $("#updatedAt").textContent = "Демо-режим: API недоступен";
  }
}

async function loadDefaultWeather() {
  await loadWeather({ name: "Москва, Россия", latitude: 55.7558, longitude: 37.6173 });
}

function renderWeather() {
  const current = state.weather.current;
  const units = state.weather.current_units;
  const label = describe(current.weather_code);
  $("#updatedAt").textContent = `Обновлено: ${formatTime(current.time)}`;
  $("#commentCity").textContent = state.place.name;

  currentWeather.innerHTML = `
    <div class="weather-main">
      <div>
        <p class="eyebrow">${escapeHtml(label)}</p>
        <h2>${escapeHtml(state.place.name)}</h2>
      </div>
      <div class="temp">${Math.round(current.temperature_2m)}${units.temperature_2m}</div>
    </div>
    <div class="metric-grid">
      <div class="metric"><span>Ощущается</span><strong>${Math.round(current.apparent_temperature)}${units.apparent_temperature}</strong></div>
      <div class="metric"><span>Влажность</span><strong>${current.relative_humidity_2m}${units.relative_humidity_2m}</strong></div>
      <div class="metric"><span>Ветер</span><strong>${Math.round(current.wind_speed_10m)} ${units.wind_speed_10m}</strong></div>
      <div class="metric"><span>Давление</span><strong>${Math.round(current.pressure_msl)} ${units.pressure_msl}</strong></div>
    </div>
  `;

  renderHourly();
  renderDaily();
}

function renderHourly() {
  const hourly = state.weather.hourly;
  const now = new Date();
  const start = hourly.time.findIndex((time) => new Date(time) >= now);
  const first = Math.max(start, 0);
  hourlyList.innerHTML = hourly.time.slice(first, first + 12).map((time, index) => {
    const realIndex = first + index;
    return `
      <article class="hour-card">
        <span>${formatTime(time)}</span>
        <strong>${Math.round(hourly.temperature_2m[realIndex])}°C</strong>
        <div>${escapeHtml(describe(hourly.weather_code[realIndex]))}</div>
        <small>Дождь: ${hourly.precipitation_probability[realIndex]}%</small>
      </article>
    `;
  }).join("");
}

function renderDaily() {
  const daily = state.weather.daily;
  dailyGrid.innerHTML = daily.time.map((day, index) => `
    <article class="daily-card">
      <span>${formatDay(day)}</span>
      <strong>${Math.round(daily.temperature_2m_max[index])}° / ${Math.round(daily.temperature_2m_min[index])}°</strong>
      <div>${escapeHtml(describe(daily.weather_code[index]))}</div>
      <small>Осадки: ${daily.precipitation_sum[index]} мм</small>
    </article>
  `).join("");
}

function renderFavorites() {
  const favorites = getFavorites();
  if (!favorites.length) {
    favoritesList.innerHTML = `<div class="status-line">Пока нет избранных мест. Найдите город и добавьте его.</div>`;
    return;
  }
  favoritesList.innerHTML = favorites.map((item, index) => `
    <article class="favorite-card">
      <button class="secondary-btn" type="button" data-favorite="${index}">${escapeHtml(item.name)}</button>
      <button class="danger-btn" type="button" data-remove="${index}">Удалить</button>
    </article>
  `).join("");
}

function buildAlerts() {
  if (!state.weather) return [];
  const current = state.weather.current;
  const daily = state.weather.daily;
  const alerts = [];
  if (current.wind_gusts_10m >= 15) alerts.push(`Сильные порывы ветра: ${Math.round(current.wind_gusts_10m)} м/с.`);
  if (current.precipitation > 0) alerts.push(`Сейчас есть осадки: ${current.precipitation} мм.`);
  daily.time.forEach((day, index) => {
    if (daily.precipitation_sum[index] >= 8) {
      alerts.push(`${formatDay(day)} ожидаются заметные осадки: ${daily.precipitation_sum[index]} мм.`);
    }
    if (daily.temperature_2m_min[index] <= -10) {
      alerts.push(`${formatDay(day)} сильный холод: до ${Math.round(daily.temperature_2m_min[index])}°C.`);
    }
    if (daily.temperature_2m_max[index] >= 30) {
      alerts.push(`${formatDay(day)} жара: до ${Math.round(daily.temperature_2m_max[index])}°C.`);
    }
  });
  if (!alerts.length) alerts.push("Опасных изменений в ближайшие дни не найдено.");
  return alerts.slice(0, 5);
}

function renderAlerts() {
  alertList.innerHTML = buildAlerts().map((text) => `
    <article class="alert-card ${text.includes("Опасных") ? "" : "warning"}">
      <strong>${escapeHtml(state.place.name)}</strong>
      <div>${escapeHtml(text)}</div>
    </article>
  `).join("");
}

function renderComments() {
  const comments = getComments().filter((comment) => comment.place === state.place?.name);
  if (!comments.length) {
    commentList.innerHTML = `<div class="status-line">Отзывов для этого места пока нет.</div>`;
    return;
  }
  commentList.innerHTML = comments.map((comment) => `
    <article class="comment-card">
      <strong>${escapeHtml(comment.user)} · ${escapeHtml(comment.date)}</strong>
      <p>${escapeHtml(comment.text)}</p>
    </article>
  `).join("");
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = $("#username").value.trim();
  const password = $("#password").value;
  const users = getUsers();

  if (password.length < 4) {
    alert("Пароль должен быть не короче 4 символов.");
    return;
  }

  if (state.mode === "register") {
    users[username] = { password };
    setJson("users", users);
  } else if (!users[username] || users[username].password !== password) {
    alert("Пользователь не найден. Перейдите на вкладку регистрации.");
    return;
  }

  localStorage.setItem(storageKey("session"), username);
  showApp();
});

$("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(storageKey("session"));
  state.user = null;
  showApp();
});

$("#searchForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const city = $("#cityInput").value.trim();
  if (!city) return;
  try {
    const place = await geocodeCity(city);
    await loadWeather(place);
  } catch (error) {
    showMessage(error.message);
  }
});

$("#locationBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Браузер не поддерживает геолокацию.");
    return;
  }
  navigator.geolocation.getCurrentPosition(async (position) => {
    const { latitude, longitude } = position.coords;
    const name = await reverseGeocode(latitude, longitude);
    await loadWeather({ name, latitude, longitude });
  }, () => alert("Разрешите доступ к геолокации или используйте поиск города."));
});

document.querySelectorAll(".section-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".section-tab").forEach((item) => item.classList.toggle("active", item === tab));
    document.querySelectorAll(".content-section").forEach((section) => section.classList.add("hidden"));
    $(`#${tab.dataset.section}Section`).classList.remove("hidden");
  });
});

$("#addFavoriteBtn").addEventListener("click", () => {
  if (!state.place) return;
  const favorites = getFavorites();
  if (!favorites.some((item) => item.name === state.place.name)) {
    favorites.push(state.place);
    setFavorites(favorites);
  }
  renderFavorites();
});

favoritesList.addEventListener("click", async (event) => {
  const favoriteIndex = event.target.dataset.favorite;
  const removeIndex = event.target.dataset.remove;
  const favorites = getFavorites();

  if (favoriteIndex !== undefined) {
    await loadWeather(favorites[Number(favoriteIndex)]);
  }

  if (removeIndex !== undefined) {
    favorites.splice(Number(removeIndex), 1);
    setFavorites(favorites);
    renderFavorites();
  }
});

$("#notifyBtn").addEventListener("click", async () => {
  if (!("Notification" in window)) {
    alert("Ваш браузер не поддерживает уведомления.");
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    new Notification("WeatherGuru", { body: buildAlerts()[0] });
  }
});

$("#commentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const text = $("#commentInput").value.trim();
  if (!text || !state.place) return;
  const comments = getComments();
  comments.unshift({
    place: state.place.name,
    user: state.user,
    text,
    date: new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(new Date()),
  });
  setComments(comments);
  $("#commentInput").value = "";
  renderComments();
});

// В Capacitor (нативная обёртка) SW не нужен — только в обычном браузере
const isNativeApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
if ("serviceWorker" in navigator && !isNativeApp && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

showApp();
