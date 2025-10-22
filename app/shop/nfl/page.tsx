export default function NFLPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 flex items-center justify-center">
          <span className="text-4xl mr-3">🏈</span>
          NFL Collection
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Official NFL merchandise including jerseys, gear, and accessories from
          your favorite football teams.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
          <div className="h-64 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
            <span className="text-6xl">🏈</span>
          </div>
          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-xl font-semibold mb-2">Team Jerseys</h3>
            <p className="text-gray-600 mb-4 flex-grow">
              Authentic NFL team jerseys and uniforms from all 32 teams.
            </p>
            <button className="w-full bg-black text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors mt-auto">
              Shop Now
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
          <div className="h-64 bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
            <span className="text-6xl">🏈</span>
          </div>
          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-xl font-semibold mb-2">Player Gear</h3>
            <p className="text-gray-600 mb-4 flex-grow">
              Signature merchandise from NFL superstars and legends.
            </p>
            <button className="w-full bg-black text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors mt-auto">
              Shop Now
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
          <div className="h-64 bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
            <span className="text-6xl">🏈</span>
          </div>
          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-xl font-semibold mb-2">Super Bowl</h3>
            <p className="text-gray-600 mb-4 flex-grow">
              Championship merchandise and Super Bowl memorabilia.
            </p>
            <button className="w-full bg-black text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors mt-auto">
              Shop Now
            </button>
          </div>
        </div>
      </div>

      <div className="mt-12 bg-gray-50 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6">
          Popular NFL Teams
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { name: "Chiefs", color: "bg-red-600" },
            { name: "Bills", color: "bg-blue-600" },
            { name: "Cowboys", color: "bg-blue-500" },
            { name: "Packers", color: "bg-green-600" },
            { name: "Patriots", color: "bg-blue-700" },
            { name: "Steelers", color: "bg-yellow-500" },
            { name: "49ers", color: "bg-red-700" },
            { name: "Ravens", color: "bg-purple-600" },
            { name: "Dolphins", color: "bg-teal-500" },
            { name: "Giants", color: "bg-blue-800" },
            { name: "Jets", color: "bg-green-500" },
            { name: "Raiders", color: "bg-gray-800" },
          ].map((team) => (
            <div key={team.name} className="text-center">
              <div
                className={`w-16 h-16 ${team.color} rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto mb-2`}
              >
                {team.name.charAt(0)}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {team.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
