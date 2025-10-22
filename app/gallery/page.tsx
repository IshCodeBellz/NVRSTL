import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gallery | NVRSTL",
  description:
    "Explore our visual gallery showcasing the latest fashion collections and style inspirations",
};

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/80 z-10" />
        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-8xl font-bold font-carbon uppercase tracking-wider mb-8">
            GALLERY
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Immerse yourself in our visual world of fashion, where style meets
            artistry
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-black px-8 py-4 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors font-carbon">
              View Collections
            </button>
            <button className="border border-white text-white px-8 py-4 font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors font-carbon">
              Latest Lookbook
            </button>
          </div>
        </div>
      </section>

      {/* Filter Section */}
      <section className="py-8 px-4 border-b border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-4">
            <button className="bg-white text-black px-6 py-3 font-bold uppercase tracking-wider font-carbon">
              All
            </button>
            <button className="border border-gray-600 text-white px-6 py-3 font-bold uppercase tracking-wider hover:border-white transition-colors font-carbon">
              Women
            </button>
            <button className="border border-gray-600 text-white px-6 py-3 font-bold uppercase tracking-wider hover:border-white transition-colors font-carbon">
              Men
            </button>
            <button className="border border-gray-600 text-white px-6 py-3 font-bold uppercase tracking-wider hover:border-white transition-colors font-carbon">
              Accessories
            </button>
            <button className="border border-gray-600 text-white px-6 py-3 font-bold uppercase tracking-wider hover:border-white transition-colors font-carbon">
              Campaigns
            </button>
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Gallery Item 1 */}
            <div className="group cursor-pointer">
              <div className="aspect-[3/4] bg-gray-900 rounded-lg overflow-hidden mb-4 group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">LOOK 01</span>
                </div>
              </div>
              <h3 className="text-lg font-bold font-carbon uppercase tracking-wider mb-1">
                Spring Collection
              </h3>
              <p className="text-gray-400 text-sm">Fresh and vibrant designs</p>
            </div>

            {/* Gallery Item 2 */}
            <div className="group cursor-pointer">
              <div className="aspect-[3/4] bg-gray-900 rounded-lg overflow-hidden mb-4 group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">LOOK 02</span>
                </div>
              </div>
              <h3 className="text-lg font-bold font-carbon uppercase tracking-wider mb-1">
                Minimalist Line
              </h3>
              <p className="text-gray-400 text-sm">Clean and timeless pieces</p>
            </div>

            {/* Gallery Item 3 */}
            <div className="group cursor-pointer">
              <div className="aspect-[3/4] bg-gray-900 rounded-lg overflow-hidden mb-4 group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-400 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">LOOK 03</span>
                </div>
              </div>
              <h3 className="text-lg font-bold font-carbon uppercase tracking-wider mb-1">
                Street Style
              </h3>
              <p className="text-gray-400 text-sm">Urban-inspired fashion</p>
            </div>

            {/* Gallery Item 4 */}
            <div className="group cursor-pointer">
              <div className="aspect-[3/4] bg-gray-900 rounded-lg overflow-hidden mb-4 group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-gradient-to-br from-gray-500 to-gray-300 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">LOOK 04</span>
                </div>
              </div>
              <h3 className="text-lg font-bold font-carbon uppercase tracking-wider mb-1">
                Evening Wear
              </h3>
              <p className="text-gray-400 text-sm">Sophisticated elegance</p>
            </div>

            {/* Gallery Item 5 */}
            <div className="group cursor-pointer">
              <div className="aspect-[3/4] bg-gray-900 rounded-lg overflow-hidden mb-4 group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-200 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">LOOK 05</span>
                </div>
              </div>
              <h3 className="text-lg font-bold font-carbon uppercase tracking-wider mb-1">
                Casual Chic
              </h3>
              <p className="text-gray-400 text-sm">Effortless style</p>
            </div>

            {/* Gallery Item 6 */}
            <div className="group cursor-pointer">
              <div className="aspect-[3/4] bg-gray-900 rounded-lg overflow-hidden mb-4 group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-black">LOOK 06</span>
                </div>
              </div>
              <h3 className="text-lg font-bold font-carbon uppercase tracking-wider mb-1">
                Work Wear
              </h3>
              <p className="text-gray-400 text-sm">Professional and stylish</p>
            </div>

            {/* Gallery Item 7 */}
            <div className="group cursor-pointer">
              <div className="aspect-[3/4] bg-gray-900 rounded-lg overflow-hidden mb-4 group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-50 flex items-center justify-center">
                  <span className="text-2xl font-bold text-black">LOOK 07</span>
                </div>
              </div>
              <h3 className="text-lg font-bold font-carbon uppercase tracking-wider mb-1">
                Weekend Vibes
              </h3>
              <p className="text-gray-400 text-sm">Relaxed and comfortable</p>
            </div>

            {/* Gallery Item 8 */}
            <div className="group cursor-pointer">
              <div className="aspect-[3/4] bg-gray-900 rounded-lg overflow-hidden mb-4 group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-white flex items-center justify-center">
                  <span className="text-2xl font-bold text-black">LOOK 08</span>
                </div>
              </div>
              <h3 className="text-lg font-bold font-carbon uppercase tracking-wider mb-1">
                Statement Pieces
              </h3>
              <p className="text-gray-400 text-sm">Bold and distinctive</p>
            </div>
          </div>

          {/* Load More Button */}
          <div className="text-center mt-16">
            <button className="bg-white text-black px-8 py-4 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors font-carbon">
              Load More
            </button>
          </div>
        </div>
      </section>

      {/* Featured Campaign */}
      <section className="py-20 px-4 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold font-carbon uppercase tracking-wider mb-6">
                Featured Campaign
              </h2>
              <h3 className="text-2xl font-bold font-carbon uppercase tracking-wider mb-4 text-gray-300">
                &ldquo;Urban Renaissance&rdquo;
              </h3>
              <p className="text-gray-300 text-lg mb-8">
                Our latest campaign explores the intersection of urban culture
                and high fashion, featuring bold designs that celebrate
                individuality and self-expression in the modern cityscape.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span className="text-gray-300">
                    Shot in downtown locations
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span className="text-gray-300">
                    Featuring diverse models
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span className="text-gray-300">Sustainable materials</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span className="text-gray-300">Limited edition pieces</span>
                </div>
              </div>
              <button className="bg-white text-black px-8 py-4 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors font-carbon">
                View Campaign
              </button>
            </div>

            <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-500 flex items-center justify-center">
                <span className="text-6xl font-bold text-white">CAMPAIGN</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Behind the Scenes */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold font-carbon uppercase tracking-wider text-center mb-16">
            Behind the Scenes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="aspect-square bg-gray-900 rounded-lg overflow-hidden mb-6">
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">PHOTO</span>
                </div>
              </div>
              <h3 className="text-xl font-bold font-carbon uppercase tracking-wider mb-2">
                Photography
              </h3>
              <p className="text-gray-400">
                Capturing the essence of our designs through expert lens work
              </p>
            </div>

            <div className="text-center">
              <div className="aspect-square bg-gray-900 rounded-lg overflow-hidden mb-6">
                <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-500 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">STYLE</span>
                </div>
              </div>
              <h3 className="text-xl font-bold font-carbon uppercase tracking-wider mb-2">
                Styling
              </h3>
              <p className="text-gray-400">
                Creating compelling looks that tell a story
              </p>
            </div>

            <div className="text-center">
              <div className="aspect-square bg-gray-900 rounded-lg overflow-hidden mb-6">
                <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-400 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">MAKEUP</span>
                </div>
              </div>
              <h3 className="text-xl font-bold font-carbon uppercase tracking-wider mb-2">
                Beauty
              </h3>
              <p className="text-gray-400">
                Enhancing natural beauty with artistic flair
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
