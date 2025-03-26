import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import PageCentrale from "./components/PageCentrale";

export default function AdminPage() {
  return (
    <div className="flex bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <PageCentrale />
      </div>
    </div>
  );
}