"use client"

import { CourseNode } from '@graph/types';
import { Handle, NodeProps, Position, Node } from 'reactflow';

export type CourseNodeData = {
  semesterIndex: number
} & CourseNode

export type CourseNodeType = Node<CourseNodeData>

export function CourseNode({ data }: NodeProps<CourseNodeData>) {

  return (
    <div className='flex min-w-0 min-h-0 w-full h-full justify-center m-2'>
      <Handle type='target' position={Position.Left} />
      <p className='text-ellipsis'>{data.name}</p>
      <Handle type='source' position={Position.Right} />
    </div>
  );
}