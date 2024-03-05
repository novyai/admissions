"use client"
import { CourseNode } from '@graph/types';
import { Handle, NodeProps, Position } from 'reactflow';

export type CourseNodeData = {
  semesterIndex: number
} & CourseNode


export function CourseNode({ data, ...props }: NodeProps<CourseNodeData>) {

  return (
    <div className='flex w-full h-full justify-center mt-2'>
      <Handle type='target' position={Position.Left} />
      <p>{data.name}</p>
      <Handle type='source' position={Position.Right} />
    </div>
  );
}