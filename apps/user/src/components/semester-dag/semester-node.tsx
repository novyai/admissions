"use client"
import { NodeProps, Node } from 'reactflow';

export type SemesterNodeData = {
  semester: number;

} | {
  transfer: true
};

type SemesterNodeProps = NodeProps<SemesterNodeData>

export type SemesterNodeType = Node<SemesterNodeData>;

export function SemesterNode({ data }: SemesterNodeProps) {

  return (
    <div className='flex w-full h-full justify-center pt-2'>
      <p>{"transfer" in data ? `Transfer Credits` : `Semester ${data.semester}`}</p>
    </div>
  );
}