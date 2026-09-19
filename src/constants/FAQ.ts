export type FAQItem = {
  id: string;
  question: string;
  answer: string;
};

export const FAQs: FAQItem[] = [
  {
    id: "premium-without-account",
    question: "Do I need an account to buy Premium?",
    answer:
      "No. You can buy and use Premium without creating an account. Open the Billing tab and tap Buy Premium; it unlocks on this device straight away.",
  },
  {
    id: "premium-restore",
    question: "How do I get Premium back after reinstalling or on a new iPhone or iPad?",
    answer:
      "Open the Billing tab and tap Restore purchase while signed in to the App Store with the Apple Account you bought Premium with. No EU Work Support account is needed.",
  },
  {
    id: "premium-other-devices",
    question: "What does creating an account add?",
    answer:
      "An account is optional. If you create one or log in, your Premium and saved guides are linked to it, so you can use them on your other devices by logging in there. You can create an account at any time from the Profile tab.",
  },
  {
    id: "account-details",
    question: "How do I update my account details?",
    answer:
      "Open Profile, choose Account, then tap Edit Profile. You can update your first and last name from there.",
  },
  {
    id: "saved-guides",
    question: "Where can I find my saved guides?",
    answer:
      "Open the Saved tab from the bottom navigation. Countries and documents you bookmark will appear there.",
  },
  {
    id: "remove-saved-guide",
    question: "How do I remove a saved guide?",
    answer:
      "Tap the filled bookmark icon on a saved country or document. The item will be removed from your saved list.",
  },
  {
    id: "country-guides",
    question: "What information is included in country guides?",
    answer:
      "Country guides summarize work routes, visa documents, practical requirements, and helpful context for planning a move.",
  },
  {
    id: "document-guides",
    question: "How are document guides organized?",
    answer:
      "Document guides are grouped by country and category so you can quickly find visa, work, study, and relocation information.",
  },
  {
    id: "search",
    question: "How can I search for a specific country or document?",
    answer:
      "Use the Search tab to look for countries, guide titles, and document categories across the app.",
  },
  {
    id: "data-accuracy",
    question: "How often is the guidance updated?",
    answer:
      "Guidance is reviewed and refreshed as policies change, but you should always confirm important decisions with official government sources.",
  },
  {
    id: "report-issue",
    question: "What should I do if I find outdated information?",
    answer:
      "Open Profile, choose Support, then Report a Problem. Include the country or guide name so the team can review it faster.",
  },
  {
    id: "offline-access",
    question: "Can I use the app without an internet connection?",
    answer:
      "Some recently opened or saved information may appear from local cache, but fresh guide data and account changes need an internet connection.",
  },
  {
    id: "account-delete",
    question: "How do I delete my account?",
    answer:
      "Open Profile, choose Danger Zone, then follow the account deletion steps shown on that screen.",
  },
];
