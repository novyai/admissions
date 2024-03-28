"use client"

import { getAllPrereqs } from "@repo/graph/graph"
import { CourseNode, StudentProfile } from "@repo/graph/types"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@ui/components/table"
import { DataTableColumnHeader } from "@ui/components/table/column-header"

import { MdxContent } from "../mdxContent"

export const getScheduleTableColumns = (profile: StudentProfile): ColumnDef<CourseNode>[] => [
  {
    id: "Semester",
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
  // {
  //   id: "earliestFinish",
  //   header: ({ column }) => {
  //     return <DataTableColumnHeader column={column} title="Earliest Finish" />
  //   },
  //   cell: ({ row }) => {
  //     return <div>{row.original.earliestFinish}</div>
  //   }
  // },
  // {
  //   id: "latestFinish",
  //   header: ({ column }) => {
  //     return <DataTableColumnHeader column={column} title="Latest Finish" />
  //   },
  //   cell: ({ row }) => {
  //     return <div>{row.original.latestFinish}</div>
  //   }
  // },
  // {
  //   id: "slack",
  //   accessorFn: row => row.latestFinish! - row.earliestFinish!,
  //   header: ({ column }) => {
  //     return <DataTableColumnHeader column={column} title="Slack" />
  //   },
  //   cell: ({ row }) => {
  //     return <div>{row.original.latestFinish! - row.original.earliestFinish!}</div>
  //   },
  //   enableSorting: true
  // },
  // {
  //   id: "fanOut",
  //   accessorKey: "fanOut",
  //   header: ({ column }) => {
  //     return <DataTableColumnHeader column={column} title="Fan Out" />
  //   },
  //   cell: ({ row }) => {
  //     return <div>{row.original.fanOut}</div>
  //   }
  // },
  {
    id: "Prerequisites",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title="Prerequisites" />
    },
    cell: ({ row }) => {
      const courses = getAllPrereqs(row.original.id, profile).map(p => ` - ${p.name}`)

      if (courses.length > 0) {
        return <MdxContent content={courses.join("\n")} />
      }

      return <MdxContent content="No required courses" />
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
