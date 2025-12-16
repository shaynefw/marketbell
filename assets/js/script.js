// Market Bell – EST-based scheduler with presets and Disarm toggle

let started = false;
let lastOpenDate = null;
let lastCloseDate = null;
let timerId = null;

// Helper: Get current NY Time
function getEstNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
}

// Helper: Format time as HH:MM:SS
function formatTime(date) {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

// Helper: Get unique day string to prevent double ringing
function getDateKey(date) {
  return date.toDateString();
}

// Helper: Parse HH:MM string into object
function parseTimeValue(value) {
  if (!value || typeof value !== "string" || !value.includes(":")) {
    return null;
  }
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { hour: h, minute: m };
}

function updateClockDisplay() {
  const nowEst = getEstNow();
  const clockEl = document.getElementById("currentTime");
  if (clockEl) {
    clockEl.textContent = formatTime(nowEst);
  }
}

function updateStatus(message, cssClass) {
  const statusEl = document.getElementById("alarmStatus");
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = cssClass || "status-muted";
  }
}

function updateNextEventLabel(nextLabel) {
  const el = document.getElementById("nextEvent");
  if (el) el.textContent = nextLabel;
}

// Apply presets to input fields
function applyPreset(value) {
  const openInput = document.getElementById("openTime");
  const closeInput = document.getElementById("closeTime");

  if (!openInput || !closeInput) return;

  // Defaults: 9:30 open
  openInput.value = "09:30";

  if (value === "stocks") {
    closeInput.value = "16:00"; // 4 PM close
  } else if (value === "futures") {
    closeInput.value = "17:00"; // 5 PM close
  }
  // "custom" leaves current values as-is
}

// Calculate and display "Next event: ..."
function describeNextEvent(nowEst, openCfg, closeCfg) {
  if (!openCfg && !closeCfg) {
    updateNextEventLabel("Next event: no valid times set.");
    return;
  }
  // If not started, just say "not armed"
  if (!started) {
    updateNextEventLabel("Next event: not armed.");
    return;
  }

  const nowMinutes = nowEst.getHours() * 60 + nowEst.getMinutes();
  let label = "Next event: ";

  const candidates = [];

  if (openCfg) {
    const openMinutes = openCfg.hour * 60 + openCfg.minute;
    candidates.push({
      when: openMinutes,
      text: `open bell at ${openCfg.hour.toString().padStart(2, "0")}:${openCfg.minute
        .toString()
        .padStart(2, "0")} EST`
    });
  }

  if (closeCfg) {
    const closeMinutes = closeCfg.hour * 60 + closeCfg.minute;
    candidates.push({
      when: closeMinutes,
      text: `close bell at ${closeCfg.hour.toString().padStart(2, "0")}:${closeCfg.minute
        .toString()
        .padStart(2, "0")} EST`
    });
  }

  if (candidates.length === 0) {
    updateNextEventLabel("Next event: no valid times set.");
    return;
  }

  // Sort by time of day
  candidates.sort((a, b) => a.when - b.when);
  
  // Find the first event that is >= now
  const nextToday = candidates.find((c) => c.when >= nowMinutes);
  
  if (nextToday) {
     // Event is later today
     // Check if it's the exact minute right now; if so, it might be firing or just fired.
     // We will just show it as "at HH:MM"
     label += nextToday.text;
  } else {
    // All events passed today, so the next one is the earliest one tomorrow
    label += `${candidates[0].text} (tomorrow)`;
  }

  updateNextEventLabel(label);
}

function checkSchedule() {
  if (!started) return;

  const alarm = document.getElementById("alarmSound");
  if (!alarm) return;

  const nowEst = getEstNow();
  const day = nowEst.getDay(); // 0 = Sun, 6 = Sat
  const dateKey = getDateKey(nowEst);

  const openInput = document.getElementById("openTime");
  const closeInput = document.getElementById("closeTime");
  const weekdaysOnly = document.getElementById("weekdaysOnly")?.checked ?? false;

  const openCfg = parseTimeValue(openInput?.value);
  const closeCfg = parseTimeValue(closeInput?.value);

  // If "Weekdays Only" is checked and it's Sat/Sun, just wait
  if (weekdaysOnly && (day === 0 || day === 6)) {
    updateStatus("Weekend: bell armed (paused until Monday).", "status-idle");
    updateNextEventLabel("Next event: Monday");
    return;
  }

  const hours = nowEst.getHours();
  const minutes = nowEst.getMinutes();

  let fired = false;

  // Check Open
  if (openCfg) {
    if (
      hours === openCfg.hour &&
      minutes === openCfg.minute &&
      lastOpenDate !== dateKey
    ) {
      alarm.currentTime = 0;
      alarm.play().catch(() => {});
      lastOpenDate = dateKey;
      fired = true;
      updateStatus("Open bell fired for today!", "status-firing");
    }
  }

  // Check Close
  if (closeCfg) {
    if (
      hours === closeCfg.hour &&
      minutes === closeCfg.minute &&
      lastCloseDate !== dateKey
    ) {
      alarm.currentTime = 0;
      alarm.play().catch(() => {});
      lastCloseDate = dateKey;
      fired = true;
      updateStatus("Close bell fired for today!", "status-firing");
    }
  }

  if (!fired) {
    updateStatus("Bell armed and waiting...", "status-armed");
  }

  describeNextEvent(nowEst, openCfg, closeCfg);
}

function setInputsDisabled(disabled) {
  const ids = ["openTime", "closeTime", "presetSelect", "weekdaysOnly"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
  });
  
  // Also visually dim the containers
  const fields = ["fieldOpen", "fieldClose", "fieldPreset"];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (disabled) el.classList.add("disabled");
      else el.classList.remove("disabled");
    }
  });
}

function startBell() {
  started = true;
  const btn = document.getElementById("toggleButton");
  if (btn) {
    btn.textContent = "■ Disarm bell";
    btn.classList.add("btn-danger");
  }
  
  setInputsDisabled(true);
  updateStatus("Bell armed. Schedule locked.", "status-armed");

  // Run immediately, then interval
  checkSchedule();
  if (timerId !== null) clearInterval(timerId);
  timerId = setInterval(checkSchedule, 1000);
}

function stopBell() {
  started = false;
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }

  const btn = document.getElementById("toggleButton");
  if (btn) {
    btn.textContent = "▶ Arm bell";
    btn.classList.remove("btn-danger");
  }

  setInputsDisabled(false);
  updateStatus("Bell disarmed. You can edit times now.", "status-muted");
  updateNextEventLabel("Next event: not armed.");
}

function toggleBell() {
  if (started) {
    stopBell();
  } else {
    // Attempt to unlock audio context on first user gesture
    const alarm = document.getElementById("alarmSound");
    if (alarm) {
      alarm.muted = true;
      alarm.play().catch(() => {});
      setTimeout(() => {
        alarm.pause();
        alarm.muted = false;
      }, 50);
    }
    startBell();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const openInput = document.getElementById("openTime");
  const closeInput = document.getElementById("closeTime");
  const presetSelect = document.getElementById("presetSelect");
  const toggleButton = document.getElementById("toggleButton");

  // Defaults
  if (openInput) openInput.value = "09:30";
  if (closeInput) closeInput.value = "17:00";

  // Start clock
  updateClockDisplay();
  setInterval(updateClockDisplay, 1000);

  // Preset logic
  if (presetSelect) {
    presetSelect.addEventListener("change", (e) => {
      applyPreset(e.target.value);
    });
  }

  // Toggle button
  if (toggleButton) {
    toggleButton.addEventListener("click", toggleBell);
  }
  
  // Initial UI state
  updateNextEventLabel("Next event: not armed.");
});
