"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { HydratedStudent } from "@/types"
import { DegreeData } from "@db/client"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@ui/components/table"
import { DataTableColumnHeader } from "@ui/components/table/column-header"
import { Button } from "@ui/components/ui/button"
import { Checkbox } from "@ui/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@ui/components/ui/dropdown-menu"
import { format } from "date-fns"
import { MoreHorizontal } from "lucide-react"

function getMostRecentDegree(degrees: DegreeData[]) {
  if (!degrees || degrees.length === 0) {
    return null
  }

  return degrees.reduce((mostRecent, current) => {
    // Assuming degreeTerm is a string that can be compared
    return mostRecent.degreeTerm > current.degreeTerm ? mostRecent : current
  })
}

export const columns: ColumnDef<HydratedStudent>[] = [
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
      const user = row.original?.user
      const firstName = user?.firstName ?? null
      const lastName = user?.lastName ?? null
      const email = user?.email ?? null

      const displayName =
        firstName || lastName ? `${firstName} ${lastName}` : email ?? "Anonymous user"

      return (
        <div className="flex items-center space-x-2">
          <Link
            className="text-blue-9 hover:underline"
            href={`/students/${row.original.studentId}`}
          >
            {displayName}
          </Link>
        </div>
      )
    }
  },
  {
    accessorKey: "degreeCode",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Degree Code" />
    },
    cell: ({ row }) => {
      const degrees = row.original?.degreeData ?? []
      const mostRecentDegree = getMostRecentDegree(degrees) // Implement this function

      return <span>{mostRecentDegree ? mostRecentDegree.degreeCode : "--"}</span>
    }
  },
  {
    accessorKey: "degreeStatus",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Degree Status" />
    },
    cell: ({ row }) => {
      const degrees = row.original?.degreeData ?? []
      const mostRecentDegree = getMostRecentDegree(degrees) // Implement this function

      return <span>{mostRecentDegree ? mostRecentDegree.degreeStatus : "--"}</span>
    }
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Email" />
    },
    cell: ({ row }) => {
      const user = row.original?.user
      const email = user?.email ?? null

      return (
        <div className="flex items-center space-x-2">
          <span>{email ?? "--"}</span>
        </div>
      )
    }
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="CreatedAt" />
    },
    cell: ({ row }) => {
      const user = row.original.user

      return (
        <div className="flex items-center justify-center">
          <span>{format(new Date(user.createdAt), "d/MM/yyyy")}</span>
        </div>
      )
    }
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Last updated" />
    },
    cell: ({ row }) => {
      const user = row.original.user

      return (
        <div className="flex items-center justify-center">
          <span>{format(user.updatedAt, "d/MM/yyyy")}</span>
        </div>
      )
    }
  },
  {
    id: "actions",
    cell: function Cell({ row }) {
      const student = row.original
      const params = useSearchParams()
      const searchParams = new URLSearchParams(params.toString())
      searchParams.set("showTranscript", student.id)

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(student.id)}>
              Copy user ID
            </DropdownMenuItem>

            <DropdownMenuItem>
              <Link href={`/students?${searchParams.toString()}`}>View Transcript</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  }
]

export function StudentsTable({ students, total }: { students: HydratedStudent[]; total: number }) {
  return (
    <div>
      <DataTable data={students} columns={columns} rowCount={total} />
    </div>
  )
}
