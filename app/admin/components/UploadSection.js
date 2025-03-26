"use client";
import { useState } from "react";
import { AiOutlineUpload } from "react-icons/ai";

function UploadCard({ title, inputs, onUpload, helpText }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow flex flex-col gap-4">
      <h3 className="font-semibold text-lg">{title}</h3>
      {inputs}
      <button
        onClick={onUpload}
        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition"
      >
        <span>Uploader</span> <AiOutlineUpload />
      </button>
      <div className="text-xs text-gray-600">{helpText}</div>
    </div>
  );
}

export default function UploadSection() {
  const [hispeedFile, setHispeedFile] = useState(null);
  const [ftthStock, setFtthStock] = useState(null);
  const [ftthRegle, setFtthRegle] = useState(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(""); // "success" | "error"

  const showMessage = (text, isError = false) => {
    setMessage(text);
    setStatus(isError ? "error" : "success");
  };

  const uploadHispeed = async () => {
    if (!hispeedFile) return showMessage("Veuillez sélectionner un fichier Hispeed.", true);
    const formData = new FormData();
    formData.append("document", hispeedFile);
    try {
      const res = await fetch("http://127.0.0.1:8000/dashboard/api/hispeed/upload/", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      showMessage(res.ok ? data.message : data.error, !res.ok);
    } catch {
      showMessage("Erreur lors de l’upload Hispeed.", true);
    }
  };

  const uploadFTTH = async () => {
    if (!ftthStock || !ftthRegle) {
      return showMessage("Veuillez sélectionner les deux fichiers FTTH.", true);
    }
    const formData = new FormData();
    formData.append("stock_file", ftthStock);
    formData.append("regle_file", ftthRegle);
    try {
      const res = await fetch("http://127.0.0.1:8000/dashboard/api/upload/", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      showMessage(res.ok ? data.message : data.error, !res.ok);
    } catch {
      showMessage("Erreur lors de l’upload FTTH.", true);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-black">
      <UploadCard
        title="Uploader Hispeed"
        onUpload={uploadHispeed}
        inputs={
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setHispeedFile(e.target.files[0])}
            className="border border-gray-300 p-2 rounded"
          />
        }
        helpText="📄 Format Excel requis"
      />

      <UploadCard
        title="Uploader FTTH"
        onUpload={uploadFTTH}
        inputs={
          <>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setFtthStock(e.target.files[0])}
              className="border border-gray-300 p-2 rounded"
            />
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setFtthRegle(e.target.files[0])}
              className="border border-gray-300 p-2 rounded"
            />
          </>
        }
        helpText="📄 Deux fichiers requis : stock et regle (.xlsx)"
      />

      {message && (
        <div
          className={`col-span-1 md:col-span-2 mt-2 text-center text-sm p-3 rounded shadow ${
            status === "error" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
