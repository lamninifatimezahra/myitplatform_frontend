'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { posts } from '../data/posts';
import PostCard from './PostCard';
import { FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

export default function ForumPosts() {
  const filters = ['Demandes d’aide', 'Résolus', 'Boîte à idées', 'Par département', 'Par activité'];
  const scrollRef = useRef(null);
  const [direction, setDirection] = useState('right');

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: dir === 'left' ? -350 : 350,
        behavior: 'smooth',
      });
    }
  };

  // Auto scroll toutes les 2 secondes avec inversion automatique du sens
  useEffect(() => {
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const container = scrollRef.current;
        const maxScrollLeft = container.scrollWidth - container.clientWidth;

        if (direction === 'right') {
          if (container.scrollLeft >= maxScrollLeft - 10) {
            setDirection('left');
          } else {
            scroll('right');
          }
        } else {
          if (container.scrollLeft <= 0) {
            setDirection('right');
          } else {
            scroll('left');
          }
        }
      }
    }, 2000); // ⏱️ toutes les 2 secondes

    return () => clearInterval(interval);
  }, [direction]);

  return (
    <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-gray-200 relative">
      {/* 🔹 Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">📰 Recent Posts</h2>
          <p className="text-gray-500 text-sm">Explorez les dernières contributions de la communauté.</p>
        </div>
        <Link
          href="/myforum/new"
          className="px-5 py-2.5 rounded-full text-white bg-gradient-to-r from-[#68bddd] to-[#6f80ac] font-medium shadow-md hover:shadow-lg transition-all"
        >
          + Create Post
        </Link>
      </div>

      {/* 🔍 Recherche + filtres */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#f0f7ff] border border-[#d0e5ff] text-sm focus:outline-none focus:ring-2 focus:ring-[#68bddd] transition"
          />
          <FaSearch className="absolute left-4 top-3.5 text-gray-400 text-sm" />
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          {filters.map((filter, idx) => (
            <button
              key={idx}
              className="bg-[#e6f0ff] hover:bg-[#d0e5ff] text-sm text-[#31327e] px-4 py-1.5 rounded-full font-medium transition-all"
            >
              {filter}
            </button>
          ))}
        </div>
      </motion.div>

      {/* 📦 Flèches + scroll zone */}
      <div className="relative mt-6">
        {/* Flèches manuelles */}
        <div className="absolute -top-10 right-0 flex gap-2">
          <button
            onClick={() => scroll('left')}
            className="bg-[#e8f3fd] hover:bg-[#d3e9ff] p-2 rounded-lg shadow text-[#31327e] transition"
          >
            <FaChevronLeft />
          </button>
          <button
            onClick={() => scroll('right')}
            className="bg-[#e8f3fd] hover:bg-[#d3e9ff] p-2 rounded-lg shadow text-[#31327e] transition"
          >
            <FaChevronRight />
          </button>
        </div>

        {/* Zone scrollable */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
        >
          {posts.length > 0 ? (
            posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="min-w-[320px] max-w-[320px] flex-shrink-0"
              >
                <PostCard post={post} />
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-400 w-full">
              Aucun post pour le moment. Créez le premier !
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
