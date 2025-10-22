import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-800 mt-12 py-16 text-sm bg-black">
      <div className="container mx-auto px-8 grid gap-8 grid-cols-2 md:grid-cols-4">
        <div>
          <h3 className="font-bold mb-4 text-white font-carbon uppercase tracking-wider">
            Help & Information
          </h3>
          <ul className="space-y-2 text-gray-400">
            <li className="hover:text-white cursor-pointer transition-colors font-carbon">
              Help
            </li>
            <li className="hover:text-white cursor-pointer transition-colors font-carbon">
              <Link href="/tracking">Track order</Link>{" "}
            </li>
            <li className="hover:text-white cursor-pointer transition-colors font-carbon">
              Delivery & returns
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-4 text-white font-carbon uppercase tracking-wider">
            About Us
          </h3>
          <ul className="space-y-2 text-gray-400">
            <li className="hover:text-white cursor-pointer transition-colors font-carbon">
              About
            </li>
            <li className="hover:text-white cursor-pointer transition-colors font-carbon">
              Careers
            </li>
            <li className="hover:text-white cursor-pointer transition-colors font-carbon">
              Investors
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-4 text-white font-carbon uppercase tracking-wider">
            More From Us
          </h3>
          <ul className="space-y-2 text-gray-400">
            <li className="hover:text-white cursor-pointer transition-colors font-carbon">
              Mobile apps
            </li>
            <li className="hover:text-white cursor-pointer transition-colors font-carbon">
              Marketplace
            </li>
            <li className="hover:text-white cursor-pointer transition-colors font-carbon">
              Gift vouchers
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-4 text-white font-carbon uppercase tracking-wider">
            Shopping
          </h3>
          <ul className="space-y-2 text-gray-400">
            <li className="hover:text-white cursor-pointer transition-colors font-carbon">
              Women
            </li>
            <li className="hover:text-white cursor-pointer transition-colors font-carbon">
              Men
            </li>
            <li className="hover:text-white cursor-pointer transition-colors font-carbon">
              Outlet
            </li>
          </ul>
        </div>
      </div>
      <div className="container mx-auto px-8 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-800 pt-8">
        <p className="text-sm text-gray-400 font-carbon">
          &copy; {new Date().getFullYear()} NVRSTL. Independent demo project.
        </p>
        <div className="flex gap-6 text-sm text-gray-400">
          <span className="hover:text-white cursor-pointer transition-colors font-carbon">
            Privacy
          </span>
          <span className="hover:text-white cursor-pointer transition-colors font-carbon">
            Terms
          </span>
          <span className="hover:text-white cursor-pointer transition-colors font-carbon">
            Cookies
          </span>
        </div>
      </div>
    </footer>
  );
}
