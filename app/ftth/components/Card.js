export default function Card({ title, value, percentage, description }) {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-gray-600 font-semibold">{title}</h2>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-green-500">{percentage}</p>
        <p className="text-gray-500">{description}</p>
      </div>
    );
  }
  