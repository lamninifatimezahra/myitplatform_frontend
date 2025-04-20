export default function CreatePostForm() {
    return (
      <form className="bg-white p-6 rounded-xl shadow space-y-4">
        <select className="w-full p-2 border rounded">
          <option>Select a category</option>
          <option>FTTH</option>
          <option>B2B</option>
        </select>
        <input placeholder="Title" className="w-full p-2 border rounded" />
        <textarea placeholder="Text" className="w-full p-2 border rounded" />
        <input type="file" className="w-full" />
        <input placeholder="Share a link (optional)" className="w-full p-2 border rounded" />
        <button className="bg-gradient-to-r from-[#68bddd] to-[#6f80ac] text-white px-4 py-2 rounded w-full">
          POST
        </button>
      </form>
    );
  }
  