'use client';

import { useState } from 'react';
import {
  FiUpload, FiFileText, FiLink2, FiEdit3, FiSend,
} from "react-icons/fi";
import { MdDriveFileRenameOutline } from "react-icons/md";

export default function CreatePostForm() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    link: '',
    file: null,
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm({
      ...form,
      [name]: name === 'file' ? files[0] : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', form);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 text-sm text-gray-700"
    >
      {/* Champ titre */}
      <InputField
        icon={<MdDriveFileRenameOutline size={18} />}
        label="Titre du post"
        name="title"
        value={form.title}
        onChange={handleChange}
      />

      {/* Champ description */}
      <TextareaField
        icon={<FiEdit3 size={18} />}
        label="Description"
        name="description"
        value={form.description}
        onChange={handleChange}
      />

      {/* Champ catégorie */}
      <SelectField
        icon={<FiFileText size={18} />}
        label="Catégorie"
        name="category"
        value={form.category}
        onChange={handleChange}
        options={["FTTH", "SI3C", "DOOR", "B2B", "Autre"]}
      />

      {/* Lien */}
      <InputField
        icon={<FiLink2 size={18} />}
        label="Lien (optionnel)"
        name="link"
        value={form.link}
        onChange={handleChange}
      />

      {/* Upload fichier avec drag zone */}
      <label
        htmlFor="file"
        className="relative flex items-center justify-between gap-4 px-4 py-3 border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 rounded-xl cursor-pointer transition"
      >
        <div className="flex items-center gap-3 text-[#6f80ac]">
          <FiUpload size={20} />
          <span className="text-sm font-medium">
            {form.file ? form.file.name : "Téléverser un fichier (PDF, DOCX, PNG...)"}
          </span>
        </div>
        <input
          type="file"
          name="file"
          id="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          onChange={handleChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>

      {/* Bouton Publier */}
      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-gradient-to-r from-[#68bddd] to-[#6f80ac] text-white font-semibold shadow-md hover:shadow-lg transition-all"
      >
        <FiSend size={18} />
        Publier
      </button>
    </form>
  );
}

function InputField({ icon, label, name, value, onChange }) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-3.5 text-gray-400">{icon}</div>
      <input
        type="text"
        name={name}
        placeholder={label}
        value={value}
        onChange={onChange}
        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#68bddd] transition"
      />
    </div>
  );
}

function TextareaField({ icon, label, name, value, onChange }) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-3.5 text-gray-400">{icon}</div>
      <textarea
        name={name}
        placeholder={label}
        rows={4}
        value={value}
        onChange={onChange}
        className="w-full pl-10 pr-4 pt-3 pb-2.5 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#68bddd] transition resize-none"
      />
    </div>
  );
}

function SelectField({ icon, label, name, value, onChange, options }) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-3.5 text-gray-400">{icon}</div>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#68bddd] transition"
      >
        <option value="" disabled hidden>{label}</option>
        {options.map((opt, i) => (
          <option key={i} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
