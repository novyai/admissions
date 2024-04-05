"use server"

import { db } from "@repo/db"
import Graph from "graphology"
import { z } from "zod"

import { addCourseToGraph, computeNodeStats, CourseGraph, toCourseNode } from "./profile"
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
  const graph: CourseGraph = new Graph()

  const courseIds = [...nodes.map(n => n.id), ...profile.semesters.flat()]
  const uniqueCourseIds = [...new Set(courseIds)]

  const courses = await db.course.findMany({
    where: {
      id: {
        in: uniqueCourseIds
      }
    },
    include: {
      conditions: {
        include: {
          conditions: {
            include: {
              prerequisites: true
            }
          }
        }
      }
    }
  })

  const courseMap = new Map()
  courses.forEach(course => {
    courseMap.set(course.id, course)
  })

  for await (const course of courses) {
    await addCourseToGraph({
      graph,
      courseMap,
      courseId: course.id
    })
  }

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
    allCourses,
    graph: profileGraph,
    semesters: profile.semesters.map(s =>
      s.map(c => toCourseNode(graph, c, graph.getNodeAttributes(c)))
    )
  }
}
