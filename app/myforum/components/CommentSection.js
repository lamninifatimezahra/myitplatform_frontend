"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AiOutlineSend } from "react-icons/ai";
import Image from "next/image";

const initialComments = [
  {
    id: 1,
    author: "Fatima M.",
    avatar: "/avatar.png",
    message: "Merci pour ce post très utile !",
    date: "Il y a 10 min",
  },
  {
    id: 2,
    author: "Omar L.",
    avatar: "/avatar.png",
    message: "J'ai rencontré le même problème, voici comment j'ai fait...",
    date: "Il y a 25 min",
  },
];

export default function CommentSection() {
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState("");

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const newObj = {
      id: Date.now(),
      author: "Ayoub Lahdoud",
      avatar: "/avatar.png",
      message: newComment,
      date: "À l’instant",
    };
    setComments([newObj, ...comments]);
    setNewComment("");
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-[#31327e] mb-4">Commentaires</h3>

      {/* Zone de saisie */}
      <div className="flex items-start gap-3 mb-6">
        <Image
          src="/avatar.png"
          alt="Ayoub"
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
              src={comment.avatar}
              alt={comment.author}
              width={36}
              height={36}
              className="rounded-full object-cover"
            />
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[#31327e]">{comment.author}</span>
                <span className="text-xs text-gray-400">{comment.date}</span>
              </div>
              <p className="text-sm text-gray-700 mt-1">{comment.message}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
