"use client";
import { useState, useRef } from "react";
import { AiOutlineUpload } from "react-icons/ai";
import { FaNetworkWired, FaServer, FaRegFileExcel, FaFileInvoiceDollar, FaFileContract } from "react-icons/fa";
import { BiTransfer } from "react-icons/bi";
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

function UploadCard({ title, inputs, onUpload, helpText, icon }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>
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

function ActivitySection({ title, children, icon, message, status }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg shadow-sm mb-6 overflow-hidden">
      <button 
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-bold text-xl">{title}</h2>
        </div>
        <div className="text-gray-500">
          {isExpanded ? "▲" : "▼"}
        </div>
      </button>
      
      {isExpanded && (
        <div className="flex flex-col">
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {children}
          </div>
          {message && (
            <div
              className={`mx-4 mb-4 text-center text-sm p-3 rounded shadow ${
                status === "error"
                  ? "bg-red-100 text-red-600"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function UploadSection() {
  // Fichiers pour les activités existantes
  const [hispeedFile, setHispeedFile] = useState(null);
  const [ftthStock, setFtthStock] = useState(null);
  const [ftthRegle, setFtthRegle] = useState(null);
  const [dslFile, setDslFile] = useState(null);
  const [fttbFile, setFttbFile] = useState(null);
  
  // Nouveaux fichiers pour EARF et Arthius
  const [earfFile, setEarfFile] = useState(null);
  const [arthiusFile, setArthiusFile] = useState(null);
  
  // Messages par activité
  const [ftthMessage, setFtthMessage] = useState("");
  const [ftthStatus, setFtthStatus] = useState("");
  
  const [fttbMessage, setFttbMessage] = useState("");
  const [fttbStatus, setFttbStatus] = useState("");
  
  const [dslMessage, setDslMessage] = useState("");
  const [dslStatus, setDslStatus] = useState("");
  
  const [hispeedMessage, setHispeedMessage] = useState("");
  const [hispeedStatus, setHispeedStatus] = useState("");
  
  const [earfMessage, setEarfMessage] = useState("");
  const [earfStatus, setEarfStatus] = useState("");
  
  const [arthiusMessage, setArthiusMessage] = useState("");
  const [arthiusStatus, setArthiusStatus] = useState("");

  const showFtthMessage = (text, isError = false) => {
    setFtthMessage(text);
    setFtthStatus(isError ? "error" : "success");
  };
  
  const showFttbMessage = (text, isError = false) => {
    setFttbMessage(text);
    setFttbStatus(isError ? "error" : "success");
  };
  
  const showDslMessage = (text, isError = false) => {
    setDslMessage(text);
    setDslStatus(isError ? "error" : "success");
  };
  
  const showHispeedMessage = (text, isError = false) => {
    setHispeedMessage(text);
    setHispeedStatus(isError ? "error" : "success");
  };
  
  const showEarfMessage = (text, isError = false) => {
    setEarfMessage(text);
    setEarfStatus(isError ? "error" : "success");
  };
  
  const showArthiusMessage = (text, isError = false) => {
    setArthiusMessage(text);
    setArthiusStatus(isError ? "error" : "success");
  };

  const uploadHispeed = async () => {
    if (!hispeedFile)
      return showHispeedMessage("Veuillez sélectionner un fichier Hispeed.", true);
    const formData = new FormData();
    formData.append("document", hispeedFile);
    try {
      const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/hispeed/upload/", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      showHispeedMessage(res.ok ? data.message : data.error, !res.ok);
    } catch (error) {
      showHispeedMessage("Erreur lors de l'upload Hispeed.", true);
    }
  };

  const uploadFTTH = async () => {
    if (!ftthStock || !ftthRegle)
      return showFtthMessage("Veuillez sélectionner les deux fichiers FTTH.", true);
    const formData = new FormData();
    formData.append("stock_file", ftthStock);
    formData.append("regle_file", ftthRegle);
    try {
      const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/ftth/upload/", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      showFtthMessage(res.ok ? data.message : data.error, !res.ok);
    } catch (error) {
      showFtthMessage("Erreur lors de l'upload FTTH.", true);
    }
  };

  const uploadDSL = async () => {
    if (!dslFile)
      return showDslMessage("Veuillez sélectionner un fichier DSL.", true);
    const formData = new FormData();
    formData.append("document", dslFile);
    try {
      const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/dsl/upload/", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      showDslMessage(res.ok ? data.message : data.error, !res.ok);
    } catch (error) {
      showDslMessage("Erreur lors de l'upload DSL.", true);
    }
  };

  const uploadFTTB = async () => {
    if (!fttbFile)
      return showFttbMessage("Veuillez sélectionner un fichier FTTB.", true);
    const formData = new FormData();
    formData.append("document", fttbFile);
    try {
      const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/fttb/upload/", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      showFttbMessage(res.ok ? data.message : data.error, !res.ok);
    } catch (error) {
      showFttbMessage("Erreur lors de l'upload FTTB.", true);
    }
  };

  // Nouvelles fonctions d'upload pour EARF et Arthius
  const uploadEARF = async () => {
    if (!earfFile)
      return showEarfMessage("Veuillez sélectionner un fichier EARF.", true);
    const formData = new FormData();
    formData.append("document", earfFile);
    try {
      const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/earf/upload/", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      showEarfMessage(res.ok ? data.message : data.error, !res.ok);
    } catch (error) {
      showEarfMessage("Erreur lors de l'upload EARF.", true);
    }
  };

  const uploadArthius = async () => {
    if (!arthiusFile)
      return showArthiusMessage("Veuillez sélectionner un fichier Arthius.", true);
    const formData = new FormData();
    formData.append("document", arthiusFile);
    try {
      const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/dashboard/api/arthius/upload/", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      showArthiusMessage(res.ok ? data.message : data.error, !res.ok);
    } catch (error) {
      showArthiusMessage("Erreur lors de l'upload Arthius.", true);
    }
  };

  return (
    <div className="text-black py-6">
      <h1 className="text-2xl font-bold mb-6">Gestion des uploads par activité</h1>
      
      <ActivitySection 
        title="FTTH" 
        icon={<FaNetworkWired className="text-blue-600" size={24} />}
        message={ftthMessage}
        status={ftthStatus}
      >
        <UploadCard
          title="Uploader FTTH"
          icon={<FaNetworkWired className="text-blue-600" />}
          onUpload={uploadFTTH}
          inputs={
            <>
              <div className="mb-2">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Fichier Stock</label>
                <FileUploadWithButton
                  accept=".xlsx"
                  onFileSelected={setFtthStock}
                  file={ftthStock}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Fichier Règle</label>
                <FileUploadWithButton
                  accept=".xlsx"
                  onFileSelected={setFtthRegle}
                  file={ftthRegle}
                />
              </div>
            </>
          }
          helpText="📄 Deux fichiers requis : stock et règle (.xlsx)"
        />
      </ActivitySection>
      
      <ActivitySection 
        title="FTTB" 
        icon={<FaServer className="text-green-600" size={24} />}
        message={fttbMessage}
        status={fttbStatus}
      >
        <UploadCard
          title="Uploader FTTB"
          icon={<FaServer className="text-green-600" />}
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
      </ActivitySection>
      
      <ActivitySection 
        title="DSL" 
        icon={<BiTransfer className="text-orange-600" size={24} />}
        message={dslMessage}
        status={dslStatus}
      >
        <UploadCard
          title="Uploader DSL"
          icon={<BiTransfer className="text-orange-600" />}
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
      </ActivitySection>
      
      <ActivitySection 
        title="Hispeed" 
        icon={<FaRegFileExcel className="text-indigo-600" size={24} />}
        message={hispeedMessage}
        status={hispeedStatus}
      >
        <UploadCard
          title="Uploader Hispeed"
          icon={<FaRegFileExcel className="text-indigo-600" />}
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
      </ActivitySection>
      
      <ActivitySection 
        title="EARF" 
        icon={<FaFileInvoiceDollar className="text-purple-600" size={24} />}
        message={earfMessage}
        status={earfStatus}
      >
        <UploadCard
          title="Uploader EARF"
          icon={<FaFileInvoiceDollar className="text-purple-600" />}
          onUpload={uploadEARF}
          inputs={
            <FileUploadWithButton
              accept=".xlsx"
              onFileSelected={setEarfFile}
              file={earfFile}
            />
          }
          helpText="📄 Format Excel requis (.xlsx)"
        />
      </ActivitySection>
      
      <ActivitySection 
        title="Arthuis" 
        icon={<FaFileContract className="text-red-600" size={24} />}
        message={arthiusMessage}
        status={arthiusStatus}
      >
        <UploadCard
          title="Uploader Arthuis"
          icon={<FaFileContract className="text-red-600" />}
          onUpload={uploadArthius}
          inputs={
            <FileUploadWithButton
              accept=".xlsx"
              onFileSelected={setArthiusFile}
              file={arthiusFile}
            />
          }
          helpText="📄 Format Excel requis (.xlsx)"
        />
      </ActivitySection>
    </div>
  );
}