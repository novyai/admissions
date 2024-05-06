import fixedDenormalizedCourses from "@db/data/sheet/fixed_denormalized_courses.json"

import Prisma, { db, type LogicalOperator, type RequirementType } from "@repo/db"

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
  for (const course of fixedDenormalizedCourses) {
    try {
      let courseInDb = await db.course.findUnique({
        where: {
          courseIdentifier: {
            courseSubject: course.courseSubject,
            courseNumber: course.courseNumber
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
      if (!courseInDb) {
        courseInDb = await db.course.create({
          data: {
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
      }

      console.log(`Fixing ${courseInDb.name} (${courseInDb.id})`)

      // delete the old pre-requisites
      console.log("Deleting old prerequisites...")
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
      console.log("Adding new prerequisites...")
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
            console.log(`adding ${preqID.courseId} to ${courseInDb.id}`)
            courseRequisiteMapping.set(courseInDb.id, [
              ...(courseRequisiteMapping.get(courseInDb.id) ?? []),
              preqID.courseId
            ])
          }
        }
      }

      const updatedCourse = await db.course.findUnique({
        where: {
          courseIdentifier: {
            courseSubject: course.courseSubject,
            courseNumber: course.courseNumber
          }
        },
        include: {
          conditions: {
            include: {
              conditions: {
                include: {
                  prerequisites: {
                    include: {
                      course: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      console.log(`Updated Course in DB: ${JSON.stringify(updatedCourse?.name)}`)
    } catch (error) {
      console.error(
        `Error fixing course in DB: ${course.courseSubject} ${course.courseNumber}`,
        error
      )
    }
  }
  console.log(
    `Creating course requisites for ${courseRequisiteMapping.size} courses ${[...courseRequisiteMapping.keys()]}`
  )

  await db.courseRequisites.deleteMany()

  const courseRequisites: Prisma.CourseRequisitesCreateManyInput[] = [
    ...courseRequisiteMapping.keys()
  ]
    .map((courseId, _i) => {
      const reqForCourse = recursePrereqs(courseId, courseRequisiteMapping)
      return reqForCourse.map(reqId => ({
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

function recursePrereqs(k: string, courseRequisiteMapping: Map<string, string[]>): string[] {
  const requisites = courseRequisiteMapping.get(k)
  console.log(`${k} has ${requisites}`)
  if (!requisites) {
    return []
  }
  return [
    ...requisites,
    ...requisites.map(requisite => recursePrereqs(requisite, courseRequisiteMapping)).flat()
  ]
}
