'use client';

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AiOutlineSend } from "react-icons/ai";
import Image from "next/image";
import fetchWithAuth from '@/utils/fetchWithAuth';

export default function CommentSection({ postId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    async function fetchComments() {
      try {
        const res = await fetchWithAuth(`https://api.606510.xyz/myforum/comments/?post=${postId}`);
        if (!res.ok) throw new Error("Erreur lors du chargement des commentaires");
        const data = await res.json();
        setComments(data.reverse());
      } catch (err) {
        console.error("Erreur de chargement des commentaires:", err);
      }
    }

    fetchComments();
  }, [postId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await fetchWithAuth(`https://api.606510.xyz/myforum/posts/${postId}/comments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment, post: postId }),
      });

      if (!res.ok) throw new Error("Erreur lors de l'envoi du commentaire");
      const newData = await res.json();
      setComments([newData, ...comments]);
      setNewComment("");
    } catch (err) {
      console.error("Erreur d'ajout:", err);
    }
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-[#31327e] mb-4">Commentaires</h3>

      {/* Zone de saisie */}
      <div className="flex items-start gap-3 mb-6">
        <Image
          src="/avatar.png"
          alt="Avatar"
          width={36}
          height={36}
          className="rounded-full object-cover"
        />
        <div className="flex-1 relative">
          <textarea
            rows={2}
            className="w-full p-3 rounded-xl border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#68bddd] transition"
            placeholder="Ajouter un commentaire..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button
            onClick={handleAddComment}
            className="absolute bottom-2 right-2 text-[#31327e] hover:text-[#68bddd] transition"
            title="Envoyer"
          >
            <AiOutlineSend size={20} />
          </button>
        </div>
      </div>

      {/* Liste des commentaires */}
      <div className="space-y-4">
        {comments.map((comment) => (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm border border-gray-100"
          >
            <Image
              src="/avatar.png"
              alt={comment.author_name}
              width={36}
              height={36}
              className="rounded-full object-cover"
            />
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[#31327e]">{comment.author_name}</span>
                <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
