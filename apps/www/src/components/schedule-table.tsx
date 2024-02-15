"use client"

import { CourseNode, getAllRequiredCourses, StudentProfile } from "@/db/graph"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@ui/components/table"
import { DataTableColumnHeader } from "@ui/components/table/column-header"
import { Checkbox } from "@ui/components/ui/checkbox"

export const ScheduleTable = ({
  graph,
  profile
}: {
  graph: Map<string, CourseNode>
  profile: StudentProfile
}) => {
  const columns: ColumnDef<CourseNode>[] = [
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
      id: "name",
      accessorKey: "name",
      header: ({ column }) => {
        return <DataTableColumnHeader column={column} title="Name" />
      },
      cell: ({ row }) => {
        return <div>{row.original.name}</div>
      }
    },
    {
      id: "earliestFinish",
      header: ({ column }) => {
        return <DataTableColumnHeader column={column} title="Earliest Finish" />
      },
      cell: ({ row }) => {
        return <div>{row.original.earliestFinish}</div>
      }
    },
    {
      id: "latestFinish",
      header: ({ column }) => {
        return <DataTableColumnHeader column={column} title="Latest Finish" />
      },
      cell: ({ row }) => {
        return <div>{row.original.latestFinish}</div>
      }
    },
    {
      id: "slack",
      accessorFn: row => row.latestFinish! - row.earliestFinish!,
      header: ({ column }) => {
        return <DataTableColumnHeader column={column} title="Slack" />
      },
      cell: ({ row }) => {
        return <div>{row.original.latestFinish! - row.original.earliestFinish!}</div>
      },
      enableSorting: true
    },
    {
      id: "fanOut",
      accessorKey: "fanOut",
      header: ({ column }) => {
        return <DataTableColumnHeader column={column} title="Fan Out" />
      },
      cell: ({ row }) => {
        return <div>{row.original.fanOut}</div>
      }
    },
    {
      id: "required for",
      header: ({ column }) => {
        return <DataTableColumnHeader column={column} title="Required To Take" />
      },
      cell: ({ row }) => {
        return (
          <div>
            {getAllRequiredCourses(row.original.id, graph)
              .filter(p => p !== row.original.id)
              .map(p => graph.get(p)?.name)
              .join(", ")}
          </div>
        )
      }
    }
    // {
    //   id: "prerequisites",
    //   header: ({ column }) => {
    //     return <DataTableColumnHeader column={column} title="Prerequisites" />
    //   },
    //   cell: ({ row }) => {
    //     return <div>{row.original.prerequisites.map(p => graph.get(p)?.name).join(", ")}</div>
    //   }
    // },
    // {
    //   id: "dependents",
    //   header: ({ column }) => {
    //     return <DataTableColumnHeader column={column} title="Dependents" />
    //   },
    //   cell: ({ row }) => {
    //     return <div>{row.original.dependents.map(p => graph.get(p)?.name).join(", ")}</div>
    //   }
    // }
  ]

  const courses = Array.from(graph.values())

  return <DataTable columns={columns} data={courses} rowCount={courses.length} />
}
