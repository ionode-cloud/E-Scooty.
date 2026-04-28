/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                navy: {
                    DEFAULT: '#1F3A5F',
                    light: '#274C77',
                    dark: '#162B47',
                },
                saas: {
                    bg: '#F5F7FA',
                    card: '#FFFFFF',
                    border: '#E2E8F0',
                    text: '#1E293B',
                    muted: '#64748B',
                    accent: '#F59E0B',
                    'accent-hover': '#D97706',
                    success: '#10B981',
                    danger: '#EF4444',
                    warning: '#F59E0B',
                    info: '#3B82F6',
                },
                // Keep dark aliases for sensor page which stays dark
                dark: {
                    bg: '#0F172A',
                    card: '#1E293B',
                    border: '#334155',
                    text: '#F1F5F9',
                    muted: '#64748B',
                    accent: '#F59E0B',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'card': '0px 8px 25px rgba(0,0,0,0.08)',
                'card-hover': '0px 16px 40px rgba(0,0,0,0.12)',
                'sidebar': '4px 0 24px rgba(0,0,0,0.15)',
                'btn': '0 4px 14px rgba(245,158,11,0.35)',
            },
            borderRadius: {
                'xl2': '16px',
            }
        },
    },
    plugins: [],
}
