"use client"

import { Button } from "@repo/ui/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@repo/ui/components/ui/dropdown-menu"
import { MenuIcon, Monitor, Moon, SunDim } from "lucide-react"
import { useTheme } from "next-themes"

const appearances = [
  {
    theme: "System",
    icon: <Monitor className="h-4 w-4" />
  },
  {
    theme: "Light",
    icon: <SunDim className="h-4 w-4" />
  },
  {
    theme: "Dark",
    icon: <Moon className="h-4 w-4" />
  }
]

export default function AppMenu() {
  const { theme: currentTheme, setTheme } = useTheme()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost">
            <MenuIcon className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56" collisionPadding={12}>
          <DropdownMenuLabel>App settings</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={currentTheme} onValueChange={setTheme}>
            {appearances.map(({ theme, icon }) => (
              <DropdownMenuRadioItem key={theme} value={theme.toLowerCase()}>
                <div className="flex items-center space-x-2">
                  <div className="p-1">{icon}</div>
                  <span>{theme}</span>
                </div>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
