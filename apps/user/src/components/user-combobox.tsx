"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { User } from "@db/client"
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons"
import { Button } from "@ui/components/ui/button"
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem
} from "@ui/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/ui/popover"
import { cn } from "@ui/lib/utils"

export function SelectUser({ users }: { users: User[] }) {
	const [open, setOpen] = useState(false)
	const [value, setValue] = useState("")

	const router = useRouter()

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-[200px] justify-between"
				>
					{value ? users.find(u => u.id === value)?.studentId : "Select Student..."}
					<CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[200px] p-0">
				<Command>
					<CommandInput placeholder="Search Student..." className="h-9" />
					<CommandEmpty>No student found.</CommandEmpty>
					<CommandGroup>
						{users.map(u => (
							<CommandItem
								key={u.studentId}
								value={u.id}
								onSelect={currentValue => {
									console.log("currentValue", currentValue)
									setValue(currentValue === value ? "" : currentValue)
									setOpen(false)
									router.push(`/chat/${currentValue}`)
								}}
							>
								{u.studentId}
								<CheckIcon
									className={cn(
										"ml-auto h-4 w-4",
										value === u.studentId ? "opacity-100" : "opacity-0"
									)}
								/>
							</CommandItem>
						))}
					</CommandGroup>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
