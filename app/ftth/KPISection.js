'use client';

export default function KPISection() {
  return (
    <div className="grid grid-cols-4 gap-4 p-4">
      <div className="bg-white shadow-md p-4 rounded-lg">
        <p className="text-gray-500">Backlog FTTH J-1</p>
        <h2 className="text-2xl font-bold">75</h2>
        <p className="text-green-600">+18% +3 commandes</p>
      </div>
      <div className="bg-white shadow-md p-4 rounded-lg">
        <p className="text-gray-500">Dossiers traités</p>
        <h2 className="text-2xl font-bold">2548</h2>
        <p className="text-green-600">+59% +598 cette semaine</p>
      </div>
    </div>
  );
}
