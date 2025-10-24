import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discover | NVRSTL",
  description:
    "Discover the latest trends, collections, and fashion insights at NVRSTL",
};

export default function DiscoverPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/80 z-10" />
        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-8xl font-bold font-carbon uppercase tracking-wider mb-8">
            COMING SOON 🔥 ...
          </h1>
        </div>
      </section>

      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/80 z-10" />
        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-8xl font-bold font-carbon uppercase tracking-wider mb-8">
            DISCOVER
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Explore the world of fashion through our curated collections, trend
            insights, and exclusive content
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-black px-8 py-4 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors font-carbon">
              Explore Collections
            </button>
            <button className="border border-white text-white px-8 py-4 font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors font-carbon">
              View Trends
            </button>
          </div>
        </div>
      </section>

      {/* Featured Collections */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold font-carbon uppercase tracking-wider text-center mb-16">
            Featured Collections
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Collection 1 */}
            <div className="group cursor-pointer">
              <div className="aspect-square bg-gray-900 rounded-lg overflow-hidden mb-4 group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">SS25</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold font-carbon uppercase tracking-wider mb-2">
                Spring Summer 2025
              </h3>
              <p className="text-gray-400 mb-4">
                Fresh designs and vibrant colors for the new season
              </p>
              <button className="text-white border-b border-white pb-1 hover:border-gray-400 transition-colors font-carbon uppercase tracking-wider">
                View Collection
              </button>
            </div>

            {/* Collection 2 */}
            <div className="group cursor-pointer">
              <div className="aspect-square bg-gray-900 rounded-lg overflow-hidden mb-4 group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-500 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">MIN</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold font-carbon uppercase tracking-wider mb-2">
                Minimalist Essentials
              </h3>
              <p className="text-gray-400 mb-4">
                Clean lines and timeless pieces for everyday wear
              </p>
              <button className="text-white border-b border-white pb-1 hover:border-gray-400 transition-colors font-carbon uppercase tracking-wider">
                View Collection
              </button>
            </div>

            {/* Collection 3 */}
            <div className="group cursor-pointer">
              <div className="aspect-square bg-gray-900 rounded-lg overflow-hidden mb-4 group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-400 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">EDGE</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold font-carbon uppercase tracking-wider mb-2">
                Street Edge
              </h3>
              <p className="text-gray-400 mb-4">
                Bold designs and urban-inspired fashion
              </p>
              <button className="text-white border-b border-white pb-1 hover:border-gray-400 transition-colors font-carbon uppercase tracking-wider">
                View Collection
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trend Insights */}
      <section className="py-20 px-4 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold font-carbon uppercase tracking-wider text-center mb-16">
            Trend Insights
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold font-carbon uppercase tracking-wider mb-6">
                Fashion Forward
              </h3>
              <p className="text-gray-300 text-lg mb-6">
                Stay ahead of the curve with our expert analysis of emerging
                trends, seasonal forecasts, and style predictions from the
                fashion capitals of the world.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span className="text-gray-300">
                    Sustainable Fashion Movement
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span className="text-gray-300">Tech-Integrated Apparel</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span className="text-gray-300">Gender-Fluid Design</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span className="text-gray-300">Vintage Revival</span>
                </div>
              </div>
            </div>

            <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-500 flex items-center justify-center">
                <span className="text-6xl font-bold text-white">TREND</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Style Guides */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold font-carbon uppercase tracking-wider text-center mb-16">
            Style Guides
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-900 rounded-lg p-8">
              <h3 className="text-2xl font-bold font-carbon uppercase tracking-wider mb-4">
                Office Chic
              </h3>
              <p className="text-gray-400 mb-6">
                Professional yet stylish outfits for the modern workplace
              </p>
              <button className="bg-white text-black px-6 py-3 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors font-carbon">
                View Guide
              </button>
            </div>

            <div className="bg-gray-900 rounded-lg p-8">
              <h3 className="text-2xl font-bold font-carbon uppercase tracking-wider mb-4">
                Weekend Casual
              </h3>
              <p className="text-gray-400 mb-6">
                Comfortable and trendy looks for your days off
              </p>
              <button className="bg-white text-black px-6 py-3 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors font-carbon">
                View Guide
              </button>
            </div>

            <div className="bg-gray-900 rounded-lg p-8">
              <h3 className="text-2xl font-bold font-carbon uppercase tracking-wider mb-4">
                Evening Elegance
              </h3>
              <p className="text-gray-400 mb-6">
                Sophisticated outfits for special occasions
              </p>
              <button className="bg-white text-black px-6 py-3 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors font-carbon">
                View Guide
              </button>
            </div>

            <div className="bg-gray-900 rounded-lg p-8">
              <h3 className="text-2xl font-bold font-carbon uppercase tracking-wider mb-4">
                Street Style
              </h3>
              <p className="text-gray-400 mb-6">
                Urban-inspired looks for the fashion-forward
              </p>
              <button className="bg-white text-black px-6 py-3 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors font-carbon">
                View Guide
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-20 px-4 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold font-carbon uppercase tracking-wider mb-8">
            Stay Updated
          </h2>
          <p className="text-xl text-gray-300 mb-12">
            Get the latest fashion insights, trend reports, and exclusive
            content delivered to your inbox
          </p>

          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 bg-white text-black placeholder-gray-500 rounded-none font-carbon uppercase tracking-wider"
            />
            <button className="bg-white text-black px-8 py-3 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors font-carbon">
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
/*  

*/
