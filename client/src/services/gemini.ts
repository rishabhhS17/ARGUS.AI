
// Determine Backend URL (Local vs Prod)
 export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function processMediaOnClient(text: string, file: File | null) {
  let fileData = null;
  let mimeType = null;

  // 1. Process media on client to Base64
  if (file) {
    fileData = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    mimeType = file.type;
  }

  // 2. Send to YOUR server (Proxy)
  const response = await fetch(`${API_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        text, 
        fileData, 
        mimeType, 
        taskType: 'ANALYSIS' 
    })
  });

  if (!response.ok) throw new Error("Server Analysis Failed");
  return await response.json();
}

export async function generateAdvisoryText(incident: any) {
  const incidentContext = `
    Type: ${incident.type}
    Location: ${incident.location.address}
    Severity: ${incident.severity}
    Desc: ${incident.description}
  `;

  const response = await fetch(`${API_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        text: incidentContext, 
        taskType: 'ADVISORY'
    })
  });

  if (!response.ok) throw new Error("Advisory Gen Failed");
  const data = await response.json();
  return data.text;
}