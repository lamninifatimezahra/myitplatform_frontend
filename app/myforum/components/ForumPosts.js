'use client';

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import PostCard from './PostCard';
import { FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import fetchWithAuth from '@/utils/fetchWithAuth';

export default function ForumPostsCarousel() {
  const scrollRef = useRef(null);
  const [autoScrollDirection, setAutoScrollDirection] = useState('right');
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [lastManualScrollTime, setLastManualScrollTime] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tous');

  const categories = ['FTTH', 'HISPEED', 'FTTB', 'DSL', 'EARF', 'ARTHUIS'];
  const allCategories = ['Tous', ...categories];

  const scroll = (dir, manual = false) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -350 : 350, behavior: 'smooth' });
      if (manual) {
        setIsAutoScrolling(false);
        setLastManualScrollTime(Date.now());
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!scrollRef.current || !isAutoScrolling) return;

      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      if (scrollLeft + clientWidth >= scrollWidth - 10) setAutoScrollDirection('left');
      else if (scrollLeft <= 10) setAutoScrollDirection('right');

      scroll(autoScrollDirection);
    }, 3000);

    return () => clearInterval(interval);
  }, [autoScrollDirection, isAutoScrolling]);

  useEffect(() => {
    const timeout = setInterval(() => {
      if (!lastManualScrollTime) return;
      if (Date.now() - lastManualScrollTime > 7000) {
        setIsAutoScrolling(true);
        setLastManualScrollTime(null);
      }
    }, 2000);

    return () => clearInterval(timeout);
  }, [lastManualScrollTime]);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetchWithAuth('https://myit-backend-ed72239b4b8e.herokuapp.com/myforum/posts/');
        if (!res.ok) throw new Error('Erreur lors du chargement des posts');
        const data = await res.json();
        setPosts(data);
      } catch (err) {
        console.error('Erreur de chargement des posts :', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  const filteredPosts = posts.filter(post => {
    const matchTitle = post.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'Tous' || post.category === category;
    return matchTitle && matchCat;
  });

  return (
    <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-gray-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            📰 Recent Posts
          </h2>
          <p className="text-gray-500 text-sm">Explorez les dernières contributions de la communauté.</p>
        </div>
        <Link
          href="/myforum/new"
          className="px-5 py-2.5 rounded-full text-white bg-gradient-to-r from-[#68bddd] to-[#6f80ac] font-medium shadow-md hover:shadow-lg transition-all"
        >
          + Create Post
        </Link>
      </div>

      {/* Filtres + recherche */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Rechercher par titre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#f0f7ff] border border-[#d0e5ff] text-sm focus:outline-none focus:ring-2 focus:ring-[#68bddd] transition"
          />
          <FaSearch className="absolute left-4 top-3.5 text-gray-400 text-sm" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
          <div className="flex flex-wrap gap-2">
            {allCategories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  category === cat ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex gap-2 self-end sm:self-auto">
            <button onClick={() => scroll('left', true)} className="bg-[#e8f3fd] hover:bg-[#d3e9ff] p-2 rounded-lg shadow text-[#31327e] transition">
              <FaChevronLeft />
            </button>
            <button onClick={() => scroll('right', true)} className="bg-[#e8f3fd] hover:bg-[#d3e9ff] p-2 rounded-lg shadow text-[#31327e] transition">
              <FaChevronRight />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Posts */}      
      <div className="relative mt-6">
        {loading ? (
          <p className="text-center text-gray-400 py-12">Chargement des posts...</p>
        ) : (
          <div ref={scrollRef} className="flex gap-6 overflow-x-auto pb-2 scrollbar-hide scroll-smooth">
            {filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
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
              <div className="text-center py-12 text-gray-400 w-full">Aucun post correspondant.</div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
