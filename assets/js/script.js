// Flags to determine if the alarm has been played for the open/close times
let hasPlayedOpenAlarm = false;
let hasPlayedCloseAlarm = false;

// Function to play the alarm sound
function playAlarm() {
  const alarmSound = document.getElementById("alarmSound");
  alarmSound.currentTime = 0; // Reset the sound to the beginning
  alarmSound.play();
}

// Updates the alarm status text on the webpage
function updateAlarmStatus(message) {
  document.getElementById("alarmStatus").innerText = message;
}

// Check if the current time is within the stock market hours
function checkMarketHours() {
  const estTime = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const dayOfWeek = estTime.getDay();
  const hours = estTime.getHours();
  const minutes = estTime.getMinutes();

  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    // Monday (1) to Friday (5)
    if (hours === 9 && minutes === 30 && !hasPlayedOpenAlarm) {
      playAlarm();
      hasPlayedOpenAlarm = true;
      updateAlarmStatus("The stock market is open!");
    } else if (hours === 16 && minutes === 0 && !hasPlayedCloseAlarm) {
      playAlarm();
      hasPlayedCloseAlarm = true;
      updateAlarmStatus("The stock market is closed!");
    } else if (
      (hours !== 9 || minutes > 30) &&
      (hours !== 16 || minutes > 0)
    ) {
      hasPlayedOpenAlarm = false;
      hasPlayedCloseAlarm = false;
    }
  } else {
    hasPlayedOpenAlarm = false;
    hasPlayedCloseAlarm = false;
    updateAlarmStatus("Stock Market not open today.");
  }
}

// Bind the alarm check to the button click
document.getElementById("startButton").addEventListener("click", function () {
  setInterval(checkMarketHours, 1000); // Check every second
  checkMarketHours(); // Also check immediately
  this.style.display = "none"; // Optionally, hide the start button after clicked
});
