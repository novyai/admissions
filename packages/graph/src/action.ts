"use server"

import { db } from "@repo/db"
import Graph from "graphology"
import { z } from "zod"

import { COURSE_PAYLOAD_QUERY, CourseGraph, CoursePayload } from "./course"
import { toCourseNode } from "./profile"
import { computeNodeStats } from "./stats"
import { BaseStudentProfile, CourseNode, StudentProfile } from "./types"

const blobSchema = z.object({
  profile: z.custom<BaseStudentProfile & { semesters: string[][] }>(),
  nodes: z.array(
    z.object({
      id: z.string(),
      position: z.object({
        x: z.number(),
        y: z.number()
      })
    })
  )
})

export async function getProfileFromSchedule(blob: string): Promise<StudentProfile> {
  const parsedBlob = blobSchema.safeParse(JSON.parse(blob))

  if (!parsedBlob.success) {
    throw new Error(parsedBlob.error.message)
  }

  const { profile, nodes } = parsedBlob.data

  const courseIds = [...nodes.map(n => n.id), ...profile.semesters.flat()]
  const uniqueCourseIds = [...new Set(courseIds)]

  const graph: CourseGraph = new Graph()

  const requiredCoursesData = await db.course.findMany({
    where: {
      id: {
        in: uniqueCourseIds
      }
    },
    ...COURSE_PAYLOAD_QUERY
  })

  const courseMap = new Map<string, CoursePayload>()

  requiredCoursesData.forEach(course => {
    courseMap.set(course.id, course)
  })

  requiredCoursesData.forEach(course => {
    courseMap.set(course.id, course)
  })

  computeNodeStats(graph, profile)

  const allCourses: CourseNode[] = graph.mapNodes((courseId, course) =>
    toCourseNode(graph, courseId, course)
  )

  const profileGraph = allCourses.reduce(
    (acc, course) => acc.set(course.id, course),
    new Map<string, CourseNode>()
  )

  if (profile.semesters.flat().length === 0) {
    throw new Error("No semesters found")
  }

  return {
    ...profile,
    // allCourses,
    graph: profileGraph,
    semesters: profile.semesters.map(s =>
      s.map(c => toCourseNode(graph, c, graph.getNodeAttributes(c)))
    )
  }
}
