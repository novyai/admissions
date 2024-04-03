"use server"

import { BaseStudentProfile, CourseNode, StudentProfile } from "./types"
import { CourseGraph, addCourseToGraph, computeNodeStats, toCourseNode } from "./profile"
import Graph from "graphology"
import { z } from "zod"

const blobSchema = z.object({
  profile: z.custom<BaseStudentProfile & { semesters: string[][] }>(),
  nodes: z.array(z.object({
    id: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number()
    })
  }))
})

export async function getProfileFromSchedule(blob: string): Promise<StudentProfile> {
  const parsedBlob = blobSchema.safeParse(JSON.parse(blob))

  if (!parsedBlob.success) {
    throw new Error(parsedBlob.error.message)
  }

  const { profile, nodes } = parsedBlob.data

  const graph: CourseGraph = new Graph()


  for (const node of [...nodes.map(n => n.id), ...profile.semesters.flat()]) {
    await addCourseToGraph(node, graph, profile.transferCredits, profile) // Await the completion of each addCourseToGraph call
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

