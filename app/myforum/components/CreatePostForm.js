'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  FiUpload, FiFileText, FiLink2, FiSend,
} from "react-icons/fi";
import { MdDriveFileRenameOutline } from "react-icons/md";
import fetchWithAuth from '@/utils/fetchWithAuth'; // 👈 Assure-toi que ce chemin est correct

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description || '');
      formData.append('category', form.category);
      formData.append('link', form.link);
      if (form.file) {
        formData.append('image', form.file); // 👈 actual binary file
      }

      const res = await fetchWithAuth("https://myit-backend-ed72239b4b8e.herokuapp.com/myforum/posts/", {
        method: "POST",
        body: formData,
        // ❌ DO NOT set Content-Type here (browser will set correct boundaries)
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error("Erreur lors de la publication : " + err);
      }

      const data = await res.json();
      console.log("✅ Post créé :", data);

      alert("✅ Post publié avec succès !");
      setForm({ title: '', description: '', category: '', link: '', file: null });

    } catch (err) {
      console.error("❌", err);
      alert(err.message || "Erreur inconnue");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-sm text-gray-700">
      <InputField
        icon={<MdDriveFileRenameOutline size={18} />}
        label="Titre du post"
        name="title"
        value={form.title}
        onChange={handleChange}
      />

      <div className="relative">
        <label className="mb-1 flex items-center gap-2 text-gray-700 font-medium">
          <FiFileText size={16} />
          Description
        </label>
        <div data-color-mode="light" className="bg-white border border-gray-300 rounded-xl overflow-hidden">
        <MDEditor
          value={form.description || ''}
          onChange={(val) => setForm({ ...form, description: val || '' })}
          preview="edit"
          height={200}
          className="!bg-white !shadow-none !rounded-xl"
        />
        </div>
      </div>

      <SelectField
        icon={<FiFileText size={18} />}
        label="Catégorie"
        name="category"
        value={form.category}
        onChange={handleChange}
        options={["FTTH", "HISPEED", "FTTB", "DSL", "EARF", "ARTHUIS"]}
      />

      <InputField
        icon={<FiLink2 size={18} />}
        label="Lien (optionnel)"
        name="link"
        value={form.link}
        onChange={handleChange}
      />

      <label
        htmlFor="file"
        className="relative flex items-center justify-between gap-4 px-4 py-3 border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 rounded-xl cursor-pointer transition"
      >
        <div className="flex items-center gap-3 text-[#6f80ac]">
          <FiUpload size={20} />
          <span className="text-sm font-medium">
            {form.file ? form.file.name : "Téléverser une image (PNG)"}
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

// Reusable Input
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

// Reusable Select
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
