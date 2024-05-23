import { db } from "../client"

export async function getTrack(trackId: string) {
  try {
    const track = await db.track.findUnique({
      where: {
        id: trackId
      },
      include: {
        requirements: {
          include: {
            courses: {
              select: {
                id: true,
                name: true,
                creditHours: true,
                courseRequisites: {
                  select: {
                    requisitesId: true
                  }
                },
                requirements: {
                  select: {
                    id: true,
                    requirementGroup: {
                      select: {
                        id: true,
                        name: true
                      }
                    },
                    requirementSubgroup: {
                      select: {
                        id: true,
                        name: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
    return track
  } catch (error) {
    console.error("Failed to retrieve track:", error)
    return null
  }
}
