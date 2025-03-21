import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import KpiCard from "./components/KPITicketTraite";
import KpiReentrant from "./components/KpiReentrant";
import KpiTicketsEntrants from "./components/KpiTicketsEntrants";
import TranticiteCriticite from "./components/TranticiteCriticite";
import KpiTicketsEnCours from "./components/KpiTicketsEnCours";
import VolumeReentrant from "./components/VolumeReentrant";
import SlaAnciennete from "./components/SlaAnciennete";
import VolumeTicketsDivision from "./components/VolumeTicketsDivision";
import TauxReentrants from "./components/TauxReentrants";
import ClientCoupeChart from "./components/ClientCoupeChart";
import GroupedBarChart from "./components/GroupedBarChart";
import RapportSortantsEntrants from "./components/RapportSortantsEntrants";
import TicketsReentrantsTable from "./components/TicketsReentrantsTable";

export default function HispeedDashboard() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar fixe */}
      <div className="fixed h-screen w-64 overflow-y-auto bg-white shadow-md">
        <Sidebar />
      </div>
      {/* Contenu principal avec marge pour la Sidebar */}
      <div className="flex-1 ml-64 flex flex-col">
        {/* Header */}
        <Header />
        {/* Contenu du Dashboard */}
        <main className="p-6 bg-gray-100 flex-1">
          {/* Première ligne : Cartes KPI */}
          <div className="flex justify-center space-x-6">
            <KpiTicketsEntrants />
            <KpiCard />
            <KpiTicketsEnCours />
            <KpiReentrant />
          </div>
          {/* Deuxième ligne : Graphiques */}
          <div className="mt-6 grid grid-cols-2 gap-6">
            {/* Colonne 1 : TranticiteCriticite */}
            <div className="col-span-1">
              <TranticiteCriticite />
            </div>
            {/* Colonne 2 : SlaAnciennete */}
            <div className="col-span-1">
              <SlaAnciennete />
            </div>
          </div>
          {/* Troisième ligne : VolumeTicketsDivision et autres graphiques */}
          <div className="mt-6 grid grid-cols-3 gap-6">
            {/* Colonne 1 : VolumeTicketsDivision */}
            <div className="col-span-1">
              <VolumeTicketsDivision />
            </div>
            {/* Colonne 2 : TauxReentrants */}
            <div className="col-span-1">
              <TauxReentrants />
            </div>
            {/* Colonne 3 : VolumeReentrant */}
            <div className="col-span-1">
              <ClientCoupeChart />
            </div>
          </div>
          {/* Quatrième ligne : ClientCoupeChart et GroupedBarChart */}
          <div className="mt-6 grid grid-cols-2 gap-6">
            {/* Colonne 1 : ClientCoupeChart */}
            <div className="col-span-1">
              <RapportSortantsEntrants />
            </div>
            {/* Colonne 2 : GroupedBarChart */}
            <div className="col-span-1">
              <VolumeReentrant />
            </div>
          </div>
          {/* Cinquième ligne : Table des tickets réentrants */}
          <div className="mt-6">
            <TicketsReentrantsTable />
          </div>
        </main>
      </div>
    </div>
  );
}