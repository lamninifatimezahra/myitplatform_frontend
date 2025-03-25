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
import GroupedBarChart from "./components/TicketsEntrantsSortants";
import RapportSortantsEntrants from "./components/RapportSortantsEntrants";
import TicketsReentrantsTable from "./components/TicketsReentrantsTable";
import TicketsEnCoursTable from "./components/TicketsEncoursTable"
import { ExportProvider } from "./components/ExportContext";


export default function HispeedDashboard() {
  return (
    <ExportProvider>
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="fixed h-screen w-64 overflow-y-auto bg-white shadow-md">
        <Sidebar />
      </div>

      {/* Contenu principal */}
      <div className="flex-1 ml-64 flex flex-col bg-gray-100">
        <Header />

        <main className="p-6 flex-1 space-y-6">
          {/* Ligne 1 : KPI Cards */}
          <div className="flex justify-center space-x-6">
            <KpiTicketsEntrants />
            <KpiCard />
            <KpiTicketsEnCours />
            <KpiReentrant />
          </div>

          {/* Ligne 2 : GroupedBarChart + TranticiteCriticite */}
          <div className="grid grid-cols-2 gap-6">
            <GroupedBarChart />
            <TranticiteCriticite />
          </div>

          {/* Ligne 3 : SlaAnciennete + ClientCoupeChart */}
          <div className="grid grid-cols-2 gap-6">
            <SlaAnciennete />
            <VolumeTicketsDivision />
          </div>

          {/* Ligne 4 : VolumeTicketsDivision + TauxReentrants */}
          <div className="grid grid-cols-2 gap-6">
            <RapportSortantsEntrants />
            <TauxReentrants />
          </div>

          {/* Ligne 5 : RapportSortantsEntrants + VolumeReentrant */}
          <div className="grid grid-cols-2 gap-6">
            <ClientCoupeChart />
            <VolumeReentrant />
          </div>

          {/* Ligne 6 : Table des tickets réentrants */}
          <div>
            <TicketsReentrantsTable />
            <TicketsEnCoursTable/>
          </div>
        </main>
      </div>
    </div>
    </ExportProvider>
  );
}
