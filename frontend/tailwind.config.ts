import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F0F4FF",
        card: "#FFFFFF",
        primaryText: "#111111",
        secondaryText: "#8A8A8A",
        accentBlue: "#0A66FF",
        blackBtn: "#121212",
        successBg: "#DCF5E3",
        successText: "#1A7A2E",
        dangerBg: "#FFE0E0",
        dangerText: "#C52A2A",
      },
      borderRadius: {
        '20': '20px',
        '24': '24px',
        '28': '28px',
        '32': '32px',
      },
      boxShadow: {
        'soft': '0 4px 24px rgba(0, 0, 0, 0.04)',
        'soft-hover': '0 8px 32px rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
};
export default config;
