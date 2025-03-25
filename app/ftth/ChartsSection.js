'use client';
import PieChart from '../../components/PieChart';
import BarChart from '../../components/BarChart';

export default function ChartsSection() {
  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      <div className="bg-white shadow-md p-4 rounded-lg">
        <h3 className="text-gray-500">Objectif</h3>
        <PieChart />
      </div>
      <div className="bg-white shadow-md p-4 rounded-lg">
        <h3 className="text-gray-500">Vue d’ensemble du Backlog</h3>
        <BarChart />
      </div>
    </div>
  );
}
