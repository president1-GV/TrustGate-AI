const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'public', 'specimens');
const objectKeys = [
  "cases/TG-MUB1BCAM-538890B0/documents/capture-1789982416895-a8e6be39-3286-4635-8109-d46feb9ce0b1.jpg",
  "cases/TG-MUBHFDNJ-E945F76B/documents/capture-1790009479137-817f830c-f20a-4205-954a-1c83218cf1a6.jpg",
  "cases/TG-MUC3HQNY-8817C80F/documents/capture-1790046540863-98b6cd6d-2ab6-4a53-8fbd-46afa75e9d15.jpg",
  "cases/TG-MUCJRW6O-EA34A210/documents/capture-1790073888433-da671263-a862-4ab0-9b05-29a8395dd733.jpg",
  "cases/TG-MUDUM8KN-AC4595C2/documents/capture-1790152566505-57162627-4403-48db-8ccc-31d1038483b9.jpg",
  "cases/TG-MUE1OM9Q-9AD10FC6/documents/capture-1790164434879-6e5c9e7d-4308-454a-a9a7-020007a2ba46.jpg",
  "cases/TG-MUE4CBHH-EAFE0089/documents/capture-1790168899878-83524174-6307-45fa-9a86-4c977cdfdd6e.jpg",
  "cases/TG-MUE4RV85-D687606A/documents/capture-1790169625302-cb3b3b03-0de3-4a6c-9c7c-8886f97b7ae6.jpg",
  "cases/TG-MUE5K8LP-CC0A3DA5/documents/capture-1790170949006-7de6d099-7957-484c-9fdd-340a910bc544.jpg",
  "cases/TG-MUE63NJM-1D2B1192/documents/capture-1790171854842-c6ab37b9-2556-4c2a-8364-1c27bf5f9792.jpg",
  "cases/TG-MUE7IZFY-438231E0/documents/capture-1790174249711-72192df1-1ece-4d02-8327-e1468fb5ae53.jpg",
  "cases/TG-MUEX0R7N-4C6040FE/documents/capture-1790217069251-5041b0c7-0030-4b27-9cf7-da55d495497f.jpg",
  "cases/TG-MUF6CV4T-98207F80/documents/capture-1790232750764-5a9baca7-7532-4434-820d-cca91c98c13f.jpg",
  "cases/TG-MUJ5ZYDG-15C10EBE/documents/capture-1790474013127-5869806f-b8a9-4bf3-bb2f-14afe2945f8c.jpg",
  "cases/TG-MUJ6FV0S-9F8EFB41/documents/capture-1790474755277-8623f6c9-3c14-442a-8f14-422e95ff8637.jpg",
  "cases/TG-MUJ6JIJB-2FE3AB99/documents/capture-1790474925720-59fcd1d6-e8ba-4f8f-83ac-3970a2b7d190.jpg",
  "cases/TG-MUJ8JR8L-59470309/documents/capture-1790478296233-94e9f5a0-5482-43e9-ba76-a03b449c3d44.jpg",
  "cases/TG-MUJ8M058-D97B1581/documents/capture-1790478401085-52a87802-209f-49e8-ab5f-00550a23ce2f.jpg",
  "cases/TG-MUJ8NVVR-9C8BD339/documents/capture-1790478488876-0518d031-6e5e-4930-9be5-91275131cb79.jpg",
  "cases/TG-MUJ9U21N-0D8EDE96/documents/capture-1790480456484-f79cd26f-8bd7-4746-87fe-ddf367d85b5c.jpg",
  "cases/TG-MUJ9YXQU-EB15E9C2/documents/capture-1790480684119-c3d3bcaf-8bd6-4602-b678-5c07b51dd651.jpg",
  "cases/TG-MUJA2O3X-873421A3/documents/capture-1790480858256-2c1ffc83-a17b-46a8-90ce-c8b75b685273.jpg",
  "cases/TG-MUNNNSW9-91B6C50A/documents/capture-1790745543948-be002a1d-5770-448a-be6d-ca99949efbab.jpg"
];

async function uploadAll() {
  const API_KEY = process.env.INSFORGE_API_KEY || "";
  const BASE_URL = "https://i8yy29ec.us-east.insforge.app";

  for (let i = 0; i < objectKeys.length; i++) {
    const key = objectKeys[i];
    const filename = path.basename(key);
    const filePath = path.join(targetDir, filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = filename.endsWith('.png') ? 'image/png' : filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

    const url = `${BASE_URL}/api/storage/buckets/documents/objects/${encodeURIComponent(key)}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': mimeType
        },
        body: fileBuffer
      });
      if (res.ok) {
        console.log(`[${i + 1}/${objectKeys.length}] Uploaded ${key} to documents bucket (${res.status})`);
      } else {
        // Try PUT
        const putRes = await fetch(url, {
          method: 'PUT',
          headers: {
            'x-api-key': API_KEY,
            'Content-Type': mimeType
          },
          body: fileBuffer
        });
        console.log(`[${i + 1}/${objectKeys.length}] PUT ${key}: ${putRes.status}`);
      }
    } catch (err) {
      console.error(`Error uploading ${key}:`, err.message);
    }
  }
}

uploadAll();
