import { HTMLAttributes, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { Panel } from "reactflow"

import ChangeLogger from "./change-logger"
import NodeInspector from "./node-inspector"
import ViewportLogger from "./viewport-logger"

export default function ReactFlowDevTools() {
  const [nodeInspectorActive, setNodeInspectorActive] = useState(true)
  const [changeLoggerActive, setChangeLoggerActive] = useState(true)
  const [viewportLoggerActive, setViewportLoggerActive] = useState(true)

  return (
    <div className="react-flow__devtools">
      <Panel position="top-center">
        <DevToolButton
          setActive={setNodeInspectorActive}
          active={nodeInspectorActive}
          title="Toggle Node Inspector"
        >
          Node Inspector
        </DevToolButton>
        <DevToolButton
          setActive={setChangeLoggerActive}
          active={changeLoggerActive}
          title="Toggle Change Logger"
        >
          Change Logger
        </DevToolButton>
        <DevToolButton
          setActive={setViewportLoggerActive}
          active={viewportLoggerActive}
          title="Toggle Viewport Logger"
        >
          Viewport Logger
        </DevToolButton>
      </Panel>
      {changeLoggerActive && <ChangeLogger />}
      {nodeInspectorActive && <NodeInspector />}
      {viewportLoggerActive && <ViewportLogger />}
    </div>
  )
}

function DevToolButton({
  active,
  setActive,
  children,
  ...rest
}: {
  active: boolean
  setActive: Dispatch<SetStateAction<boolean>>
  children: ReactNode
} & HTMLAttributes<HTMLButtonElement>) {
  return (
    <button onClick={() => setActive(a => !a)} className={active ? "active" : ""} {...rest}>
      {children}
    </button>
  )
}
