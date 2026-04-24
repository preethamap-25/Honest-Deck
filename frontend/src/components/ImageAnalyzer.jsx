import { useState, useRef } from "react";
import api from "../api/axios";

export default function ImageAnalyzer({ onResult }) {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    setFile(f);
    setError("");
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/analyze/image", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Image analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span className="text-2xl">🖼️</span> Image Analyzer
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-green-400 transition-colors"
        >
          {preview ? (
            <img src={preview} alt="preview" className="max-h-48 mx-auto rounded-lg object-contain" />
          ) : (
            <p className="text-gray-400 text-sm">Drag & drop an image or click to upload</p>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || !file}
          className="self-end bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          {loading ? "Analyzing…" : "Analyze Image"}
        </button>
      </form>
    </div>
  );
}
