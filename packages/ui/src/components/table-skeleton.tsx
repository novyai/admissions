export function TableSkeleton() {
	return (
		<div className="w-screen h-screen p-12">
			<div className=" h-[40px] w-full mb-12 flex justify-between ">
				<div className="h-full w-[138px] bg-accent animate-pulse overflow-hidden rounded-xl" />
			</div>

			<div className=" h-[40px] w-full mb-6 flex justify-between ">
				<div className="h-full w-[380px] bg-accent animate-pulse overflow-hidden rounded-xl" />
			</div>

			<div className="h-[30vh] w-full">
				<div className="h-full w-full bg-accent animate-pulse overflow-hidden rounded-xl" />
			</div>
		</div>
	)
}
