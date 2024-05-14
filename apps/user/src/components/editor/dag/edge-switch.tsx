import { Switch } from "@ui/components/ui/switch"

interface EdgeSwitchProps {
  toggleSwitch: () => void
  checked: boolean
}

export function EdgeSwitch({ checked, toggleSwitch }: EdgeSwitchProps) {
  return (
    <form className="absolute z-10 top-0 left-2 w-[20rem] bg-red">
      <div className="flex items-center gap-1">
        <label className="text-sm font-medium text-slate-600" htmlFor="airplane-mode">
          Course Lines
        </label>
        <Switch
          className="data-[state=checked]:bg-blue-300"
          id="airplane-mode"
          checked={checked}
          onClick={() => toggleSwitch()}
        />
      </div>
    </form>
  )
}
