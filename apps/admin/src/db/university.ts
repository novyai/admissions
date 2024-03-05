import { db } from "@db/client"

export const universitiesWithDepartments = await db.university.findMany({
	include: {
		departments: true
	}
})
