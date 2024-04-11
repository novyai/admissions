import { Prisma } from "@repo/db"

export enum Program {
  "CS" = "CS",
  "DS" = "DS"
}

const CSE: Prisma.CourseScalarWhereInput = {
  id: {
    in: [
      "87675174-11fd-4f81-a0b9-6dfc80b1f29b",
      "6ce2a45d-749d-4695-8d7b-29961e38f1c6",
      "1665c198-ca4c-4864-940a-dc30eb56c254",
      "7dc1d852-e63a-4a6a-b1db-ed439f443613",
      "5a41371b-3275-4507-8dc4-5f75a7186fac",
      "23513c34-8285-432a-abe6-ec5daf607749",
      "0c990f7e-bbb2-4bea-9e50-6bdd1b29af01",
      "478849e5-1358-4f7e-b3d9-b0e224e4de54",
      "bd0e27c5-633c-4ad5-ae93-fb37d08337f0",
      "e40a5a17-fe90-4b8b-b75d-c41e508d74f9",
      "1736ce47-8b96-447d-b026-6ae3ad8e3680",
      "4b86edaa-168d-4289-aed4-0c43e1df75e4",
      "cb604716-5332-4835-a798-9f6f23bd2651",
      "d5579777-e77b-4ccf-adad-b5ab077ad923",
      "3452a5ee-05d1-481c-862e-3bde4ba1b053",
      "255afda2-4965-49d5-aec7-5d824295b44a",
      "e4079bdf-1c24-4d89-8aaf-5e18ff5229b8",
      "8006ca5b-0b8b-468e-b93f-03638d1af728",
      "b1538e5f-3fdf-4e8e-822f-683e9214f4e2",
      "1646a047-fde8-4a74-926e-edda5637fd8a",
      "99f7b5df-6526-4753-b198-3e305c4ece27",
      "959a8d60-17b9-4935-a8b1-a19c22542d72",
      "bbd24f53-921a-404d-818d-2e2e54373dba",
      "228aaf66-88c4-47f7-b8d7-b6513bfee507",
      "1937e508-681d-4ea9-87fd-29e51156d21d",
      "840c70bd-ba85-44ef-93bd-23168cbb86a5",
      "5820b8cd-753d-4f70-8d4c-a799611bd867",
      "34db46b5-f7d7-4c21-99b0-ba3ca06e0633",
      "ddb93b70-f341-4418-96b5-fdb76e393bc0",
      "83d19db2-f7c4-4a7e-9c52-b6268af8a7b7",
      "538c9b78-c543-45e9-a91b-4dfe9573c688",
      "35d262c2-e64f-4585-9330-7502d7c27500",
      "324964e7-e3ba-491c-8be8-26bd856a5842",
      "7849821d-82f3-4607-9245-41ed500f4a73",
      "56e69b02-9fc6-4f12-b969-eea50fe5b39e",
      "fb4474d7-31dc-4d18-a0ec-274b1c8e7fc8",
      "b0a850f8-ebf0-4f10-a1f3-ba73abc54abe",
      "900744d0-5846-41da-9e36-9dfe62afa6d3"
    ]
  }
}

type ProgramsCourses = {
  requiredCourses: Prisma.CourseWhereInput
  extraToQuery: Prisma.CourseWhereInput
}

export const programHandler: Record<Program, ProgramsCourses> = {
  [Program.CS]: {
    requiredCourses: CSE,
    extraToQuery: {}
  },
  [Program.DS]: {
    requiredCourses: {},
    extraToQuery: {}
  }
}
