'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import LayoutForum from '../../components/LayoutForum';
import { posts as staticPosts } from '../../data/posts';
import Image from 'next/image';

export default function EditPostPage() {
  const { id } = useParams();
  const router = useRouter();
  const messageRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    link: '',
    image: '',
    file: null,
  });
  const [imagePreview, setImagePreview] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const dynamicPosts = JSON.parse(localStorage.getItem('myit_dynamic_posts') || '[]');
    const allPosts = [...dynamicPosts, ...staticPosts];
    const post = allPosts.find((p) => p.id === parseInt(id));

    if (post) {
      setForm({
        title: post.title,
        description: post.description,
        category: post.category,
        link: post.link || '',
        image: post.image || '',
        file: null,
      });
      setImagePreview(post.image || '');
      setLoaded(true);
    } else {
      setNotFound(true);
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === 'file') {
      const selectedFile = files[0];
      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = () => {
          setImagePreview(reader.result);
          setForm((prev) => ({
            ...prev,
            file: selectedFile,
            image: reader.result,
          }));
        };
        reader.readAsDataURL(selectedFile);
      }
    } else {
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const scrollToMessage = () => {
    setTimeout(() => {
      if (messageRef.current) {
        messageRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100); // petit délai pour laisser le message s'afficher
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!window.confirm('Confirmer les modifications ?')) return;

    const posts = JSON.parse(localStorage.getItem('myit_dynamic_posts') || '[]');
    const updatedPosts = posts.map((p) =>
      p.id === parseInt(id)
        ? {
            ...p,
            ...form,
            image: form.image,
          }
        : p
    );

    localStorage.setItem('myit_dynamic_posts', JSON.stringify(updatedPosts));
    setMessage('✅ Modifications enregistrées avec succès.');
    scrollToMessage();

    setTimeout(() => router.push(`/myforum/${id}`), 1500);
  };

  const handleDelete = () => {
    if (!window.confirm('Supprimer définitivement ce post ?')) return;

    const posts = JSON.parse(localStorage.getItem('myit_dynamic_posts') || '[]');
    const filtered = posts.filter((p) => p.id !== parseInt(id));
    localStorage.setItem('myit_dynamic_posts', JSON.stringify(filtered));
    setMessage('🗑️ Post supprimé avec succès.');
    scrollToMessage();

    setTimeout(() => router.push('/myforum'), 1500);
  };

  if (notFound) {
    return (
      <LayoutForum>
        <div className="text-center text-red-500 p-8 font-semibold">
          ❌ Ce post est introuvable ou a été supprimé.
        </div>
      </LayoutForum>
    );
  }

  if (!loaded) {
    return (
      <LayoutForum>
        <div className="text-center text-gray-500 p-8">Chargement...</div>
      </LayoutForum>
    );
  }

  return (
    <LayoutForum>
      <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-xl space-y-6">
        <h1 className="text-3xl font-bold text-center text-[#31327e]">Modifier le post</h1>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm text-gray-700">
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Titre du post"
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none"
          />

          <textarea
            name="description"
            rows={4}
            value={form.description}
            onChange={handleChange}
            placeholder="Description"
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none resize-none"
          />

          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-blue-400 outline-none"
          >
            <option value="" disabled hidden>
              Choisir une catégorie
            </option>
            <option value="FTTH">FTTH</option>
            <option value="SI3C">SI3C</option>
            <option value="DOOR">DOOR</option>
            <option value="B2B">B2B</option>
            <option value="Support">Support</option>
          </select>

          <input
            name="link"
            value={form.link}
            onChange={handleChange}
            placeholder="Lien (optionnel)"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none"
          />

          {imagePreview && (
            <div className="relative w-full h-52 rounded-xl overflow-hidden border">
              <Image src={imagePreview} alt="Prévisualisation" layout="fill" objectFit="cover" />
            </div>
          )}

          <label
            htmlFor="file"
            className="block w-full border-2 border-dashed border-gray-300 rounded-xl text-center py-4 cursor-pointer hover:bg-gray-50 transition"
          >
            <p className="text-sm font-medium text-gray-500">
              {form.file ? form.file.name : 'Téléverser une nouvelle image (PNG, JPG)'}
            </p>
            <input
              type="file"
              name="file"
              id="file"
              accept=".jpg,.jpeg,.png"
              onChange={handleChange}
              className="hidden"
            />
          </label>

          <div className="flex justify-between items-center gap-4 pt-4">
            <button
              type="submit"
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
            >
              Enregistrer
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex-1 py-3 bg-red-100 text-red-600 border border-red-300 rounded-xl font-semibold hover:bg-red-200 transition"
            >
              Supprimer
            </button>
          </div>

          {message && (
            <div
              ref={messageRef}
              className="mt-4 bg-green-50 border border-green-300 text-green-800 font-medium p-3 rounded-lg text-center transition-all"
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </LayoutForum>
  );
}
