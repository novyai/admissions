"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ScheduleDataPayload, TrackDataPayload } from "@/app/(app)/schedule/[scheduleId]/page"
import { Conversation, Message, MessageRole } from "@repo/db"
import { CourseNode, HydratedStudentProfile } from "@repo/graph/types"
import { PromptComposer } from "@ui/components/prompt-composer"
import { SuggestedPrompts } from "@ui/components/suggested-prompts"
import { ScrollArea } from "@ui/components/ui/scroll-area"
import { Separator } from "@ui/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { applyEdgeChanges, applyNodeChanges, Edge, EdgeChange, Node, NodeChange } from "reactflow"

import { useAdvisor } from "@/hooks/use-advisor"
import {
  COREQ_EDGE_COLOR,
  PREREQ_EDGE_COLOR,
  SemesterDAG
} from "@/components/editor/dag/semester-dag"

import { AssistantChat } from "../assistant-chat"
import { ChatScrollAnchor } from "../chat-scroll-anchor"
import { MdxContent } from "../mdxContent"
import { createVersion, hydratedProfileAndNodesByVersion } from "./dag/action"
import { AppointmentScheduler } from "./dag/appointment-scheduler"
import { isCourseNode } from "./dag/semester-dag/graph-to-node-utils"
import { CourseNodeType } from "./dag/semester-dag/nodeTypes/course-node"
import { SemesterNodeType } from "./dag/semester-dag/nodeTypes/semester-node"
import {
  getChangedCourseNodeIDs,
  getGhostCourseNodesAndEdges,
  getModifiedEdges,
  getModifiedNodes
} from "./dag/semester-dag/utils"
import DegreeAudit from "./degree-audit/degree-audit"

export type VersionWithoutBlob = { id: string }
type TabOption = "schedule" | "audit"

export function Editor({
  initialSchedule,
  trackData,
  conversation,
  scheduleId
}: {
  initialSchedule: ScheduleDataPayload
  trackData: TrackDataPayload | null
  conversation: Conversation & {
    messages: Message[]
  }
  scheduleId: string
}) {
  const [versions, setVersions] = useState<VersionWithoutBlob[]>(initialSchedule.versions)
  const [profile, setProfile] = useState<HydratedStudentProfile>()

  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  const [defaultNodes, setDefaultNodes] = useState<Node[]>([])

  const [appointmentTimes, setAppointmentTimes] = useState<Date[]>([])

  const [selectedTab, setSelectedTab] = useState<TabOption>("schedule")
  const auditRef = useRef(null)
  const [requirementToScrollTo, setRequirementToScrollTo] = useState<string>()

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const changeTypes = new Set(changes.map(c => c.type))
    if (changeTypes.has("position")) {
      setStatus("dirty")
    }

    setNodes(nds => applyNodeChanges(changes, nds))
  }, [])

  const resetNodePlacement = (id: string) => {
    const pos = defaultNodes.find(n => n.id === id)?.position!
    setNodes(nds => nds.map(n => (n.id === id ? { ...n, position: pos } : n)))
  }

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges(eds => applyEdgeChanges(changes, eds)),
    []
  )
  const [_status, setStatus] = useState<"dirty" | "saving" | "pending" | "clean" | "error">("clean")

  const saveVersion = async (nodes: (SemesterNodeType | CourseNodeType)[]) => {
    setStatus("saving")

    console.log("saving version")

    const courseNodes = nodes.filter(n => isCourseNode(n)) as CourseNodeType[]

    const highestSemester = Math.max(...courseNodes.map(n => n.data.semesterIndex))
    const semesters = Array.from(Array(highestSemester + 1).keys())
    const semesterCourses = semesters.map(s =>
      courseNodes.filter(n => n.data.semesterIndex === s).map(c => c.data)
    ) as unknown as CourseNode[][]

    const newProfile: HydratedStudentProfile = { ...profile!, semesters: semesterCourses }

    const newVersion = await createVersion(newProfile, scheduleId)

    setVersions(prevVersions => [...prevVersions, newVersion])
  }

  const renderVersion = async (
    version: VersionWithoutBlob,
    lastVersion: VersionWithoutBlob | undefined
  ) => {
    if (version.id === lastVersion?.id) {
      return
    }

    const {
      profile: newProfile,
      defaultNodes: newDefaultNodes,
      defaultEdges: newDefaultEdges
    } = await hydratedProfileAndNodesByVersion(version.id)

    setProfile(newProfile)
    setDefaultNodes(newDefaultNodes)

    if (lastVersion === undefined) {
      setNodes(newDefaultNodes)
      setEdges(newDefaultEdges)
    } else {
      setNodes(newDefaultNodes)
      setEdges(newDefaultEdges)
      const lastVersionId = lastVersion.id
      const { profile: lastProfile, defaultNodes: oldDefaultNodes } =
        await hydratedProfileAndNodesByVersion(lastVersionId)

      const changedNodeIDs = getChangedCourseNodeIDs(lastProfile, newProfile)
      const changedEdgeIDs = newDefaultEdges
        .filter(e => changedNodeIDs.includes(e.source) || changedNodeIDs.includes(e.target))
        .map(e => e.id)

      const { ghostCourseNodes, ghostEdges } = getGhostCourseNodesAndEdges(
        newProfile,
        changedNodeIDs,
        oldDefaultNodes
      )

      setNodes([
        ...ghostCourseNodes,
        ...getModifiedNodes(newDefaultNodes, changedNodeIDs, n => ({
          ...n,
          data: {
            ...n.data,
            pulsing: true
          }
        }))
      ])
      setEdges([
        ...ghostEdges,
        ...getModifiedEdges(newDefaultEdges, changedEdgeIDs, e => ({
          ...e,
          style: {
            ...e.style,
            stroke: e.type == "prerequisite" ? COREQ_EDGE_COLOR : PREREQ_EDGE_COLOR
          },
          hidden: false
        }))
      ])
    }
  }

  useEffect(() => {
    const initialLoad = versions === initialSchedule.versions
    if (versions.length == 0) return
    if (versions.length >= 1) {
      const versionsCopy = [...versions.map(v => ({ id: v.id }))]
      if (versions.at(-1)?.id == versions.at(-2)?.id) {
        while (versionsCopy.at(-1)?.id == versionsCopy.at(-2)?.id) {
          versionsCopy.pop()
        }
        setVersions(versionsCopy)
      } else {
        renderVersion(versions.at(-1)!, initialLoad ? undefined : versions.at(-2)).then(
          () => setStatus("clean"),
          reason => {
            console.error(reason)
            setStatus("error")
          }
        )
      }
    }
  }, [initialSchedule.versions, versions])

  const [prompt, setPrompt] = useState("")
  const ChatScrollerRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, loading, isConnected, waiting, ready } = useAdvisor({
    conversationId: conversation.id,
    initialMessages: conversation?.messages ?? [],
    userId: conversation.userId,
    versions: versions,
    handleSelectedVersion: (versionId: string) => {
      const newVersion = { id: versionId }
      setVersions(prevVersions => [...prevVersions, newVersion])
    },
    handleAppointmentTimes: (times: Date[]) => setAppointmentTimes(times),
    handleScrollToRequirementInAudit: (requirementGroupOrSubgroupId: string) => {
      if (selectedTab !== "audit") setSelectedTab("audit")
      if (requirementToScrollTo !== requirementGroupOrSubgroupId) {
        setRequirementToScrollTo(requirementGroupOrSubgroupId)
      }
    }
  })

  function scrollToEnd({ now = false }: { now?: boolean }) {
    ChatScrollerRef?.current?.scrollTo({
      top: ChatScrollerRef?.current?.scrollHeight,
      behavior: now ? "auto" : "smooth"
    })
  }

  async function submitMessage(content: string, role?: MessageRole) {
    if (appointmentTimes) {
      setAppointmentTimes([])
    }

    setPrompt("")
    scrollToEnd({ now: true })

    sendMessage(content, role)

    setTimeout(() => {
      scrollToEnd({})
    }, 1000)
  }

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setPrompt(event.target.value ?? "")
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault()
      submitMessage(prompt)
    }
  }

  useEffect(() => {
    setTimeout(() => {
      scrollToEnd({ now: true })
    }, 0)
  })

  return (
    <div className="w-full h-fit rounded-xl border">
      {!profile ?
        <div className="h-full flex flex-grow items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      : <div className="h-full flex flex-col">
          <Tabs
            defaultValue="schedule"
            className="h-[52vh]"
            value={selectedTab}
            onValueChange={value => setSelectedTab(value as TabOption)}
          >
            <TabsList className="w-full flex h-[2.5rem]">
              <TabsTrigger value="schedule" className="flex-grow">
                Schedule
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex-grow">
                Degree Audit
              </TabsTrigger>
            </TabsList>
            <TabsContent value="schedule" className="h-[calc(52vh-3rem)] relative">
              <SemesterDAG
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
            </TabsContent>
            <TabsContent value="audit" className="h-[calc(52vh-3rem)] w-full">
              <DegreeAudit
                profile={profile}
                trackData={trackData}
                ref={auditRef}
                requirementToScrollTo={requirementToScrollTo}
                clearRequirementToScrollTo={() => setRequirementToScrollTo(undefined)}
              />
            </TabsContent>
          </Tabs>
          <div className="h-[30vh] w-full border-0 border-t rounded-xl border-slate-200 bg-background px-2">
            <div className="h-full">
              <div className="sticky">
                <h2 className="px-2 py-2 spaced uppercase font-semibold tracking-wide text-slate-500">
                  AI Advisor
                </h2>
                <Separator className="bg-slate-100 h-[0.1rem]" />
              </div>

              <ScrollArea ref={ChatScrollerRef} className="h-[80%]">
                <div className="mx-auto">
                  <div className="px-1">
                    {messages.length > 0 ?
                      <AssistantChat
                        messages={messages}
                        disabled={!ready}
                        submitMessage={submitMessage}
                        loading={loading}
                      />
                    : <MdxContent
                        className="py-2 px-2"
                        content={
                          "Hello! I'm the AI course advisor for USF's Computer Science program. I'm here to help you with course information, scheduling, and any other academic guidance you might need throughout your journey at USF. How can I assist you today?"
                        }
                      />
                    }
                  </div>
                </div>
                {ChatScrollerRef?.current && (
                  <ChatScrollAnchor
                    trackVisibility={waiting || loading}
                    scrollerRef={ChatScrollerRef}
                  />
                )}
              </ScrollArea>
            </div>
          </div>
          <div className="relative w-full h-[5%]">
            {messages.length === 0 ?
              <SuggestedPrompts
                handleClick={(prompt: string) => submitMessage(prompt, "user")}
                prompts={["What can you do?", "Reschedule Data Structures"]}
              />
            : <></>}
            {appointmentTimes.length > 0 ?
              <AppointmentScheduler
                times={appointmentTimes}
                handleBookAppointment={(readableTime: string) => {
                  setAppointmentTimes([])
                  submitMessage(`Let's book an appointment for ${readableTime.toLocaleString()}.`)
                }}
                closeAppointments={() => setAppointmentTimes([])}
              />
            : <></>}

            <PromptComposer
              disabled={!ready || !isConnected}
              placeholder={"Ask me anything..."}
              loading={loading}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onSubmit={submitMessage}
              prompt={prompt}
            />
          </div>
        </div>
      }
    </div>
  )
}
