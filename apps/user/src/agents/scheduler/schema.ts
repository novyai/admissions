import { z } from "zod";

export const additionalCoursesSchema =
	z.object({
		courses:
			z.object({
				courseNumber: z.string(),
				courseSubject: z.string()
			}).array()
	})
