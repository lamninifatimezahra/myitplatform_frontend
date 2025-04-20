'use client';
import Image from "next/image";
import { FaUserCircle } from "react-icons/fa";

export default function PostCard({ post }) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 flex flex-col justify-between min-h-[370px] max-h-[370px] w-full">
      {/* Image */}
      {post.image && (
        <div className="w-full h-36 mb-3 overflow-hidden rounded-lg">
          <Image
            src={post.image}
            alt={post.title}
            width={400}
            height={140}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Titre + Description */}
      <div className="flex flex-col flex-1 justify-between">
        <div>
          <h3 className="font-semibold text-[15px] text-[#111827] mb-1">
            {post.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-3">{post.description}</p>
        </div>

        {/* Auteur */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <FaUserCircle className="text-lg text-gray-400" />
            <div>
              <div className="font-medium text-gray-700">{post.author.name}</div>
              <div>{post.author.role}</div>
            </div>
          </div>
          <span className="text-green-500 text-sm font-semibold">A+</span>
        </div>
      </div>
    </div>
  );
}
