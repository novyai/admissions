"use client"

import { useEffect, useState } from "react"
import { Version } from "@db/client"
import { getProfileFromSchedule } from "@graph/action"
import { Button } from "@ui/components/ui/button"
import { Node, useEdgesState, useNodesState } from "reactflow"

import { SemesterDAG } from "@/components/semester-dag"

import { createVersion, getAllNodesAndEdges } from "./action"

export function Editor({ versions: initialVersions }: { versions: Version[] }) {
  const [versions, setVersions] = useState<Version[]>(initialVersions)
  const [selectedVersion, setSelectedVersion] = useState<Version>(initialVersions[0]!)

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const [status, setStatus] = useState<"pending" | "saving" | "clean" | "error">("clean")

  const saveVersion = async (nodes: Node[]) => {
    setStatus("saving")
    const profile = await getProfileFromSchedule(selectedVersion.blob?.toString() ?? "")
    const version = await createVersion(profile, selectedVersion.scheduleId, nodes)
    setVersions(prev => [...prev, version])
    setSelectedVersion(version)
    setStatus("clean")
  }

  useEffect(() => {
    setStatus("pending")
    const update = async () => {
      const profile = await getProfileFromSchedule(selectedVersion.blob?.toString() ?? "")
      const { defaultNodes, defaultEdges } = await getAllNodesAndEdges(profile)
      console.log({ defaultNodes, defaultEdges })

      setNodes(defaultNodes)
      setEdges(defaultEdges)
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
      <p>{status}</p>
      <DagVersionSidebar
        versions={versions}
        selectedVersion={selectedVersion}
        setSelectedVersion={setSelectedVersion}
      />
      <div className="flex flex-col w-full h-full">
        <div className="relative flex-1 min-h-[50vh] rounded-xl border">
          <SemesterDAG
            saveVersion={saveVersion}
            nodes={nodes}
            edges={edges}
            setNodes={setNodes}
            setEdges={setEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
          />
        </div>
      </div>
    </>
  )
}

function DagVersionSidebar({
  versions,
  selectedVersion,
  setSelectedVersion
}: {
  versions: Version[]
  selectedVersion: Version
  setSelectedVersion: (version: Version) => void
}) {
  return (
    <div className="flex flex-col gap-y-4">
      {versions.map(version => {
        return (
          <Button
            variant={selectedVersion?.id === version.id ? "default" : "outline"}
            key={version.id}
            onClick={() => setSelectedVersion(version)}
          >
            <span>
              {version.id.substring(0, 4)} - {version.createdAt.toISOString()}
            </span>
          </Button>
        )
      })}
    </div>
  )
}
