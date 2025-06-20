import React, { useEffect, useState } from "react";

/**
 * Footer Component - Displays across all screens
 * Shows developer info and contact details
 */
function Footer() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => setVisible(true), 100);
        return () => clearTimeout(timeout);
    }, []);

    return (
        <footer
            className={`${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            } transform transition-all duration-700 ease-out bg-gradient-to-r from-[#0f2027] via-[#203a43] to-[#2c5364] text-gray-300 text-xs py-3 px-4 text-center shadow-inner mt-auto`}
        >
            <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-6 max-w-screen-xl mx-auto">
        <span className="whitespace-nowrap">
          Designed by <span className="font-semibold text-white">Sai Kowshik Ananthula</span>
        </span>
                <span className="hidden sm:inline-block">|</span>
                <span className="whitespace-nowrap">Software Dev @ <span className="text-blue-400 font-medium">IBM</span></span>
                <span className="hidden sm:inline-block">|</span>
                <a
                    href="mailto:askowshik@outlook.com"
                    className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
                >
                    ✉️ askowshik@outlook.com
                </a>
                <span className="hidden sm:inline-block">|</span>
                <a
                    href="https://saikowshik007.github.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
                >
                    🌐 saikowshik007.github.io
                </a>
                <span className="hidden sm:inline-block">|</span>
                <span>© {new Date().getFullYear()} Expense Tracker</span>
            </div>
        </footer>
    );
}

export default Footer;