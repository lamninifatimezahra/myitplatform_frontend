'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import {
  FaArrowLeft, FaRegHeart, FaHeart, FaRegEdit, FaStar
} from 'react-icons/fa';
import MarkdownPreview from '@uiw/react-markdown-preview';
import fetchWithAuth from '@/utils/fetchWithAuth';
import CommentSection from './CommentSection';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

export default function PostDetail({ post }) {
  const router = useRouter();
  const [likes, setLikes] = useState(post.likes_count || 0);
  const [userLiked, setUserLiked] = useState(post.is_liked);
  const [views, setViews] = useState(post.views_count);
  const [likeUsers, setLikeUsers] = useState([]);
  const [showLikes, setShowLikes] = useState(false);

  useEffect(() => {
    async function trackView() {
      try {
        await fetchWithAuth(`https://api.606510.xyz/myforum/posts/${post.id}/track-view/`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch (err) {
        console.error("Erreur tracking vue:", err);
      }
    }
    trackView();
  }, [post.id]);

  const handleLike = async () => {
    try {
      const res = await fetchWithAuth(`https://api.606510.xyz/myforum/posts/${post.id}/like/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      setUserLiked(data.liked);
      setLikes((prev) => data.liked ? prev + 1 : prev - 1);
    } catch (err) {
      console.error("Erreur de like:", err);
    }
  };

  const fetchLikes = async () => {
    try {
      const res = await fetchWithAuth(`https://api.606510.xyz/myforum/posts/${post.id}/likes/`);
      const data = await res.json();
      setLikeUsers(data);
      setShowLikes(true);
    } catch (err) {
      console.error("Erreur lors du chargement des likes", err);
    }
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
      <p className="text-sm text-gray-500">{new Date(post.created_at).toLocaleString()}</p>

      <div className="flex items-center gap-3 mt-2">
        <Image
          src="/avatar.png"
          alt="Auteur"
          width={40}
          height={40}
          className="rounded-full"
        />
        <div className="text-sm">
          <p className="font-semibold">{post.author_name}</p>
          <p className="text-gray-500">{post.author_role}</p>
        </div>
      </div>

      <MarkdownPreview
        source={post.description}
        className="text-gray-800 mt-4"
        style={{ backgroundColor: 'transparent' }}
      />

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
          {userLiked ? <FaHeart className="text-red-500" /> : <FaRegHeart />} <span>{likes}</span>
        </button>

        <button
          onClick={fetchLikes}
          className="text-xs text-blue-500 underline"
        >
          Voir qui a liké
        </button>

        <div className="flex items-center gap-1 text-yellow-500">
          {Array.from({ length: 5 }).map((_, index) => (
            <FaStar key={index} />
          ))}
        </div>

        <span className="ml-auto text-xs text-gray-500">👁️ {views} vues</span>

        <button
          onClick={() => router.push(`/myforum/${post.id}/edit`)}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-[#68bddd] to-[#6f80ac] text-white flex items-center gap-2 font-medium shadow hover:shadow-lg transition-all duration-200 hover:scale-105"
        >
          <FaRegEdit className="text-white" /> Modifier
        </button>
      </div>

          {showLikes && (
      <div className="mt-4 p-4 bg-gray-50 rounded-xl border">
        <h4 className="font-semibold mb-2">👍 Liké par :</h4>
        <ul className="space-y-1 text-sm">
          {likeUsers.map((u, i) => (
            <li key={i} className="text-gray-700">• {u.user}</li>
          ))}
        </ul>
        <button
          onClick={() => setShowLikes(false)}
          className="mt-2 text-xs text-blue-500 underline"
        >
          Fermer
        </button>
      </div>
    )}

      <CommentSection postId={post.id} />

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
