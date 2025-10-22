import Link from "next/link";

export default function ShopPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Shop</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Explore our collections across different sports and categories. Find
          the perfect merchandise for your favorite teams and leagues.
        </p>
      </div>

      {/* Sports Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
          <div className="h-64 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <span className="text-6xl">⚽</span>
          </div>
          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-2xl font-semibold mb-3">Football</h3>
            <p className="text-gray-600 mb-6 flex-grow">
              Premier League, La Liga, Serie A and more. Official jerseys and
              merchandise from the world&apos;s top football leagues.
            </p>
            <Link
              href="/shop/football"
              className="w-full bg-black text-white py-3 px-6 rounded hover:bg-gray-800 transition-colors text-center font-medium"
            >
              Shop Football
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
          <div className="h-64 bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <span className="text-6xl">🌍</span>
          </div>
          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-2xl font-semibold mb-3">International</h3>
            <p className="text-gray-600 mb-6 flex-grow">
              World Cup, Champions League, and national teams. Global football
              culture and international tournaments.
            </p>
            <Link
              href="/shop/international"
              className="w-full bg-black text-white py-3 px-6 rounded hover:bg-gray-800 transition-colors text-center font-medium"
            >
              Shop International
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
          <div className="h-64 bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <span className="text-6xl">🏀</span>
          </div>
          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-2xl font-semibold mb-3">NBA</h3>
            <p className="text-gray-600 mb-6 flex-grow">
              Official NBA team jerseys, player gear, and accessories from your
              favorite basketball teams and stars.
            </p>
            <Link
              href="/shop/nba"
              className="w-full bg-black text-white py-3 px-6 rounded hover:bg-gray-800 transition-colors text-center font-medium"
            >
              Shop NBA
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
          <div className="h-64 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
            <span className="text-6xl">🏈</span>
          </div>
          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-2xl font-semibold mb-3">NFL</h3>
            <p className="text-gray-600 mb-6 flex-grow">
              Authentic NFL team jerseys, player merchandise, and Super Bowl
              gear from all 32 teams.
            </p>
            <Link
              href="/shop/nfl"
              className="w-full bg-black text-white py-3 px-6 rounded hover:bg-gray-800 transition-colors text-center font-medium"
            >
              Shop NFL
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
          <div className="h-64 bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <span className="text-6xl">👕</span>
          </div>
          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-2xl font-semibold mb-3">Custom</h3>
            <p className="text-gray-600 mb-6 flex-grow">
              Design your own personalized jerseys, team uniforms, and custom
              merchandise with your own style.
            </p>
            <Link
              href="/shop/custom"
              className="w-full bg-black text-white py-3 px-6 rounded hover:bg-gray-800 transition-colors text-center font-medium"
            >
              Shop Custom
            </Link>
          </div>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-gray-100 rounded-lg shadow-md overflow-hidden flex flex-col h-full">
          <div className="h-64 bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
            <span className="text-6xl">🏆</span>
          </div>
          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-2xl font-semibold mb-3 text-gray-500">
              More Sports
            </h3>
            <p className="text-gray-500 mb-6 flex-grow">
              Additional sports categories coming soon. Stay tuned for more
              exciting merchandise options.
            </p>
            <div className="w-full bg-gray-300 text-gray-500 py-3 px-6 rounded text-center font-medium cursor-not-allowed">
              Coming Soon
            </div>
          </div>
        </div>
      </div>

      {/* Featured Collections */}
      <div className="bg-gray-50 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6">
          Featured Collections
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
              ⚽
            </div>
            <h3 className="text-lg font-semibold mb-2">Premier League</h3>
            <p className="text-gray-600 text-sm">
              England&apos;s top football league
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
              🏀
            </div>
            <h3 className="text-lg font-semibold mb-2">NBA Finals</h3>
            <p className="text-gray-600 text-sm">Championship merchandise</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
              🏈
            </div>
            <h3 className="text-lg font-semibold mb-2">Super Bowl</h3>
            <p className="text-gray-600 text-sm">NFL championship gear</p>
          </div>
        </div>
      </div>
    </div>
  );
}
