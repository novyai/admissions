import { db } from "@db/client"
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/ui/card"

import { SelectUser } from "@/components/user-combobox"

export default async function Home() {
	const users = await db.user.findMany()

	return (
		<div className="flex justify-center items-center h-screen">
			<Card className="w-1/2">
				<CardHeader>
					<CardTitle>Select a student</CardTitle>
				</CardHeader>
				<CardContent>
					<SelectUser users={users} />
				</CardContent>
			</Card>
		</div>
	)
}
