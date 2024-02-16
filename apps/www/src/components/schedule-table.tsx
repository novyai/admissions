"use client"

import { useEffect, useState } from "react"
import { getDegree } from "@/app/degrees/action"
import {
  CourseNode,
  getAllRequiredCourses,
  getUnmetCourseRequirements,
  StudentProfile
} from "@/db/graph"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@ui/components/table"
import { DataTableColumnHeader } from "@ui/components/table/column-header"
import { Checkbox } from "@ui/components/ui/checkbox"

export const ScheduleTable = ({ profile: initialProfile }: { profile: StudentProfile }) => {
  const [graph, setGraph] = useState<Map<string, CourseNode>>(new Map())
  const [profile, setProfile] = useState(initialProfile)

  useEffect(() => {
    getDegree(profile).then(setGraph)
  }, [profile])

  const columns: ColumnDef<CourseNode>[] = [
    {
      id: "select",
      header: ({ column }) => {
        return <DataTableColumnHeader column={column} title="Completed" />
      },
      cell: ({ row }) => (
        <Checkbox
          checked={
            profile.completedCourses.includes(row.original.id) ||
            profile.completedCourses
              .map(c => {
                const required = getAllRequiredCourses(c, graph)
                if (required.includes(row.original.id)) {
                  return true
                }
                false
              })
              .includes(true)
          }
          onCheckedChange={value => {
            if (value) {
              setProfile({
                ...profile,
                completedCourses: [...profile.completedCourses, row.original.id]
              })
            } else {
              setProfile({
                ...profile,
                completedCourses: profile.completedCourses.filter(p => p !== row.original.id)
              })
            }
          }}
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
      id: "unmet prereqs",
      header: ({ column }) => {
        return <DataTableColumnHeader column={column} title="Unmet Prerequisites" />
      },
      cell: ({ row }) => {
        return (
          <div>
            {getUnmetCourseRequirements(row.original.id, profile, graph)
              .filter(p => !profile.completedCourses.includes(p))
              .filter(p => p !== row.original.id)
              .map(p => graph.get(p)?.name)
              .join(", ")}
          </div>
        )
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
