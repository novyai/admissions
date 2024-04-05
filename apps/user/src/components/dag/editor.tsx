"use client"

import { useCallback, useEffect, useState } from "react"
import { Version } from "@repo/db"
import { getProfileFromSchedule } from "@repo/graph/action"
import { CourseNode, StudentProfile } from "@repo/graph/types"
import { Button } from "@repo/ui/components/ui/button"
import { Loader2 } from "lucide-react"
import { applyEdgeChanges, applyNodeChanges, Edge, EdgeChange, Node, NodeChange } from "reactflow"

import { SemesterDAG } from "@/components/semester-dag"

import { CourseNodeType } from "../semester-dag/course-node"
import { isCourseNode } from "../semester-dag/graph-to-node-utils"
import { SemesterNodeType } from "../semester-dag/semester-node"
import { createVersion, getAllNodesAndEdges } from "./action"

export function Editor({
  versions: initialVersions,
  scheduleId
}: {
  versions: Version[]
  scheduleId: string
}) {
  const [versions, setVersions] = useState<Version[]>(initialVersions)
  const [selectedVersion, setSelectedVersion] = useState<Version>(initialVersions[0]!)
  const [profile, setProfile] = useState<StudentProfile>()

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  const [defaultNodes, setDefaultNodes] = useState<Node[]>([])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const changeTypes = new Set(changes.map(c => c.type))
    if (changeTypes.has("position")) {
      setStatus("dirty")
    }

    setNodes(nds => applyNodeChanges(changes, nds))
  }, [])

  const resetNodePlacement = (id: string) => {
    const pos = defaultNodes.find(n => n.id === id)?.position!
    console.log(`resetting node ${id} to ${pos.x},${pos.y}`)
    setNodes(nds => nds.map(n => (n.id === id ? { ...n, position: pos } : n)))
    console.log("fixed")
  }

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges(eds => applyEdgeChanges(changes, eds)),
    []
  )
  const [status, setStatus] = useState<"dirty" | "saving" | "pending" | "clean" | "error">("clean")

  const saveVersion = async (nodes: (SemesterNodeType | CourseNodeType)[]) => {
    setStatus("saving")

    const courseNodes = nodes.filter(n => isCourseNode(n)) as CourseNodeType[]

    const semesters = Array.from(new Set(courseNodes.map(n => n.data.semesterIndex)))
    console.log(semesters)
    const semesterCourses = semesters.map(s =>
      courseNodes.filter(n => n.data.semesterIndex === s).map(c => c.data.raw_course)
    ) as unknown as CourseNode[][]

    const newProfile: StudentProfile = { ...profile!, semesters: semesterCourses }

    const version = await createVersion(newProfile, scheduleId, nodes)
    setVersions(prev => [...prev, version])
    setProfile(newProfile)
    setSelectedVersion(version)
    setStatus("clean")
  }

  useEffect(() => {
    setStatus("pending")
    const update = async () => {
      const profile = await getProfileFromSchedule(selectedVersion.blob?.toString() ?? "")

      setProfile(profile)
      const { defaultNodes: newDefaultNodes, defaultEdges: newDefaultEdges } =
        await getAllNodesAndEdges(profile)

      setDefaultNodes(newDefaultNodes)

      setNodes(newDefaultNodes)
      setEdges(newDefaultEdges)
    }

    update().then(
      () => setStatus("clean"),
      reason => {
        console.error(reason)
        setStatus("error")
      }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersion])

  return (
    <>
      <div className="flex flex-col gap-y-4">
        <Button disabled={status !== "dirty"} onClick={() => saveVersion(nodes)}>
          {status === "dirty" ? "Save Changes" : "No Changes"}
        </Button>
        <VersionList
          versions={versions}
          selectedVersion={selectedVersion}
          setSelectedVersion={setSelectedVersion}
        />
      </div>
      <div className="flex flex-col w-full h-full">
        <div className="relative flex-1 min-h-[50vh] rounded-xl border">
          {!profile ?
            <div className="flex w-full h-full items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          : <SemesterDAG
              resetNodePlacement={resetNodePlacement}
              profile={profile}
              saveVersion={saveVersion}
              nodes={nodes}
              edges={edges}
              setNodes={setNodes}
              setEdges={setEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
            />
          }
        </div>
      </div>
    </>
  )
}

function VersionList({
  versions,
  selectedVersion,
  setSelectedVersion
}: {
  versions: Version[]
  selectedVersion: Version
  setSelectedVersion: (version: Version) => void
}) {
  return (
    <>
      {versions.map(version => {
        return (
          <Button
            variant={selectedVersion?.id === version.id ? "default" : "outline"}
            key={version.id}
            onClick={() => setSelectedVersion(version)}
          >
            {version.id.substring(0, 4)} - {version.createdAt.toISOString()}
          </Button>
        )
      })}
    </>
  )
}
