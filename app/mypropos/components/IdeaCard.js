export default function IdeaCard({ idea }) {
    return (
      <div className="bg-white p-5 rounded-xl shadow border border-gray-200 hover:shadow-md transition">
        <h2 className="text-lg font-bold text-[#31327e]">{idea.title}</h2>
        <p className="text-sm text-gray-600 mt-2 line-clamp-3">{idea.description}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <span>👤 {idea.author_name}</span>
          <span
            className={`px-2 py-1 rounded-full font-semibold ${
              idea.status === 'pending'
                ? 'bg-yellow-100 text-yellow-700'
                : idea.status === 'accepted'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {idea.status}
          </span>
        </div>
      </div>
    );
  }
  