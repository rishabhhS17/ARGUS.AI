
// Determine Backend URL (Local vs Prod)
 export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export type ReportSource = 'SOCIAL' | 'HELPLINE';

export interface IngestResult {
  merged: boolean;
  distanceKm: number | null;
  incident: any;
}

// Sends a raw citizen report to the server, which analyzes it with Gemini, validates it
// and correlates it in one request. The client never builds the incident record itself.
export async function submitReport(text: string, file: File | null, source: ReportSource): Promise<IngestResult> {
  let fileData = null;
  let mimeType = null;

  if (file) {
    fileData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = () => reject(new Error('Could not read the attached file.'));
      reader.readAsDataURL(file);
    });
    mimeType = file.type;
  }

  const response = await fetch(`${API_URL}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, fileData, mimeType, source })
  });

  if (!response.ok) throw new Error(await readErrorMessage(response, "Report could not be submitted"));
  return await response.json();
}

// The server explains rejections (e.g. a report with no place named) in { error }.
export async function readErrorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json();
    return typeof body?.error === 'string' && body.error ? body.error : fallback;
  } catch {
    return fallback;
  }
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

  if (!response.ok) throw new Error(await readErrorMessage(response, "Advisory Gen Failed"));
  const data = await response.json();
  return data.text;
}