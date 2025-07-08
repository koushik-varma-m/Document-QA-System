import React, { ChangeEvent, useState } from 'react';
import { uploadDocument } from '../api/api';

interface UploadPaneProps {
  onUpload: () => void;
  chatId?: string;
}

export function UploadPane({ onUpload, chatId }: UploadPaneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      await uploadDocument(file, chatId);
      onUpload();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded">
      <input type="file" accept=".pdf,.txt" onChange={handleChange} />
      <button onClick={handleUpload} disabled={!file || loading} className="ml-2 px-4 py-2 rounded bg-blue-500 text-white">
        {loading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
}