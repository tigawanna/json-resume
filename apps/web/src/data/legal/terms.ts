import { AppConfig } from "@/utils/system";

export const termsOfService = {
  title: "Terms of Service",
  lastUpdated: "November 12, 2026",
  intro:
    "These terms cover the Crafted website and editor. The software is provided so you can keep a résumé library, tailor it, and export a PDF. You are responsible for what you submit to employers and to model providers.",
  sections: [
    {
      heading: "The product",
      body: "Crafted stores your career history as structured data and can tailor a résumé, cover letter or application answer from a job description you provide. You may self-host the MIT-licensed app or use a hosted workspace when one is offered.",
    },
    {
      heading: "Your content",
      body: "You keep ownership of the résumés, job descriptions and other text you enter. You give us permission to store and sync that content only as needed to run the features you turn on, such as an account or device sync.",
    },
    {
      heading: "Model providers",
      body: "Tailoring uses an API key you supply. Requests go to the provider behind that key, under that provider’s terms. You are responsible for the key, any usage cap you set, and the cost of those requests.",
    },
    {
      heading: "PDF export",
      body: "Exported PDFs are generated from your data as selectable text in a conventional résumé order. They are designed to be friendly to applicant tracking systems: real text rather than a picture of text, with recognizable section headings. A parser at a particular employer can still reject or misread a file. Check the PDF before you send it.",
    },
    {
      heading: "Acceptable use",
      body: "Do not use the service to break the law, to probe systems you do not own, or to upload content you have no right to use. Do not share another person’s private application materials without their permission.",
    },
    {
      heading: "Availability",
      body: "The local editor works without our servers. Hosted sign-in, sync and any waitlist features may change or pause. The app is provided as-is, without a warranty that a given employer’s system will parse every PDF.",
    },
    {
      heading: "Contact",
      body: `Questions about these terms: ${AppConfig.email}.`,
    },
  ],
} as const;
