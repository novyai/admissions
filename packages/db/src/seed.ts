import fs from "fs/promises"
import path from "path"
import { db, Department, LogicalOperator, RequirementType } from "@db/client"
import gradeMetricData from "@db/data/sheet/grades_data.json"
import conditionGroupsData from "@db/data/sheet/New_ConditionGroups.json"
import conditionsData from "@db/data/sheet/New_Conditions.json"
import courseData from "@db/data/sheet/New_Courses_Updated.json"
import departmentData from "@db/data/sheet/New_Departments.json"
import prerequisiteData from "@db/data/sheet/New_Prerequisites.json"
import studentData from "@db/data/sheet/student_data.json"
import transferData from "@db/data/sheet/transfer_grades_data.json"
import universityData from "@db/data/sheet/university_data.json"
import gradesData from "@db/data/sheet/university_grades_data.json"
import { faker } from "@faker-js/faker"
import { Prisma } from "@prisma/client"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import { fixPrereqs } from "./fixCourses"

async function insertDepts() {
	try {
		const uId = crypto.randomUUID()
		for (const university of universityData) {
			const universityWithDepartments = {
				name: university.name,
				id: uId,
				departments: {
					createMany: {
						data: departmentData.map(department => ({
							code: department.code,
							name: department.name
						}))
					}
				}
			}

			await db.university.create({
				data: universityWithDepartments
			})
		}

		console.log("Universities and departments inserted successfully.")
	} catch (error) {
		console.error("Error inserting data:", error)
	} finally {
		await db.$disconnect()
	}
}

async function insertCourses(deptCache: Map<string, Department>) {
	try {
		for (const course of courseData) {
			try {
				const dept = departmentData.find(department => department.id === course.departmentId)
				if (!dept) {
					throw new Error(
						`Could not find department for course ${course.courseSubject} ${course.courseNumber}`
					)
				}
				const remoteDept = deptCache.get(dept.code)

				if (!remoteDept) {
					throw new Error(`Could not find remote department for course ${dept.code}`)
				}

				await db.course.upsert({
					where: {
						courseIdentifier: {
							courseSubject: course.courseSubject,
							courseNumber: course.courseNumber
						}
					},
					update: {
						universityId: remoteDept.universityId ?? null,
						departmentId: remoteDept.id
					},
					create: {
						departmentId: remoteDept.id,
						universityId: remoteDept.universityId ?? null,
						courseSubject: course.courseSubject,
						courseNumber: course.courseNumber,
						name: course.courseTitle,
						startTerm: course.startTerm,
						endTerm: course.endTerm
					}
				})
				console.log("processed course: ", course.courseSubject, course.courseNumber)
			} catch (error) {
				if (error instanceof PrismaClientKnownRequestError) {
					console.log(error.message)
				}
				console.log(error)
				console.log("failure on course: ", course.courseSubject, course.courseNumber)
			}
		}
	} catch (error) {
		console.error("Error inserting courses:", error)
	} finally {
		await db.$disconnect()
	}
}

async function insertConditions() {
	try {
		await db.prerequisite.deleteMany({})
		await db.condition.deleteMany({})
		await db.conditionGroup.deleteMany({})
		// Read data from the JSON files

		// Insert condition groups into the database
		for (const conditionGroup of conditionGroupsData) {
			const groupCourse = courseData.find(course => course.id === conditionGroup.courseId)
			if (!groupCourse) {
				throw new Error("Could not find course for condition group")
			}
			// Insert ConditionGroup without conditions
			const createdConditionGroup = await db.conditionGroup.create({
				data: {
					logicalOperator: conditionGroup.logicalOperator as LogicalOperator,
					course: {
						connect: {
							courseIdentifier: {
								courseSubject: groupCourse.courseSubject,
								courseNumber: groupCourse.courseNumber
							}
						}
					}
				}
			})

			// Map conditions for this group
			const conditionsForGroup: Prisma.ConditionCreateManyInput[] = conditionsData
				.filter(condition => condition.conditionGroupId === conditionGroup.id)
				.map(condition => {
					const conditionData: Prisma.ConditionCreateManyInput = {
						type: condition.type as RequirementType,
						conditionGroupId: createdConditionGroup.id
					}
					return conditionData
				})

			// Insert conditions for this group
			await db.condition.createMany({
				data: conditionsForGroup
			})

			const createdConditions = await db.condition.findMany({
				where: { conditionGroupId: createdConditionGroup.id }
			})

			for (const condition of createdConditions) {
				//this condition id doesnt match the generated id from the file... so we need to find the condition by type and minimum grade
				const matchingCondition = conditionsData.find(
					cond =>
						cond.type === condition.type &&
						cond.minimumGrade === condition.minimumGrade &&
						cond.conditionGroupId === conditionGroup.id
				)

				const reqsForCondition = prerequisiteData.filter(
					prer => prer.conditionId === matchingCondition?.id
				)

				const prerequisitesForCondition = []

				for await (const prerequisite of reqsForCondition) {
					const relevantCourse = await db.course.findUnique({
						where: {
							courseIdentifier: {
								courseSubject: prerequisite.subject,
								courseNumber: prerequisite.number
							}
						}
					})

					if (!relevantCourse) {
						console.log("could not find course:", prerequisite.subject, prerequisite.number)
						continue
					}

					prerequisitesForCondition.push({
						courseId: relevantCourse.id,
						conditionId: condition.id
					})
				}

				console.log("prereqs for condition:", prerequisitesForCondition)

				await db.prerequisite.createMany({
					data: prerequisitesForCondition
				})
			}

			console.log("processed condition group:", conditionGroup.id)
		}

		console.log("Condition groups and conditions inserted successfully.")
	} catch (error) {
		console.error("Error inserting condition data:", error)
	} finally {
		await db.$disconnect()
	}
}

async function students() {
	try {
		const studentData = JSON.parse(
			await fs.readFile(path.resolve("./src/data/sheet/student_data.json"), "utf-8")
		)

		for (const student of studentData) {
			try {
				const createdStudent = await db.student.create({
					data: {
						id: student.studentId,
						studentId: student.studentId,
						universityId: "bb49ed28-7ede-451e-8c14-5e3793ae82fe"
					}
				})

				await db.user.create({
					data: {
						email: faker.internet.email(),
						firstName: faker.person.firstName(),
						lastName: faker.person.lastName(),
						userType: "STUDENT",
						studentId: createdStudent.id
					}
				})
			} catch (error) {
				console.log("failure on student: ", student.studentId)
			}
		}
	} catch (error) {
		console.error("Error inserting courses:", error)
	} finally {
		await db.$disconnect()
	}
}

async function grades() {
	try {
		for await (const grade of gradesData) {
			const localCourse = courseData.find(course => course.id === grade.courseId)
			const student = studentData.find(student => student.id === grade.studentId)

			try {
				if (!localCourse) {
					throw new Error(`Could not find course for grade ${grade}`)
				}
				if (!student) {
					throw new Error(`Could not find student for grade ${grade}`)
				}
				await db.universityGrade.create({
					data: {
						student: {
							connect: {
								id: student.studentId
							}
						},
						term: grade.term,
						finalGrade: grade.finalGrade,
						creditHours: grade.creditHours,
						repeatCourse: grade.repeatCourse,
						course: {
							connect: {
								courseIdentifier: {
									courseSubject: localCourse.courseSubject,
									courseNumber: localCourse.courseNumber
								}
							}
						}
					}
				})
				console.log("processed grade: ")
			} catch (error) {
				console.log(error)
				console.log("failure on grade: ")
			}
		}

		for await (const transferGrade of transferData) {
			try {
				const student = studentData.find(student => student.id === transferGrade.studentId)
				if (!student) {
					throw new Error(`Could not find student for transfer grade ${transferGrade}`)
				}

				await db.transferGrade.create({
					data: {
						studentId: student.studentId,
						term: transferGrade.term,
						creditHours: transferGrade.creditHours,
						repeatCourse: transferGrade.repeatCourse,
						sbgiCode: transferGrade.sbgiCode,
						sbgiDesc: transferGrade.sbgiDesc,
						courseSeqNo: transferGrade.courseSeqNo,
						courseSubject: transferGrade.courseSubject,
						courseNumber: transferGrade.courseNumber,
						courseTitle: transferGrade.courseTitle,
						equivalentGrade: transferGrade.equivalentGradeUSF,
						transferGrade: transferGrade.transferGrade,
						countInGPA: transferGrade.countInGPA
					}
				})
				console.log("processed transfer grade: ")
			} catch (error) {
				console.log(error)
				console.log("failure on transfer grade: ")
			}
		}
		await db.grade.deleteMany({})
		for await (const gradeMetric of gradeMetricData) {
			try {
				await db.grade.create({
					data: {
						gradeCode: gradeMetric.gradeCode,
						gradeNumericValue: gradeMetric.gradeNumericValue,
						gradeQualityPoints: gradeMetric.gradeQualityPoints,

						gradeAttemptedInd: gradeMetric.gradeAttemptedInd === "Y" ? true : false,
						gradeCompletedInd: gradeMetric.gradeCompletedInd === "Y" ? true : false,
						gradePassedInd: gradeMetric.gradePassedInd === "Y" ? true : false,
						gradeGPAInd: gradeMetric.gradeGPAInd === "Y" ? true : false,
						gradeTraditionalInd: gradeMetric.gradeTraditionalInd === "Y" ? true : false,
						gradeRepeatIncludeInd: gradeMetric.gradeRepeatIncludeInd === "Y" ? true : false
					}
				})
				console.log("processed grade metric: ")
			} catch (error) {
				console.log("failure on grade metric ")
			}
		}
	} catch (error) {
		console.error("Error inserting grades:", error)
	} finally {
		await db.$disconnect()
	}
}

async function insertDegreeData() {
	try {
		// Read the degree data JSON file
		const degreeDataJson = await fs.readFile(
			path.resolve("./src/data/sheet/degree_data_extract.json"),
			"utf-8"
		)
		const degreeDataArray = JSON.parse(degreeDataJson)

		// Iterate through the degree data array and create records
		for (const degreeData of degreeDataArray) {
			const formattedDegreeData = {
				studentId: degreeData.ID,
				degreeSequenceNumber: degreeData["DEGREE SEQUENCE NUMBER"],
				degreeTerm: degreeData["DEGREE TERM"],
				degreeCode: degreeData["DEGREE_CODE"],
				cipDegree: degreeData["CIP_DEGREE"],
				degreeStatus: degreeData["DEGREE_STATUS"]
			}

			await db.degreeData.create({
				data: formattedDegreeData
			})
		}

		console.log("Degree data inserted successfully.")
	} catch (error) {
		console.error("Error inserting data:", error)
	} finally {
		await db.$disconnect()
	}
}

async function insertProgramCourses() {
	try {
		const programCourseJson = await fs.readFile(
			path.resolve("./src/data/programs/ElectiveCourses.json"),
			"utf-8"
		)

		const programCourseArray = JSON.parse(programCourseJson)

		for (const pc of programCourseArray) {
			const [courseSubject, courseNumber] = pc.courseId.split(" ")
			await db.electiveCourse.create({
				data: {
					category: pc.category,
					program: {
						connect: {
							id: pc.programId
						}
					},
					course: {
						connect: {
							courseIdentifier: {
								courseSubject,
								courseNumber
							}
						}
					}
				}
			})
		}

		console.log("Program courses inserted successfully.")
	} catch (error) {
		console.error("Error inserting program courses:", error)
	}
}

async function main() {
	try {
		// Step 1: Insert Universities and Departments
		await insertDepts()

		const deptCache = new Map<string, Department>()
		const departments = await db.department.findMany()
		for (const department of departments) {
			deptCache.set(department.code, department)
		}

		// Step 2: Insert Courses
		await insertCourses(deptCache)

		// Step 3: Insert ConditionGroups and Conditions & pre reqs
		await insertConditions()

		// Step 5: Insert Students
		await students()

		// Step 6: Insert University Grades and Transfer Grades
		await grades()

		// step 7: insert degree data
		await insertDegreeData()

		// await insertProgramCourses()
		await fixPrereqs()

		console.log("Data ingestion completed successfully.")
	} catch (error) {
		console.error("Error during data ingestion:", error)
	} finally {
		await db.$disconnect()
	}
}

main()
