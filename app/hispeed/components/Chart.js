import { Bar, Pie } from "react-chartjs-2";
import FilterBubble from "./FilterBubble";

export default function Chart({ title, data, type, selectedPeriod, setSelectedPeriod, selectedValues, setSelectedValues, rawData }) {
  const chartData = {
    labels: data.map(d => d.label),
    datasets: [{ data: data.map(d => d.value), backgroundColor: "#68bddd" }]
  };

  return (
    <div className="relative bg-white p-5 shadow-md rounded-lg">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>

      {/* Filtre en coin */}
      <FilterBubble 
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        selectedValues={selectedValues}
        setSelectedValues={setSelectedValues}
        data={rawData}
      />

      {type === "bar" ? <Bar data={chartData} /> : <Pie data={chartData} />}
    </div>
  );
}
