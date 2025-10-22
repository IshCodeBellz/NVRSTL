export default function CustomPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4 flex items-center justify-center">
          <span className="text-4xl mr-3">👕</span>
          Custom Collection
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Create your own unique style with our custom merchandise options.
          Personalize jerseys, accessories, and gear.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
          <div className="h-64 bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <span className="text-6xl">👕</span>
          </div>
          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-xl font-semibold mb-2">Custom Jerseys</h3>
            <p className="text-gray-600 mb-4 flex-grow">
              Design your own personalized jerseys with custom names and
              numbers.
            </p>
            <button className="w-full bg-black text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors mt-auto">
              Design Now
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
          <div className="h-64 bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <span className="text-6xl">👕</span>
          </div>
          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-xl font-semibold mb-2">Team Builder</h3>
            <p className="text-gray-600 mb-4 flex-grow">
              Create custom team uniforms and merchandise for your group.
            </p>
            <button className="w-full bg-black text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors mt-auto">
              Build Team
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
          <div className="h-64 bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
            <span className="text-6xl">👕</span>
          </div>
          <div className="p-6 flex flex-col flex-grow">
            <h3 className="text-xl font-semibold mb-2">Personalized Gear</h3>
            <p className="text-gray-600 mb-4 flex-grow">
              Add your personal touch to accessories and equipment.
            </p>
            <button className="w-full bg-black text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors mt-auto">
              Customize
            </button>
          </div>
        </div>
      </div>

      <div className="mt-12 bg-gray-50 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-4">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="text-lg font-semibold mb-2">Choose Your Base</h3>
            <p className="text-gray-600">
              Select from our range of jerseys, accessories, or gear.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="text-lg font-semibold mb-2">Customize Design</h3>
            <p className="text-gray-600">
              Add your name, number, colors, and personal touches.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="text-lg font-semibold mb-2">Order & Enjoy</h3>
            <p className="text-gray-600">
              Place your order and receive your unique custom merchandise.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
