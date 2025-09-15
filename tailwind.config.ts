// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-nunito)", "ui-sans-serif", "system-ui"],
            },
        },
    },
    plugins: [],
};
