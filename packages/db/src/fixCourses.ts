import { db, LogicalOperator, RequirementType } from "@db/client"
import fixedDenormalizedCourses from "@db/data/sheet/fixed_denormalized_courses.json"

export async function fixPrereqs() {
  for (const course of fixedDenormalizedCourses) {
    try {
      const courseInDb = await db.course.findUnique({
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
        console.error(`Course not found in DB: ${course.courseSubject} ${course.courseNumber}`)
      } else {
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
              console.log(
                `Adding prerequisite ${prerequisite.courseSubject} ${prerequisite.courseNumber}`
              )
              await db.prerequisite.create({
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
                }
              })
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

        console.log(`Updated Course in DB: ${JSON.stringify(updatedCourse)}`)
      }
    } catch (error) {
      console.error(
        `Error fixing course in DB: ${course.courseSubject} ${course.courseNumber}`,
        error
      )
    }
  }
}

fixPrereqs()
