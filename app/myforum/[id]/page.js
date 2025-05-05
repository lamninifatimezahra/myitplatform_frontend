'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import LayoutForum from '../components/LayoutForum';
import PostDetail from '../components/PostDetail';
import fetchWithAuth from '@/utils/fetchWithAuth';

export default function PostPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetchWithAuth(`http://127.0.0.1:8000/myforum/posts/${id}/`);
        if (!res.ok) throw new Error('Erreur lors du chargement du post');
        const data = await res.json();
        setPost(data);
      } catch (err) {
        console.error('Erreur :', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <LayoutForum>
        <div className="p-6 text-center text-gray-500">Chargement...</div>
      </LayoutForum>
    );
  }

  if (!post) {
    return (
      <LayoutForum>
        <div className="p-6 text-center text-gray-500">Post introuvable.</div>
      </LayoutForum>
    );
  }

  return (
    <LayoutForum>
      <PostDetail post={post} />
    </LayoutForum>
  );
}
