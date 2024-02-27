"use client"

import Link from "next/link"
import { HydratedCourse } from "@/types"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@ui/components/table"
import { DataTableColumnHeader } from "@ui/components/table/column-header"
import { Button } from "@ui/components/ui/button"
import { Checkbox } from "@ui/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@ui/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@ui/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

export const columns: ColumnDef<HydratedCourse>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={value => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Name" />
    },
    cell: ({ row }) => {
      return (
        <div className="flex items-center space-x-2">
          <Link className="text-blue-9 hover:underline" href={`/courses/${row.original.id}`}>
            {row.original.name}
          </Link>
        </div>
      )
    }
  },
  {
    accessorKey: "courseSubject",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Course Subject" />
    },
    cell: ({ row }) => {
      return <span>{row.original.courseSubject ?? "--"}</span>
    }
  },
  {
    accessorKey: "courseNumber",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Course Number" />
    },
    cell: ({ row }) => {
      return <span>{row.original.courseNumber ?? "--"}</span>
    }
  },
  {
    accessorKey: "department",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Department" />
    },
    cell: ({ row }) => {
      return <span>{row.original.department?.name ?? "--"}</span>
    }
  },
  {
    accessorKey: "conditions",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Prerequisite Conditions" />
    },
    cell: ({ row }) => {
      return (
        <span>{row.original.conditions.length > 0 ? row.original.conditions.length : "n/a"}</span>
      )
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const course = row.original

      return (
        <Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(course.id)}>
                Copy course ID
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conditions for {course?.id}</DialogTitle>
              <DialogDescription></DialogDescription>
              <div className="space-y-6 p-4 max-h-[60vh] overflow-y-auto"></div>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )
    }
  }
]

export function CoursesTable({ courses, total }: { courses: HydratedCourse[]; total: number }) {
  return <DataTable data={courses} columns={columns} rowCount={total} />
}
