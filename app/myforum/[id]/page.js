"use client";

import { useParams } from "next/navigation";
import { posts } from "../data/posts";
import PostDetail from "../components/PostDetail";
import LayoutForum from "../components/LayoutForum";

export default function PostPage() {
  const { id } = useParams();
  const post = posts.find((p) => p.id === parseInt(id));

  if (!post)
    return (
      <LayoutForum>
        <p className="p-6">Post introuvable</p>
      </LayoutForum>
    );

  return (
    <LayoutForum>
      <PostDetail post={post} />
    </LayoutForum>
  );
}
