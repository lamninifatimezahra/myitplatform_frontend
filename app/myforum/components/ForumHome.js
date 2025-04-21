'use client';

import ForumIntro from './ForumIntro';
import ForumStats from './ForumStats';
import ForumPosts from './ForumPosts';

export default function ForumHome() {
  return (
    <div className="pt-[10px] space-y-12 px-4 md:px-6">
      <ForumIntro />
      <ForumStats />
      <ForumPosts />
    </div>
  );
}
