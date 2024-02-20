"use client"

import {
  CourseNode,
  getAllRequiredCourses,
  StudentProfile
} from "@/db/graph"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@ui/components/table"
import { DataTableColumnHeader } from "@ui/components/table/column-header"

export const ScheduleTable = ({ profile }: { profile: StudentProfile }) => {
  const columns: ColumnDef<CourseNode>[] = [
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
    // {
    //   id: "unmet prereqs",
    //   header: ({ column }) => {
    //     return <DataTableColumnHeader column={column} title="Unmet Prerequisites" />
    //   },
    //   cell: ({ row }) => {
    //     return (
    //       <div>
    //         {getUnmetCourseRequirements(row.original.id, profile)
    //           .filter(
    //             p =>
    //               !profile.semesters
    //                 .flat()
    //                 .map(c => c.id)
    //                 .includes(p)
    //           )
    //           .filter(p => p !== row.original.id)
    //           .map(p => profile.graph.get(p)?.name)
    //           .join(", ")}
    //       </div>
    //     )
    //   }
    // },
    {
      id: "required for",
      header: ({ column }) => {
        return <DataTableColumnHeader column={column} title="Required To Take" />
      },
      cell: ({ row }) => {
        return (
          <div>
            {getAllRequiredCourses(row.original.id, profile.graph)
              .filter(p => p !== row.original.id)
              .map(p => profile.graph.get(p)?.name)
              .join(", ")}
          </div>
        )
      }
    }
  ]

  const courses = Array.from(profile.graph.values())

  return (
    <>
      <StudentProfile profile={profile} />
      <DataTable columns={columns} data={courses} rowCount={courses.length} />
      <ScheduleChat profile={profile} />
    </>
  )
}


const StudentProfile = ({ profile }: { profile: StudentProfile }) => {
  return (
    <div>
      <h2>Student Profile</h2>
      <div>Time to Graduate: {profile.timeToGraduate}</div>
      <div>Course Per Semester: {profile.coursePerSemester}</div>
    </div>
  )
}


const ScheduleChat = ({ profile }: { profile: StudentProfile }) => {

  return <p>
    This is a chat about the schedule
  </p>
}