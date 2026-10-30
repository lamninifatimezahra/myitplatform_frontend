import { useState } from 'react';
import fetchWithAuth from '../../../utils/fetchWithAuth';

export default function IdeaForm({ onNewIdea }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description) return;
    setLoading(true);

    try {
      await fetchWithAuth('/api/ideas/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      setTitle('');
      setDescription('');
      onNewIdea();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-gray-200 p-6 rounded-xl shadow space-y-4"
    >
      <h2 className="text-xl font-semibold text-[#31327e]">💬 Proposer une idée</h2>
      <input
        type="text"
        placeholder="Titre de l'idée"
        className="w-full p-2 border border-gray-300 rounded"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <textarea
        placeholder="Décris ton idée ici..."
        className="w-full p-2 border border-gray-300 rounded"
        rows={4}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
      />
      <button
        type="submit"
        className="bg-[#31327e] text-white px-4 py-2 rounded hover:bg-[#2a2b6b] transition"
        disabled={loading}
      >
        {loading ? 'Envoi en cours...' : 'Soumettre l’idée'}
      </button>
    </form>
  );
}
