'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import fetchWithAuth from '@/utils/fetchWithAuth';

export default function EditPost() {
  const { id: postId } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // Fetch current post data
  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetchWithAuth(`https://myit-backend-ed72239b4b8e.herokuapp.com/myforum/posts/${postId}/`);
        if (!res.ok) throw new Error('Erreur de chargement');
        const data = await res.json();
        setPost(data);
        setTitle(data.title);
        setContent(data.content);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    }

    if (postId) fetchPost();
  }, [postId]);

  const handleUpdate = async () => {
    try {
      const res = await fetchWithAuth(`/myforum/posts/${postId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content }),
      });
      if (!res.ok) throw new Error('Mise à jour échouée');
      router.push(`/myforum/posts/${postId}`);
    } catch (error) {
      console.error('Erreur de mise à jour :', error);
    }
  };

  if (loading) return <p>Chargement...</p>;

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <h1 className="text-xl font-bold mb-6">✏️ Modifier le post</h1>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full border rounded-lg p-2"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Contenu</label>
        <textarea
          rows="6"
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full border rounded-lg p-2"
        />
      </div>

      <button
        onClick={handleUpdate}
        className="bg-[#68bddd] text-white px-4 py-2 rounded hover:bg-[#5aa6c5] transition"
      >
        Enregistrer
      </button>
    </div>
  );
}
