"use client";
import { useState, useRef } from "react";
import { AiOutlineUpload } from "react-icons/ai";
import fetchWithAuth from "@/utils/fetchWithAuth";

function FileUploadWithButton({ accept, onFileSelected, file }) {
  const inputRef = useRef(null);
  const handleBrowse = () => inputRef.current?.click();
  const handleFileChange = (e) => e.target.files && onFileSelected(e.target.files[0]);

  return (
    <div className="border border-gray-300 p-2 rounded flex items-center">
      <input
        type="text"
        readOnly
        value={file ? file.name : ""}
        placeholder="Aucun fichier choisi"
        className="flex-grow outline-none border-none bg-transparent text-black"
      />
      <button
        type="button"
        onClick={handleBrowse}
        className="ml-2 text-blue-600"
      >
        Parcourir
      </button>
      <input
        type="file"
        accept={accept}
        onChange={handleFileChange}
        ref={inputRef}
        className="hidden"
      />
    </div>
  );
}

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
  const [dslFile, setDslFile] = useState(null);
  const [fttbFile, setFttbFile] = useState(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(""); // "success" | "error"

  const showMessage = (text, isError = false) => {
    setMessage(text);
    setStatus(isError ? "error" : "success");
  };

  const uploadHispeed = async () => {
    if (!hispeedFile)
      return showMessage("Veuillez sélectionner un fichier Hispeed.", true);
    const formData = new FormData();
    formData.append("document", hispeedFile);
    try {
      const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/hispeed/upload/", {
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
    if (!ftthStock || !ftthRegle)
      return showMessage("Veuillez sélectionner les deux fichiers FTTH.", true);
    const formData = new FormData();
    formData.append("stock_file", ftthStock);
    formData.append("regle_file", ftthRegle);
    try {
      const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/ftth/upload/", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      showMessage(res.ok ? data.message : data.error, !res.ok);
    } catch {
      showMessage("Erreur lors de l’upload FTTH.", true);
    }
  };

  const uploadDSL = async () => {
    if (!dslFile)
      return showMessage("Veuillez sélectionner un fichier DSL.", true);
    const formData = new FormData();
    formData.append("document", dslFile);
    try {
      const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/dsl/upload/", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      showMessage(res.ok ? data.message : data.error, !res.ok);
    } catch {
      showMessage("Erreur lors de l’upload DSL.", true);
    }
  };

  const uploadFTTB = async () => {
    if (!fttbFile)
      return showMessage("Veuillez sélectionner un fichier FTTB.", true);
    const formData = new FormData();
    formData.append("document", fttbFile);
    try {
      const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/fttb/upload/", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      showMessage(res.ok ? data.message : data.error, !res.ok);
    } catch {
      showMessage("Erreur lors de l’upload FTTB.", true);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-black">
      <UploadCard
        title="Uploader Hispeed"
        onUpload={uploadHispeed}
        inputs={
          <FileUploadWithButton
            accept=".xlsx"
            onFileSelected={setHispeedFile}
            file={hispeedFile}
          />
        }
        helpText="📄 Format Excel requis (.xlsx)"
      />

      <UploadCard
        title="Uploader FTTH"
        onUpload={uploadFTTH}
        inputs={
          <>
            <FileUploadWithButton
              accept=".xlsx"
              onFileSelected={setFtthStock}
              file={ftthStock}
            />
            <FileUploadWithButton
              accept=".xlsx"
              onFileSelected={setFtthRegle}
              file={ftthRegle}
            />
          </>
        }
        helpText="📄 Deux fichiers requis : stock et règle (.xlsx)"
      />

      <UploadCard
        title="Uploader DSL"
        onUpload={uploadDSL}
        inputs={
          <FileUploadWithButton
            accept=".xlsx"
            onFileSelected={setDslFile}
            file={dslFile}
          />
        }
        helpText="📄 Format Excel requis (.xlsx)"
      />

      <UploadCard
        title="Uploader FTTB"
        onUpload={uploadFTTB}
        inputs={
          <FileUploadWithButton
            accept=".xlsx"
            onFileSelected={setFttbFile}
            file={fttbFile}
          />
        }
        helpText="📄 Format Excel requis (.xlsx)"
      />

      {message && (
        <div
          className={`col-span-1 md:col-span-2 mt-2 text-center text-sm p-3 rounded shadow ${
            status === "error"
              ? "bg-red-100 text-red-600"
              : "bg-green-100 text-green-700"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
