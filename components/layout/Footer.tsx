import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-700 mt-12 py-10 text-sm bg-neutral-50 dark:bg-neutral-900">
      <div className="container mx-auto px-4 grid gap-8 grid-cols-2 md:grid-cols-4">
        <div>
          <h3 className="font-semibold mb-3 text-neutral-900 dark:text-white">
            Help & Information
          </h3>
          <ul className="space-y-1 text-neutral-600 dark:text-neutral-400">
            <li className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">
              Help
            </li>
            <li className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">
              <Link href="/tracking">Track order</Link>{" "}
            </li>
            <li className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">
              Delivery & returns
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-3 text-neutral-900 dark:text-white">
            About Us
          </h3>
          <ul className="space-y-1 text-neutral-600 dark:text-neutral-400">
            <li className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">
              About
            </li>
            <li className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">
              Careers
            </li>
            <li className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">
              Investors
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-3 text-neutral-900 dark:text-white">
            More From Us
          </h3>
          <ul className="space-y-1 text-neutral-600 dark:text-neutral-400">
            <li className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">
              Mobile apps
            </li>
            <li className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">
              Marketplace
            </li>
            <li className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">
              Gift vouchers
            </li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-3 text-neutral-900 dark:text-white">
            Shopping
          </h3>
          <ul className="space-y-1 text-neutral-600 dark:text-neutral-400">
            <li className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">
              Women
            </li>
            <li className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">
              Men
            </li>
            <li className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">
              Outlet
            </li>
          </ul>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          &copy; {new Date().getFullYear()} NVRSTL. Independent demo
          project.
        </p>
        <div className="flex gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">
            Privacy
          </span>
          <span className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">
            Terms
          </span>
          <span className="hover:text-neutral-900 dark:hover:text-white cursor-pointer transition-colors">
            Cookies
          </span>
        </div>
      </div>
    </footer>
  );
}
