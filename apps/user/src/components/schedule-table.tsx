"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@ui/components/table"
import { DataTableColumnHeader } from "@ui/components/table/column-header"

import { getAllRequiredCourses } from "@graph/graph"

import { CourseNode, StudentProfile } from "@graph/types"

export const ScheduleTable = ({ profile }: { profile: StudentProfile }) => {
  const columns: ColumnDef<CourseNode>[] = [
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => {
        return <DataTableColumnHeader column={column} title="Name" />
      },
      cell: ({ row }) => {
        return <div>{row.original.name}
          <small className="text-gray-400"> ({row.original.raw_course.courseSubject} {row.original.raw_course.courseNumber})</small>
        </div>

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
    </>
  )
}

const StudentProfile = ({ profile }: { profile: StudentProfile }) => {
  return (
    <div>
      <h2>Student Profile</h2>
      <div>Time to Graduate: {profile.timeToGraduate}</div>
      <div>Total courses: {profile.graph.size}</div>
      <div>Course Per Semester: {profile.coursePerSemester}</div>
    </div>
  )
}
