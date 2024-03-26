"use client"

import { useState } from "react"
import { Version } from "@db/client"
import { StudentProfile } from "@graph/types"
import { Button } from "@ui/components/ui/button"
import { Edge, Node } from "reactflow"

import { SemesterDAG } from "@/components/semester-dag"

import { createVersion } from "./action"

export function Editor({
  nodes,
  edges,
  versions: initialVersions,
  profile
}: {
  nodes: Node[]
  edges: Edge[]
  versions: Version[]
  profile: StudentProfile
}) {
  const [versions, setVersions] = useState<Version[]>(initialVersions)
  const [selectedVersion, setSelectedVersion] = useState<Version>(initialVersions[0]!)

  const saveVersion = async (nodes: Node[]) => {
    const version = await createVersion(profile, selectedVersion.scheduleId, nodes)
    setVersions(prev => [...prev, version])
    setSelectedVersion(version)
  }

  return (
    <>
      <DagVersionSidebar
        versions={versions}
        selectedVersion={selectedVersion}
        setSelectedVersion={setSelectedVersion}
      />
      <div className="flex flex-col w-full h-full">
        <div className="relative flex-1 min-h-[50vh] rounded-xl border">
          <SemesterDAG saveVersion={saveVersion} nodes={nodes} edges={edges} />
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
            <span>{version.id}</span>
          </Button>
        )
      })}
    </div>
  )
}
