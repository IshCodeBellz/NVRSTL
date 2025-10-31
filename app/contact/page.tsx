import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | NVRSTL",
  description:
    "Get in touch with NVRSTL. Contact us for inquiries, support, or collaboration opportunities",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/80 z-10" />
        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-8xl font-bold font-carbon uppercase tracking-wider mb-8">
            CONTACT
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto">
            We&apos;d love to hear from you. Get in touch for inquiries,
            support, or collaboration opportunities
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-black px-8 py-4 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors font-carbon">
              Send Message
            </button>
            <button className="border border-white text-white px-8 py-4 font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors font-carbon">
              View FAQ
            </button>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold font-carbon uppercase tracking-wider text-center mb-16">
            Get in Touch
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            {/* Email */}
            <div className="text-center bg-gray-900 rounded-lg p-8">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-black">@</span>
              </div>
              <h3 className="text-2xl font-bold font-carbon uppercase tracking-wider mb-4">
                Email Us
              </h3>
              <p className="text-gray-400 mb-6">
                Send us an email and we&apos;ll respond within 24 hours
              </p>
              <div className="space-y-2">
                <p className="text-white font-carbon uppercase tracking-wider">
                  General: hello@nvrstl.co.uk
                </p>
                <p className="text-white font-carbon uppercase tracking-wider">
                  Support: support@nvrstl.co.uk
                </p>
                <p className="text-white font-carbon uppercase tracking-wider">
                  Press: press@nvrstl.co.uk
                </p>
              </div>
            </div>

            {/* Phone */}
            <div className="text-center bg-gray-900 rounded-lg p-8">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-black">📞</span>
              </div>
              <h3 className="text-2xl font-bold font-carbon uppercase tracking-wider mb-4">
                Call Us
              </h3>
              <p className="text-gray-400 mb-6">
                Speak directly with our customer service team
              </p>
              <div className="space-y-2">
                <p className="text-white font-carbon uppercase tracking-wider">
                  UK: +44 20 7123 4567
                </p>
                <p className="text-white font-carbon uppercase tracking-wider">
                  US: +1 555 123 4567
                </p>
                <p className="text-gray-400 text-sm">Mon-Fri: 9AM-6PM GMT</p>
              </div>
            </div>

            {/* Live Chat */}
            <div className="text-center bg-gray-900 rounded-lg p-8">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-black">💬</span>
              </div>
              <h3 className="text-2xl font-bold font-carbon uppercase tracking-wider mb-4">
                Live Chat
              </h3>
              <p className="text-gray-400 mb-6">
                Chat with us in real-time for instant support
              </p>
              <button className="bg-white text-black px-6 py-3 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors font-carbon">
                Start Chat
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 px-4 bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold font-carbon uppercase tracking-wider text-center mb-16">
            Send us a Message
          </h2>

          <form className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-bold font-carbon uppercase tracking-wider mb-2"
                >
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  className="w-full px-4 py-3 bg-white text-black placeholder-gray-500 rounded-none font-carbon uppercase tracking-wider"
                  placeholder="Enter your first name"
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-bold font-carbon uppercase tracking-wider mb-2"
                >
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  className="w-full px-4 py-3 bg-white text-black placeholder-gray-500 rounded-none font-carbon uppercase tracking-wider"
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-bold font-carbon uppercase tracking-wider mb-2"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="w-full px-4 py-3 bg-white text-black placeholder-gray-500 rounded-none font-carbon uppercase tracking-wider"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-bold font-carbon uppercase tracking-wider mb-2"
              >
                Subject
              </label>
              <select
                id="subject"
                name="subject"
                className="w-full px-4 py-3 bg-white text-black rounded-none font-carbon uppercase tracking-wider"
              >
                <option value="">Select a subject</option>
                <option value="general">General Inquiry</option>
                <option value="support">Customer Support</option>
                <option value="order">Order Question</option>
                <option value="return">Return/Exchange</option>
                <option value="collaboration">Collaboration</option>
                <option value="press">Press Inquiry</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-bold font-carbon uppercase tracking-wider mb-2"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={6}
                className="w-full px-4 py-3 bg-white text-black placeholder-gray-500 rounded-none font-carbon uppercase tracking-wider resize-none"
                placeholder="Tell us how we can help you..."
              ></textarea>
            </div>

            <div className="text-center">
              <button
                type="submit"
                className="bg-white text-black px-12 py-4 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors font-carbon"
              >
                Send Message
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Office Locations */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold font-carbon uppercase tracking-wider text-center mb-16">
            Our Offices
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* London Office */}
            <div className="bg-gray-900 rounded-lg p-8">
              <h3 className="text-2xl font-bold font-carbon uppercase tracking-wider mb-6">
                London Headquarters
              </h3>
              <div className="space-y-4 mb-8">
                <div>
                  <p className="text-gray-400 text-sm font-carbon uppercase tracking-wider mb-1">
                    Address
                  </p>
                  <p className="text-white">
                    123 Fashion Street
                    <br />
                    London, E1 6AN
                    <br />
                    United Kingdom
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm font-carbon uppercase tracking-wider mb-1">
                    Phone
                  </p>
                  <p className="text-white">+44 20 7123 4567</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm font-carbon uppercase tracking-wider mb-1">
                    Hours
                  </p>
                  <p className="text-white">
                    Monday - Friday: 9:00 AM - 6:00 PM
                    <br />
                    Saturday: 10:00 AM - 4:00 PM
                    <br />
                    Sunday: Closed
                  </p>
                </div>
              </div>
              <button className="bg-white text-black px-6 py-3 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors font-carbon">
                Get Directions
              </button>
            </div>

            {/* New York Office */}
            <div className="bg-gray-900 rounded-lg p-8">
              <h3 className="text-2xl font-bold font-carbon uppercase tracking-wider mb-6">
                New York Office
              </h3>
              <div className="space-y-4 mb-8">
                <div>
                  <p className="text-gray-400 text-sm font-carbon uppercase tracking-wider mb-1">
                    Address
                  </p>
                  <p className="text-white">
                    456 Style Avenue
                    <br />
                    New York, NY 10001
                    <br />
                    United States
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm font-carbon uppercase tracking-wider mb-1">
                    Phone
                  </p>
                  <p className="text-white">+1 555 123 4567</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm font-carbon uppercase tracking-wider mb-1">
                    Hours
                  </p>
                  <p className="text-white">
                    Monday - Friday: 9:00 AM - 6:00 PM
                    <br />
                    Saturday: 10:00 AM - 4:00 PM
                    <br />
                    Sunday: Closed
                  </p>
                </div>
              </div>
              <button className="bg-white text-black px-6 py-3 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors font-carbon">
                Get Directions
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold font-carbon uppercase tracking-wider text-center mb-16">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold font-carbon uppercase tracking-wider mb-3">
                What is your return policy?
              </h3>
              <p className="text-gray-300">
                We offer a 30-day return policy for all items in original
                condition. Items must be unworn, with tags attached, and in
                original packaging.
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold font-carbon uppercase tracking-wider mb-3">
                How long does shipping take?
              </h3>
              <p className="text-gray-300">
                Standard shipping takes 3-5 business days within the UK and 5-7
                business days for international orders. Express shipping is
                available for next-day delivery.
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold font-carbon uppercase tracking-wider mb-3">
                Do you offer international shipping?
              </h3>
              <p className="text-gray-300">
                Yes, we ship worldwide. International shipping rates and
                delivery times vary by destination. Check our shipping page for
                detailed information.
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold font-carbon uppercase tracking-wider mb-3">
                How can I track my order?
              </h3>
              <p className="text-gray-300">
                Once your order ships, you&apos;ll receive a tracking number via
                email. You can also track your order in your account dashboard.
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold font-carbon uppercase tracking-wider mb-3">
                Do you have a size guide?
              </h3>
              <p className="text-gray-300">
                Yes, we provide detailed size guides for all our products. You
                can find them on individual product pages or in our size guide
                section.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
