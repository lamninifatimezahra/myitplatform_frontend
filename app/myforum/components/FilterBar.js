export default function FilterBar() {
    const filters = ["Demandes d’aide", "Résolus", "Boîte à idées", "Par département", "Par activité"];
    return (
      <div>
        <input
          placeholder="Rechercher..."
          className="w-full p-3 rounded-xl bg-blue-50"
        />
        <div className="flex gap-2 mt-4 flex-wrap">
          {filters.map((f, i) => (
            <span
              key={i}
              className={`px-4 py-1 rounded-full text-sm font-medium ${
                i === 0 ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"
              }`}
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    );
  }
  