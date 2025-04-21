'use client';

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import LayoutForum from "../components/LayoutForum"; // ✅ Corrigé
import PostDetail from "../components/PostDetail";    // ✅ Corrigé
import { posts as staticPosts } from "../data/posts"; // ✅ Corrigé

export default function PostPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);

  useEffect(() => {
    const dynamicPosts = JSON.parse(localStorage.getItem("myit_dynamic_posts") || "[]");
    const allPosts = [...dynamicPosts, ...staticPosts];
    const found = allPosts.find((p) => p.id === parseInt(id));
    setPost(found);
  }, [id]);

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
