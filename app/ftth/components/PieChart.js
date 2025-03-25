'use client';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PieChart() {
  const data = {
    labels: ['Atteint', 'Restant'],
    datasets: [
      {
        data: [75, 25],
        backgroundColor: ['#68bddd', '#d1d5db'],
        borderWidth: 1,
      },
    ],
  };

  return <Pie data={data} />;
}
