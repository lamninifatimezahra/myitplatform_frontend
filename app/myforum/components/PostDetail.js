import CommentSection from "./CommentSection";

export default function PostDetail({ post }) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h1 className="text-2xl font-bold">{post.title}</h1>
      <p className="text-sm text-gray-600 mb-2">{post.createdAt} – #{post.category}</p>
      <p>{post.description}</p>
      {post.link && (
        <a href={post.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline block mt-2">
          {post.link}
        </a>
      )}
      {post.image && <img src={post.image} className="mt-4 rounded-md" />}
      <CommentSection comments={post.comments} />
    </div>
  );
}
