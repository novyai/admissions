import type { Config } from "tailwindcss"

const config: Omit<Config, "content"> = {
  darkMode: ["class"],
  theme: {
    container: {
      center: true,
      screens: {
        "sm": "100%",
        "md": "100%",
        "lg": "100%",
        "xl": "100%",
        "2xl": "1300px"
      }
    },
    extend: {
      fontFamily: {
        default: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "serif"],
        inter: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-default)", "monospace"],
        monoBold: ["var(--font-mono-bold)", "monospace"],

        fusionaBold: ["var(--font-fusiona-bold)"],
        fusiona: ["var(--font-fusiona)"],
        fusionaBlack: ["var(--font-fusiona-black)"]
      },
      colors: {
        purps: "hsl(var(--purps))",
        grass: "hsl(var(--grass))",
        cheese: "hsl(var(--cheese))",
        beigey: "hsl(var(--beigey))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        link: "var(--colors-blue9)",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 }
        },
        "fade-in": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 }
        },
        "peak-up": {
          "0%": { bottom: "-100px" },
          "100%": { bottom: 0 }
        },
        "slide-out": {
          "0%": { transform: "translateY(0)", opacity: 1 },
          "100%": { transform: "translateY(300px)", opacity: 0 }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "spin-slow": "spin 3.5s linear infinite",
        "peak-up": "peak-up 0.4s ease-out",
        "slide-out": "slide-out 0.4s ease-out"
      }
    }
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    require("windy-radix-palette")
  ]
}
export default config
