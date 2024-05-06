import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"

import Prisma, { db, type LogicalOperator, type RequirementType } from "@repo/db"

import baseCourseData from "./data/usf/courses.json"
import csRequisiteData from "./data/usf/cs/requisites.json"
import csTrackData from "./data/usf/cs/tracks.json"
import genEdRequirementData from "./data/usf/gen/requirements.json"
import genEdRequisiteData from "./data/usf/gen/requisites.json"

const uniInformation = [
  {
    name: "University of South Florida",
    programs: csTrackData
  }
]

const DEFAULT_CREDIT_HOURS = 3

async function insertCourses(uniId: string) {
  try {
    for (const course of baseCourseData) {
      try {
        await db.course.upsert({
          where: {
            courseIdentifier: {
              courseSubject: course.courseSubject,
              courseNumber: course.courseNumber
            }
          },
          update: {
            university: {
              connect: {
                id: uniId
              }
            },
            department: {
              connectOrCreate: {
                where: {
                  code_universityId: {
                    code: course.courseSubject,
                    universityId: uniId
                  }
                },
                create: {
                  code: course.courseSubject,
                  name: course.courseSubject,
                  university: {
                    connect: {
                      id: uniId
                    }
                  }
                }
              }
            }
          },
          create: {
            department: {
              connectOrCreate: {
                where: {
                  code_universityId: {
                    code: course.courseSubject,
                    universityId: uniId
                  }
                },
                create: {
                  code: course.courseSubject,
                  name: course.courseSubject,
                  university: {
                    connect: {
                      id: uniId
                    }
                  }
                }
              }
            },
            university: {
              connect: {
                id: uniId
              }
            },
            courseSubject: course.courseSubject,
            courseNumber: course.courseNumber,
            name: course.courseTitle,
            creditHours: DEFAULT_CREDIT_HOURS
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
export async function updatePrerequisites() {
  const uni = await db.university.findFirst({
    where: {
      name: "University of South Florida"
    },
    select: {
      id: true
    }
  })
  if (!uni || !uni.id) {
    throw Error("No Uni Found")
  }

  const { id: uniId } = uni
  const courseRequisiteMapping: Map<string, string[]> = new Map()
  for (const course of [...csRequisiteData, ...genEdRequisiteData]) {
    try {
      let courseInDb = await db.course.upsert({
        where: {
          courseIdentifier: {
            courseSubject: course.courseSubject,
            courseNumber: course.courseNumber
          }
        },
        create: {
          name: course.name,
          courseSubject: course.courseSubject,
          courseNumber: course.courseNumber,
          description: course.description,
          creditHours:
            typeof course.creditHours === "string" ?
              parseInt(course.creditHours)
            : course.creditHours,
          department: {
            connectOrCreate: {
              where: {
                code_universityId: {
                  code: course.courseSubject,
                  universityId: uniId
                }
              },
              create: {
                name: course.courseSubject,
                code: course.courseSubject,
                university: {
                  connect: {
                    id: uniId
                  }
                }
              }
            }
          }
        },
        update: {
          name: course.name,
          courseSubject: course.courseSubject,
          courseNumber: course.courseNumber,
          department: {
            connectOrCreate: {
              where: {
                code_universityId: {
                  code: course.courseSubject,
                  universityId: uniId
                }
              },
              create: {
                name: course.courseSubject,
                code: course.courseSubject,
                university: {
                  connect: {
                    id: uniId
                  }
                }
              }
            }
          }
        },
        include: {
          conditions: {
            include: {
              conditions: {
                include: {
                  prerequisites: true
                }
              }
            }
          }
        }
      })

      // delete the old pre-requisites
      await db.prerequisite.deleteMany({
        where: {
          conditionId: {
            in: courseInDb.conditions
              .flatMap(condition => condition.conditions)
              .map(condition => condition.id)
          }
        }
      })
      await db.condition.deleteMany({
        where: {
          conditionGroupId: {
            in: courseInDb.conditions.flatMap(condition => condition.id)
          }
        }
      })
      await db.conditionGroup.deleteMany({
        where: {
          courseId: courseInDb.id
        }
      })

      // add the new pre-requisites
      for (const conditionGroup of course.conditions) {
        const createdConditionGroup = await db.conditionGroup.create({
          data: {
            logicalOperator: conditionGroup.logicalOperator as LogicalOperator,
            course: {
              connect: {
                courseIdentifier: {
                  courseSubject: course.courseSubject,
                  courseNumber: course.courseNumber
                }
              }
            }
          }
        })

        for (const condition of conditionGroup.conditions) {
          const createdCondition = await db.condition.create({
            data: {
              type: condition.type as RequirementType,
              minimumGrade: condition.minimumGrade,
              conditionGroup: {
                connect: {
                  id: createdConditionGroup.id
                }
              }
            }
          })

          for (const prerequisite of condition.prerequisites) {
            const preqID = await db.prerequisite.create({
              data: {
                condition: {
                  connect: {
                    id: createdCondition.id
                  }
                },
                course: {
                  connect: {
                    courseIdentifier: {
                      courseSubject: prerequisite.courseSubject,
                      courseNumber: prerequisite.courseNumber
                    }
                  }
                }
              },
              select: {
                courseId: true
              }
            })
            courseRequisiteMapping.set(courseInDb.id, [
              ...(courseRequisiteMapping.get(courseInDb.id) ?? []),
              preqID.courseId
            ])
          }
        }
      }
    } catch (error) {
      console.error(
        `Error fixing course in DB: ${course.courseSubject} ${course.courseNumber}`,
        error
      )
    }
  }

  await db.courseRequisites.deleteMany()

  const courseRequisites: Prisma.CourseRequisitesCreateManyInput[] = [
    ...courseRequisiteMapping.keys()
  ]
    .map((courseId, _i) => {
      const seen = new Set<string>()
      recursePrereqs(courseId, courseRequisiteMapping, seen)
      return [...seen].map(reqId => ({
        courseId,
        requisitesId: reqId
      }))
    })
    .flat()

  await db.courseRequisites.createMany({
    data: courseRequisites,
    skipDuplicates: true
  })
}

function recursePrereqs(
  k: string,
  courseRequisiteMapping: Map<string, string[]>,
  seen: Set<string> = new Set()
) {
  if (seen.has(k)) {
    return
  }
  seen.add(k)
  const requisites = courseRequisiteMapping.get(k)
  if (!requisites) {
    return
  }
  for (const requisite of requisites) {
    recursePrereqs(requisite, courseRequisiteMapping, seen)
  }
}

async function main() {
  const unis = []

  try {
    for (const uni of uniInformation) {
      const uniInDb = await db.university.findFirst({
        where: {
          name: uni.name
        }
      })

      if (!uniInDb) {
        const createdUni = await db.university.create({
          data: {
            name: uni.name
          }
        })
        unis.push(createdUni.id)
      } else {
        unis.push(uniInDb.id)
      }
    }

    await insertCourses(unis[0])

    await updatePrerequisites()

    console.log("unis", unis, uniInformation.length)
    for (let i = 0; i < uniInformation.length; i++) {
      const uniId = unis[i]
      const uni = uniInformation[i]

      for (const program of uni.programs) {
        const pInDb = await db.program.create({
          data: {
            name: program.name,
            university: {
              connect: {
                id: uniId
              }
            },
            totalDegreeHours: program.totalDegreeHours
          },
          select: {
            id: true
          }
        })

        for (const track of program.tracks) {
          const trackInDb = await db.track.create({
            data: {
              name: track.name,
              program: {
                connect: {
                  id: pInDb.id
                }
              }
            },
            select: {
              id: true
            }
          })

          for (const req of track.requirements) {
            await db.requirement.create({
              data: {
                trackId: trackInDb.id,
                courses: req.courses,
                creditHoursNeeded: req.creditHoursNeeded,
                nonOverlapping: req.nonOverlapping
              }
            })
          }
          for (const req of genEdRequirementData) {
            await db.requirement.create({
              data: {
                trackId: trackInDb.id,
                courses: req.courses,
                creditHoursNeeded: req.creditHoursNeeded,
                nonOverlapping: req.nonOverlapping
              }
            })
          }
        }
      }
    }

    console.log("Data ingestion completed successfully.")
  } catch (error) {
    console.error("Error during data ingestion:", error)
  } finally {
    await db.$disconnect()
  }
}

await main()
