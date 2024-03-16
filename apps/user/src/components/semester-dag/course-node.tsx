"use client"
import { CourseNode } from '@graph/types';
import { Handle, NodeProps, Position } from 'reactflow';

export type CourseNodeData = {
  semesterIndex: number
} & CourseNode


export function CourseNode({ data, ...props }: NodeProps<CourseNodeData>) {

  return (
    <div className='flex min-w-0 min-h-0 w-full h-full justify-center m-2'>
      <Handle type='target' position={Position.Left} />
      <p className='text-ellipsis'>{data.name}</p>
      <Handle type='source' position={Position.Right} />
    </div>
  );
}