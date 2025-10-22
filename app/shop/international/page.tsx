export default function InternationalPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 flex items-center justify-center">
          <span className="text-4xl mr-3">🌍</span>
          International Collection
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Explore merchandise from international teams, tournaments, and global
          football culture from around the world.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
          <div className="h-64 bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <span className="text-6xl">🌍</span>
          </div>
          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-xl font-semibold mb-2">World Cup</h3>
            <p className="text-gray-600 mb-4 flex-grow">
              Official FIFA World Cup merchandise and memorabilia.
            </p>
            <button className="w-full bg-black text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors mt-auto">
              Shop Now
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
          <div className="h-64 bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
            <span className="text-6xl">🌍</span>
          </div>
          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-xl font-semibold mb-2">Champions League</h3>
            <p className="text-gray-600 mb-4 flex-grow">
              European football&apos;s premier club competition gear.
            </p>
            <button className="w-full bg-black text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors mt-auto">
              Shop Now
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
          <div className="h-64 bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
            <span className="text-6xl">🌍</span>
          </div>
          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-xl font-semibold mb-2">National Teams</h3>
            <p className="text-gray-600 mb-4 flex-grow">
              Official jerseys and gear from national football teams.
            </p>
            <button className="w-full bg-black text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors mt-auto">
              Shop Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
