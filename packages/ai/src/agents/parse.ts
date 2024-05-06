import { instructorOAI } from "@ai/lib/oai"
import { z } from "zod"

const parseSchema = z.object({
  name: z.string(),
  description: z.string(),
  creditHoursNeeded: z.number(),
  nonOverlapping: z.boolean(),
  courses: z.object({
    connect: z.array(
      z.object({
        courseIdentifier: z.object({
          courseSubject: z.string(),
          courseNumber: z.string()
        })
      })
    )
  })
})

const requirement = `CSE ELECTIVES: 12 CREDITS HOURS
CAP 4034 - Computer Animation Fundamentals Credit(s): 3
CAP 4103 - Mobile Biometrics Credit(s): 3
CAP 4111 - Introduction to Augmented and Virtual Reality Credit(s): 3
CAP 4160 - Brain-Computer Interfaces Credit(s): 3
CAP 4401 - Image Processing Fundamentals Credit(s): 3
CAP 4410 - Computer Vision Credit(s): 3
CAP 4628 - Affective Computing Credit(s): 3
CAP 4637 - Automated Reasoning and Theorem Proving Credit(s): 3
CAP 4641 - Natural Language Processing Credit(s): 3
CAP 4662 - Introduction to Robotics Credit(s): 3
CAP 4744 - Interactive Data Visualization Credit(s): 3
CDA 4203 - Computer System Design Credit(s): 3
CDA 4203L - Computer System Design Lab Credit(s): 1
CDA 4213 - CMOS-VLSI Design Credit(s): 3
CDA 4213L - CMOS-VLSI Design Lab Credit(s): 1
CDA 4253 - Field Programmable Gate Array System Design and Analysis Credit(s): 3
CDA 4321 - Cryptographic Hardware and Embedded Systems Credit(s): 3
CDA 4322 - Principles of Secure Hardware Design Credit(s): 3
CDA 4323 - Practical Hardware Security Credit(s): 3
CDA 4621 - Control of Mobile Robots Credit(s): 3
CEN 4072 - Software Testing Credit(s): 3
CIS 4212 - Privacy-Preserving and Trustworthy Cyber-Infrastructures Credit(s): 3
CIS 4345 - Big Data Storage and Analysis with Hadoop Credit(s): 3
CIS 4900 - Independent Study in Computer Science Credit(s): 1-5
CIS 4910 - Computer Science and Engineering Project Credit(s): 3
CIS 4915 - Supervised Research in Computer Science Credit(s): 1-5
CIS 4930 - Special Topics in Computer Science I Credit(s): 1-3 (See department website for list of approved topics)
CIS 4940 - Industry Internship Credit(s): 0-6
CNT 4004 - Computer Networks I Credit(s): 3
CNT 4411 - Computing and Network Security Credit(s): 3
COP 4020 - Programming Languages Credit(s): 3
COP 4365 - Software System Development Credit(s): 3
COP 4520 - Computing in Massively Parallel Systems Credit(s): 3
COP 4620 - Compilers Credit(s): 3
COP 4710 - Database Design Credit(s): 3
COT 4210 - Automata Theory and Formal Languages Credit(s): 3
COT 4521 - Computational Geometry Credit(s): 3
COT 4601 - Quantum Computing and Quantum Algorithms Credit(s): 3`

const completion = await instructorOAI.chat.completions.create({
  messages: [
    {
      role: "user",
      content: `parse the following requirement into a schema with its attributes and values
      
      DO NOT SKIP ANY INFORMATION
      ${requirement}
      `
    }
  ],
  model: "gpt-4-turbo-preview",
  temperature: 0.3,
  response_model: {
    name: "Requirement Parser",
    schema: parseSchema
  },
  stream: true
})

let result: Partial<z.infer<typeof parseSchema>> = {}

for await (const data of completion) {
  result = data
}

console.log(JSON.stringify(result, null, 2))
