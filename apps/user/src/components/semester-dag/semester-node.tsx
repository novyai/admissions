"use client"
import { NodeProps } from 'reactflow';

export type SemesterNodeData = {
  semester: number;
};

export function SemesterNode({ data, ...props }: NodeProps<SemesterNodeData>) {

  return (
    <div className='flex w-full h-full justify-center pt-2'>
      <p>Semester {data.semester}</p>
    </div>
  );
}