'use client';

import { useEffect, useState } from 'react';
import { FaUserCircle, FaTrash } from 'react-icons/fa';

export default function CommentSection({ postId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('myit_comments') || '{}');
    setComments(data[postId] || []);
  }, [postId]);

  const handlePublish = () => {
    if (!newComment.trim()) return;
    const comment = {
      id: Date.now(),
      author: 'Ayoub Lahdoud',
      content: newComment.trim(),
      date: new Date().toLocaleString(),
    };
    const updated = [...comments, comment];
    setComments(updated);
    const all = JSON.parse(localStorage.getItem('myit_comments') || '{}');
    all[postId] = updated;
    localStorage.setItem('myit_comments', JSON.stringify(all));
    setNewComment('');
  };

  const handleDelete = (id) => {
    const updated = comments.filter((c) => c.id !== id);
    setComments(updated);
    const all = JSON.parse(localStorage.getItem('myit_comments') || '{}');
    all[postId] = updated;
    localStorage.setItem('myit_comments', JSON.stringify(all));
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 text-[#31327e]">💬 Commentaires</h2>
      <div className="flex gap-2 mb-4">
        <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Ajouter un commentaire..." className="flex-1 px-4 py-2 border rounded-full" />
        <button onClick={handlePublish} className="bg-[#68bddd] text-white px-4 py-2 rounded-full hover:bg-[#6f80ac] transition">Publier</button>
      </div>
      <div className="space-y-4">
        {comments.length === 0
          ? <p className="text-gray-500 text-sm">Aucun commentaire pour l’instant.</p>
          : comments.map(c => (
            <div key={c.id} className="bg-gray-50 p-4 rounded-xl shadow-sm flex justify-between">
              <div className="flex gap-3">
                <FaUserCircle className="text-[#6f80ac] text-xl" />
                <div>
                  <p className="font-semibold text-sm">{c.author}</p>
                  <p className="text-xs text-gray-400">{c.date}</p>
                  <p className="text-sm mt-1">{c.content}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(c.id)} title="Supprimer" className="text-red-500 hover:text-red-700"><FaTrash /></button>
            </div>
          ))}
      </div>
    </div>
  );
}
