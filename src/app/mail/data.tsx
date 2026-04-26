export const mails = [
  {
    id: "a1f9c2e4-7b33-4f91-9c2d-91ab77c44101",
    name: "Rohan Mehta",
    email: "rohan.mehta@techspark.io",
    subject: "AI Model Deployment Update",
    text: "Hey,\n\nWe've successfully deployed the new AI inference pipeline to staging. Latency is down by 32%, and memory usage looks stable under load testing.\n\nCan you review the logs once and confirm before we push to production tonight?\n\n– Rohan",
    date: "2024-11-14T08:45:00",
    read: false,
    labels: ["work", "ai", "deployment"],
  },
  {
    id: "c3b82d19-55aa-4f60-8b17-221fa9d2d902",
    name: "Ananya Kapoor",
    email: "ananya@finverse.co",
    subject: "Investor Deck Feedback",
    text: "Hi,\n\nWent through the latest pitch deck. The storytelling is strong, but the revenue slide needs clearer projections.\n\nLet’s tighten the TAM explanation as well.\n\nProud of the progress!\n\n– Ananya",
    date: "2024-11-12T11:20:00",
    read: true,
    labels: ["startup", "important"],
  },
  {
    id: "9f1d77aa-2e6f-41a4-8e4e-8819d2b5c333",
    name: "Kabir Sharma",
    email: "kabir@traveljunkie.com",
    subject: "Spiti Trip Plan 🏔️",
    text: "Bro,\n\nSpiti in December. No excuses.\n\nI’ve shortlisted homestays and a rental Thar. We leave Friday night.\n\nSay yes.\n\n– Kabir",
    date: "2024-11-10T19:05:00",
    read: true,
    labels: ["personal", "travel"],
  },
  {
    id: "f72b8c0e-3b91-44cb-b2c1-6f77d8e1a444",
    name: "Meera Iyer",
    email: "meera.iyer@corpgrid.com",
    subject: "Budget Variance Alert",
    text: "Hello,\n\nThere’s a 12% overspend in Q4 marketing allocation. Most of it is from paid campaigns.\n\nWe should rebalance before month-end.\n\nPlease review the attached sheet.\n\n– Meera",
    date: "2024-11-08T14:30:00",
    read: false,
    labels: ["finance", "work"],
  },
  {
    id: "bb12fdd1-8f40-4c1c-95a3-0e19f77d5555",
    name: "Arjun Nair",
    email: "arjun@productloop.dev",
    subject: "Feature Freeze Reminder",
    text: "Team,\n\nFeature freeze starts tomorrow 6 PM IST. Only critical bug fixes allowed after that.\n\nLet’s keep the release clean.\n\n– Arjun",
    date: "2024-11-05T09:10:00",
    read: false,
    labels: ["release", "work", "important"],
  },
  {
    id: "1c4e9aa0-77b2-4c61-a4c9-ff7733d16666",
    name: "Ishita Verma",
    email: "ishita@designhive.studio",
    subject: "Landing Page Redesign Draft",
    text: "Hi,\n\nSharing the new hero section mockups. I went bold with typography and darker gradients.\n\nFeedback welcome before we finalize animations.\n\n– Ishita",
    date: "2024-11-03T16:50:00",
    read: true,
    labels: ["design", "work"],
  },
  {
    id: "6a7e8d44-23d0-4a90-9c8b-11f0d8a17777",
    name: "Dev Malhotra",
    email: "dev@hacknight.in",
    subject: "Hackathon Idea Brainstorm",
    text: "Yo,\n\nWhat if we build a disaster prediction system using animal movement data + ML?\n\nCrazy? Maybe. Winning? Probably.\n\nLet’s jam tonight.\n\n– Dev",
    date: "2024-10-30T21:15:00",
    read: false,
    labels: ["hackathon", "ai"],
  },
  {
    id: "2d19f8bb-40e1-4a93-99f9-cc8844e18888",
    name: "Sneha Rao",
    email: "sneha.rao@cloudnest.io",
    subject: "AWS Billing Spike",
    text: "Hi,\n\nOur EC2 usage doubled this week. Looks like an autoscaling misconfiguration.\n\nPlease investigate before it burns more credits.\n\n– Sneha",
    date: "2024-10-28T13:25:00",
    read: true,
    labels: ["cloud", "urgent"],
  },
]

export type Mail = (typeof mails)[number]

export const accounts = [
  {
    label: "Piyush Work",
    email: "piyush@flixwood.ai",
    icon: (
      <svg role="img" viewBox="0 0 24 24">
        <title>Custom</title>
        <circle cx="12" cy="12" r="10" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: "Piyush Personal",
    email: "piyushgaur@gmail.com",
    icon: (
      <svg role="img" viewBox="0 0 24 24">
        <title>Mail</title>
        <rect x="3" y="5" width="18" height="14" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: "Side Projects",
    email: "build@piyush.dev",
    icon: (
      <svg role="img" viewBox="0 0 24 24">
        <title>Code</title>
        <path d="M8 5l-5 7 5 7M16 5l5 7-5 7" stroke="currentColor" fill="none" />
      </svg>
    ),
  },
]

export type Account = (typeof accounts)[number]

export const contacts = [
  { name: "Riya Malhotra", email: "riya@creativelabs.io" },
  { name: "Aditya Singh", email: "aditya@scaleup.tech" },
  { name: "Nikhil Arora", email: "nikhil@backendflow.dev" },
  { name: "Tanya Khurana", email: "tanya@brandverse.in" },
  { name: "Vihaan Kapoor", email: "vihaan@fintechx.com" },
  { name: "Kavya Nair", email: "kavya@uxcraft.studio" },
  { name: "Aryan Desai", email: "aryan@devopszone.io" },
  { name: "Simran Gill", email: "simran@marketpulse.co" },
  { name: "Yash Patel", email: "yash@datasprint.ai" },
  { name: "Aarav Bansal", email: "aarav@cloudshift.io" },
  { name: "Diya Menon", email: "diya@productlane.com" },
  { name: "Krish Verma", email: "krish@launchpad.dev" },
  { name: "Myra Shah", email: "myra@visiongrid.ai" },
  { name: "Rudra Joshi", email: "rudra@nextstack.io" },
  { name: "Ira Chatterjee", email: "ira@brandorbit.in" },
  { name: "Reyansh Sood", email: "reyansh@scalegrid.co" },
]

export type Contact = (typeof contacts)[number]
