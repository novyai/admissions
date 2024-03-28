"use client"

import { getAllPrereqs } from "@repo/graph/graph"
import { CourseNode, StudentProfile } from "@repo/graph/types"
import { DataTable } from "@repo/ui/components/table"
import { DataTableColumnHeader } from "@repo/ui/components/table/column-header"
import { ColumnDef } from "@tanstack/react-table"

export const getScheduleTableColumns = (profile: StudentProfile): ColumnDef<CourseNode>[] => [
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Name" />
    },
    cell: ({ row }) => {
      return (
        <div>
          {row.original.name}
          <small className="text-gray-400">
            {" "}
            ({row.original.raw_course.courseSubject} {row.original.raw_course.courseNumber})
          </small>
        </div>
      )
    }
  },
  {
    id: "scheduled",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Scheduled" />
    },
    cell: ({ row }) => {
      const semesterScheduled = profile.semesters.findIndex(s =>
        s.map(c => c.id).includes(row.original.id)
      )
      return <div>{semesterScheduled + 1}</div>
    },
    accessorFn: row => {
      return profile.semesters.findIndex(s => s.map(c => c.id).includes(row.id)) + 1
    },
    enableSorting: true
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
          {getAllPrereqs(row.original.id, profile)
            .map(p => p.name)
            .join(", ")}
        </div>
      )
    }
  }
]

export const ScheduleTable = ({ profile }: { profile: StudentProfile }) => {
  const courses = Array.from(profile.graph.values())

  return (
    <DataTable
      columns={getScheduleTableColumns(profile)}
      data={courses}
      rowCount={courses.length}
    />
  )
}
