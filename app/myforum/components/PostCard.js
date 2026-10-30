'use client';

import Image from "next/image";
import Link from "next/link";
import { FaUserCircle } from "react-icons/fa";
import { motion } from "framer-motion";
import MarkdownPreview from "@uiw/react-markdown-preview";

export default function PostCard({ post }) {
  return (
    <Link href={`/myforum/${post.id}`} className="focus:outline-none">
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="bg-white rounded-2xl shadow-md border border-gray-200 p-4 flex flex-col justify-between min-h-[370px] max-h-[370px] w-full hover:shadow-xl transition-all cursor-pointer"
      >
        {/* Image */}
        {post.image && (
          <div className="w-full h-36 mb-3 overflow-hidden rounded-lg">
            <Image
              src={post.image}
              alt={post.title}
              width={400}
              height={140}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        {/* Titre + Description */}
        <div className="flex flex-col flex-1 justify-between">
          <div>
            <h3 className="font-semibold text-[16px] text-[#111827] mb-1 line-clamp-2">
              {post.title}
            </h3>
            <div className="text-sm text-gray-600 line-clamp-3 prose prose-sm max-w-none">
              <MarkdownPreview
                source={post.description}
                wrapperElement={{ 'data-color-mode': 'light' }}
                style={{
                  backgroundColor: 'transparent',
                  fontSize: '0.875rem',
                  padding: 0,
                  margin: 0,
                }}
              />
            </div>
          </div>

          {/* Auteur */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FaUserCircle className="text-lg text-gray-400" />
              <div className="leading-snug">
                <div className="font-medium text-gray-700">{post.author_name}</div>
                <div className="text-xs">{post.author_role}</div>
              </div>
            </div>
            <span className="bg-[#e6f7e9] text-green-600 text-xs font-bold px-2 py-0.5 rounded-full">
              A+
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
