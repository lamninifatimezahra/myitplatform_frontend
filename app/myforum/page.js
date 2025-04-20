import LayoutForum from "./components/LayoutForum";
import ForumHome from "./components/ForumHome";

export default function MyForumPage() {
  return (
    <LayoutForum>
      <ForumHome /> {/* Ici on affiche uniquement le contenu central */}
    </LayoutForum>
  );
}
