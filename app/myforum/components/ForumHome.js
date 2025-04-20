'use client';

import ForumIntro from './ForumIntro';
import ForumStats from './ForumStats';
import ForumPosts from './ForumPosts';

export default function ForumHome() {
  return (
    <div className="space-y-12">
      <ForumIntro />
      <ForumStats />
      <ForumPosts />
    </div>
  );
}
