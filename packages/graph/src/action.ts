"use server"

import { XYPosition } from "reactflow"
import { BaseStudentProfile, CourseNode, StudentProfile } from "./types"
import { CourseGraph, addCourseToGraph, computeNodeStats, getStudentProfileFromRequirements, toCourseNode } from "./profile"
import Graph from "graphology"

export async function getProfileFromSchedule(blob: string): Promise<StudentProfile> {
  const { profile, nodes } = JSON.parse(blob) as {
    profile: BaseStudentProfile & { semesters: string[][] }
    nodes: {
      id: string
      position: XYPosition
    }[]
  }

 // return getStudentProfileFromRequirements(profile)

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

