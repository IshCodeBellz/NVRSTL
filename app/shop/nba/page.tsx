export default function NBAPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 flex items-center justify-center">
          <span className="text-4xl mr-3">🏀</span>
          NBA Collection
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Get official NBA jerseys, merchandise, and gear from your favorite
          teams and players.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
          <div className="h-64 bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <span className="text-6xl">🏀</span>
          </div>
          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-xl font-semibold mb-2">Team Jerseys</h3>
            <p className="text-gray-600 mb-4 flex-grow">
              Authentic NBA team jerseys and uniforms.
            </p>
            <button className="w-full bg-black text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors mt-auto">
              Shop Now
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
          <div className="h-64 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <span className="text-6xl">🏀</span>
          </div>
          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-xl font-semibold mb-2">Player Gear</h3>
            <p className="text-gray-600 mb-4 flex-grow">
              Signature merchandise from NBA superstars.
            </p>
            <button className="w-full bg-black text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors mt-auto">
              Shop Now
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
          <div className="h-64 bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
            <span className="text-6xl">🏀</span>
          </div>
          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-xl font-semibold mb-2">Accessories</h3>
            <p className="text-gray-600 mb-4 flex-grow">
              NBA branded accessories and collectibles.
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
