import { Inconsolata, Inter } from "next/font/google"

export const inter = Inter({
  variable: "--font-default",
  subsets: ["latin"],
  preload: true,
  display: "swap"
})

export const inconsolata = Inconsolata({
  variable: "--font-mono",
  subsets: ["latin"]
})

export const defaultFontMapper = {
  default: inter.variable,
  mono: inconsolata.variable
}
