export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "Admissions",
  url: "https://admissions.ai",
  description: "",
  og: {
    title: "Admissions",
    description: ""
  },
  links: {},
  mainNav: [
    {
      label: "chat",
      url: "/chat"
    },
    {
      label: "schedule",
      url: "/schedule"
    }
  ]
}
