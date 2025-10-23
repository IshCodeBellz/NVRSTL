import Link from "next/link";

export default function ShopPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 to-black py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white font-carbon mb-6">
              SHOP
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto font-carbon">
              Explore our collections across different sports and categories. Find
              the perfect merchandise for your favorite teams and leagues.
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <div className="container mx-auto px-4 py-10">

        {/* Sports Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col h-full border border-gray-700 hover:border-gray-600 transition-all duration-300">
            <div className="h-64 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <span className="text-6xl">⚽</span>
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <h3 className="text-2xl font-bold mb-3 text-white font-carbon">Football</h3>
              <p className="text-gray-300 mb-6 flex-grow font-carbon">
                Premier League, La Liga, Serie A and more. Official jerseys and
                merchandise from the world&apos;s top football leagues.
              </p>
              <Link
                href="/shop/football"
                className="w-full bg-white text-black py-3 px-6 rounded hover:bg-gray-100 transition-colors text-center font-bold font-carbon uppercase tracking-wider"
              >
                Shop Football
              </Link>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col h-full border border-gray-700 hover:border-gray-600 transition-all duration-300">
            <div className="h-64 bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <span className="text-6xl">🌍</span>
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <h3 className="text-2xl font-bold mb-3 text-white font-carbon">International</h3>
              <p className="text-gray-300 mb-6 flex-grow font-carbon">
                World Cup, Champions League, and national teams. Global football
                culture and international tournaments.
              </p>
              <Link
                href="/shop/international"
                className="w-full bg-white text-black py-3 px-6 rounded hover:bg-gray-100 transition-colors text-center font-bold font-carbon uppercase tracking-wider"
              >
                Shop International
              </Link>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col h-full border border-gray-700 hover:border-gray-600 transition-all duration-300">
            <div className="h-64 bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <span className="text-6xl">🏀</span>
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <h3 className="text-2xl font-bold mb-3 text-white font-carbon">NBA</h3>
              <p className="text-gray-300 mb-6 flex-grow font-carbon">
                Official NBA team jerseys, player gear, and accessories from your
                favorite basketball teams and stars.
              </p>
              <Link
                href="/shop/nba"
                className="w-full bg-white text-black py-3 px-6 rounded hover:bg-gray-100 transition-colors text-center font-bold font-carbon uppercase tracking-wider"
              >
                Shop NBA
              </Link>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col h-full border border-gray-700 hover:border-gray-600 transition-all duration-300">
            <div className="h-64 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
              <span className="text-6xl">🏈</span>
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <h3 className="text-2xl font-bold mb-3 text-white font-carbon">NFL</h3>
              <p className="text-gray-300 mb-6 flex-grow font-carbon">
                Authentic NFL team jerseys, player merchandise, and Super Bowl
                gear from all 32 teams.
              </p>
              <Link
                href="/shop/nfl"
                className="w-full bg-white text-black py-3 px-6 rounded hover:bg-gray-100 transition-colors text-center font-bold font-carbon uppercase tracking-wider"
              >
                Shop NFL
              </Link>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col h-full border border-gray-700 hover:border-gray-600 transition-all duration-300">
            <div className="h-64 bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <span className="text-6xl">👕</span>
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <h3 className="text-2xl font-bold mb-3 text-white font-carbon">Custom</h3>
              <p className="text-gray-300 mb-6 flex-grow font-carbon">
                Design your own personalized jerseys, team uniforms, and custom
                merchandise with your own style.
              </p>
              <Link
                href="/shop/custom"
                className="w-full bg-white text-black py-3 px-6 rounded hover:bg-gray-100 transition-colors text-center font-bold font-carbon uppercase tracking-wider"
              >
                Shop Custom
              </Link>
            </div>
          </div>

          {/* Coming Soon Card */}
          <div className="bg-gray-700 rounded-lg shadow-lg overflow-hidden flex flex-col h-full border border-gray-600">
            <div className="h-64 bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center">
              <span className="text-6xl">🏆</span>
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <h3 className="text-2xl font-bold mb-3 text-gray-300 font-carbon">
                More Sports
              </h3>
              <p className="text-gray-400 mb-6 flex-grow font-carbon">
                Additional sports categories coming soon. Stay tuned for more
                exciting merchandise options.
              </p>
              <div className="w-full bg-gray-600 text-gray-300 py-3 px-6 rounded text-center font-bold font-carbon uppercase tracking-wider cursor-not-allowed">
                Coming Soon
              </div>
            </div>
          </div>
      </div>

        {/* Featured Collections */}
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-center mb-6 text-white font-carbon">
            Featured Collections
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                ⚽
              </div>
              <h3 className="text-lg font-bold mb-2 text-white font-carbon">Premier League</h3>
              <p className="text-gray-300 text-sm font-carbon">
                England&apos;s top football league
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                🏀
              </div>
              <h3 className="text-lg font-bold mb-2 text-white font-carbon">NBA Finals</h3>
              <p className="text-gray-300 text-sm font-carbon">Championship merchandise</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                🏈
              </div>
              <h3 className="text-lg font-bold mb-2 text-white font-carbon">Super Bowl</h3>
              <p className="text-gray-300 text-sm font-carbon">NFL championship gear</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
