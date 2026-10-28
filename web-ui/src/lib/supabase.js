import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://ohqzmjlerxudlhggxqnn.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ocXptamxlcnh1ZGxoZ2d4cW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MDk4NzYsImV4cCI6MjA4ODI4NTg3Nn0.eTDxMhgVGnYlO1jUBMQMiY6lYjp6ud58ltoi8WhKDZo";

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadStorageFileWithProgress(bucket, path, file, onProgress) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`;

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", uploadUrl);
    request.setRequestHeader("apikey", supabaseKey);
    request.setRequestHeader("Authorization", `Bearer ${session?.access_token ?? supabaseKey}`);
    request.setRequestHeader("cache-control", "max-age=3600");
    request.setRequestHeader("content-type", file.type || "application/octet-stream");
    request.setRequestHeader("x-upsert", "false");
    request.responseType = "json";

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded, event.total);
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve(request.response);
        return;
      }

      reject(new Error(request.response?.message || `Upload failed (${request.status} ${request.statusText})`));
    };
    request.onerror = () => reject(new Error("Network error while uploading the file."));
    request.onabort = () => reject(new Error("File upload was cancelled."));
    request.send(file);
  });
}