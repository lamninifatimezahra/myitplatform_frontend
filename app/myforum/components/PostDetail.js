'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import {
  FaArrowLeft, FaRegStar, FaStar, FaRegHeart,
  FaHeart, FaRegEdit, FaCommentDots
} from 'react-icons/fa';
import { format } from 'date-fns';
import MarkdownPreview from '@uiw/react-markdown-preview';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

export default function PostDetail({ post }) {
  const router = useRouter();
  const [likes, setLikes] = useState(post.likes || 0);
  const [stars, setStars] = useState(post.stars || 0);
  const [userLiked, setUserLiked] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState(post.comments || []);

  const handleLike = () => {
    setUserLiked(!userLiked);
    setLikes((prev) => (userLiked ? prev - 1 : prev + 1));
  };

  const handleStar = (index) => {
    setStars(index + 1);
  };

  const handleCommentSubmit = () => {
    if (!comment.trim()) return;

    const newComment = {
      id: Date.now(),
      author: 'Ayoub Lahdoud',
      date: format(new Date(), 'dd/MM/yyyy HH:mm:ss'),
      content: comment,
    };

    setComments([newComment, ...comments]);
    setComment('');
  };

  return (
    <div className="bg-white shadow-lg rounded-2xl p-6 max-w-3xl mx-auto mt-6 space-y-6">
      <button
        onClick={() => router.push('/myforum')}
        className="text-sm text-[#31327e] hover:underline flex items-center gap-1"
      >
        <FaArrowLeft /> Retour aux posts
      </button>

      {post.image && (
        <div className="w-full h-60 rounded-xl overflow-hidden relative">
          <Image
            src={post.image}
            alt={post.title}
            layout="fill"
            objectFit="cover"
            className="rounded-xl"
          />
        </div>
      )}

      <h1 className="text-2xl font-bold text-[#31327e]">{post.title}</h1>
      <p className="text-sm text-gray-500">{post.createdAt}</p>

      <div className="flex items-center gap-3 mt-2">
        <img
          src={post.author?.avatar || '/avatar.png'}
          alt={post.author?.name || 'Auteur'}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="text-sm">
          <p className="font-semibold">{post.author?.name}</p>
          <p className="text-gray-500">{post.author?.role}</p>
        </div>
      </div>

      <p className="text-gray-700 mt-4">{post.description}</p>

      {post.link && (
        <p className="text-sm text-blue-500 underline cursor-pointer hover:text-blue-700">
          🔗 <a href={post.link} target="_blank" rel="noopener noreferrer">{post.link}</a>
        </p>
      )}

      <div className="flex items-center gap-6 mt-6 text-sm">
        <button
          onClick={handleLike}
          className="flex items-center gap-1 text-gray-600 hover:text-[#31327e] transition"
        >
          {userLiked ? <FaHeart className="text-red-500" /> : <FaRegHeart />}
          <span>{likes}</span>
        </button>

        <div className="flex items-center gap-1 text-yellow-500">
          {Array.from({ length: 5 }).map((_, index) => (
            <button key={index} onClick={() => handleStar(index)}>
              {index < stars ? <FaStar /> : <FaRegStar />}
            </button>
          ))}
        </div>

        <button
          onClick={() => router.push(`/myforum/${post.id}/edit`)}
          className="ml-auto px-4 py-2 rounded-full bg-gradient-to-r from-[#68bddd] to-[#6f80ac] text-white flex items-center gap-2 font-medium shadow hover:shadow-lg transition-all duration-200 hover:scale-105"
        >
          <FaRegEdit className="text-white" />
          Modifier
        </button>
      </div>

      {/* 💬 Commentaires */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-[#31327e] mb-4">
          <FaCommentDots /> Commentaires
        </h3>

        {/* ✅ Champ commentaire markdown */}
        <div data-color-mode="light" className="mb-4 border border-gray-300 rounded-xl overflow-hidden bg-white">
          <MDEditor
            value={comment}
            onChange={setComment}
            preview="edit"
            height={200}
            className="!bg-white !shadow-none !rounded-xl"
          />
        </div>

        <button
          onClick={handleCommentSubmit}
          className="px-4 py-2 bg-gradient-to-r from-[#68bddd] to-[#6f80ac] text-white rounded-full font-semibold hover:shadow-md transition-all"
        >
          Publier
        </button>

        {/* Liste des commentaires */}
        <div className="mt-6 space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="bg-gray-50 rounded-xl p-4 text-sm text-gray-800 shadow-sm">
              <p className="font-medium text-[#31327e]">{c.author}</p>
              <p className="text-xs text-gray-500">{c.date}</p>
              <MarkdownPreview
                source={c.content}
                style={{
                  backgroundColor: 'transparent',
                  color: 'inherit',
                  padding: 0,
                  fontSize: '0.9rem',
                }}
                className="mt-2"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ✅ Corrige le fond noir par défaut */}
      <style jsx global>{`
        .wmde-markdown {
          background-color: transparent !important;
          color: inherit !important;
        }
        .wmde-markdown pre,
        .wmde-markdown code {
          background-color: transparent !important;
          color: inherit !important;
          box-shadow: none !important;
        }
      `}</style>
    </div>
  );
}
