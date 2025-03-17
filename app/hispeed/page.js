import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import KpiCard from "./components/KPITicketTraite";
import KpiReentrant from "./components/KpiReentrant";
import KpiTicketsEntrants from "./components/KpiTicketsEntrants";
import TranticiteCriticite from "./components/TranticiteCriticite";

export default function HispeedDashboard() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header />

        {/* Contenu du Dashboard */}
        <main className="p-6 bg-gray-100">
          {/* Première ligne : Cartes KPI */}
          <div className="flex justify-center space-x-6">
            <KpiTicketsEntrants />
            <KpiCard />
            <KpiReentrant />
          </div>

          {/* Deuxième ligne : Graphiques */}
          <div className="mt-6 grid grid-cols-3 gap-6">
            {/* Colonne 1 : TranticiteCriticite */}
            <div className="col-span-1">
              <TranticiteCriticite />
            </div>

            {/* Colonne 2 : Autre graphique (à ajouter) */}
            <div className="col-span-1">
              {/* Ajoutez un autre composant de graphique ici */}
            </div>

            {/* Colonne 3 : Autre graphique (à ajouter) */}
            <div className="col-span-1">
              {/* Ajoutez un autre composant de graphique ici */}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}