import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!file) {
      return alert("Please select a file");
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      
      if (res.ok && data.url) {
        setUploadedUrl(data.url);
        alert("File uploaded successfully!");
        setFile(null)
      } else {
        alert(`Upload failed: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Upload Image to AWS S3</h1>
      
      <form onSubmit={handleUpload}>
        <div style={{ marginBottom: 20 }}>
          <input 
            type="file" 
            onChange={handleChange}
            accept="image/*"
            disabled={isUploading}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={!file || isUploading}
          style={{
            padding: '10px 20px',
            backgroundColor: isUploading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isUploading ? 'not-allowed' : 'pointer'
          }}
        >
          {isUploading ? "Uploading..." : "Upload to S3"}
        </button>
      </form>

      {file && (
        <div style={{ marginTop: 20 }}>
          <p><strong>Selected file:</strong> {file.name}</p>
          <p><strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      )}

      {uploadedUrl && (
        <div style={{ marginTop: 30 }}>
          <p><strong>Uploaded Image:</strong></p>
          <img 
            src={uploadedUrl} 
            alt="Uploaded" 
            style={{ 
              maxWidth: '100%', 
              width: '300px', 
              height: 'auto',
              border: '1px solid #ddd',
              borderRadius: '8px'
            }} 
          />
          <div style={{ marginTop: 10 }}>
            <a 
              href={uploadedUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#0070f3' }}
            >
              View full image
            </a>
          </div>
        </div>
      )}
    </div>
  );
}