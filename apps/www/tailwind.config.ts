import sharedConfig from "@repo/tailwind-config/tailwind.config"
import type { Config } from "tailwindcss"

const config: Pick<Config, "content" | "presets"> = {
  content: ["../../packages/**/*.{js,ts,jsx,tsx}", "./src/**/*.{js,ts,jsx,tsx}"],
  presets: [sharedConfig]
}

export default config
