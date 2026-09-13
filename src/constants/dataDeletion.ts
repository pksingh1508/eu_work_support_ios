export const dataDeletion = {
  title: "EU Work Support Data Deletion Policy",
  lastUpdated: "May 26, 2026",
  blocks: [
    {
      type: "paragraph",
      text: "This Data Deletion Policy explains how EU Work Support users can delete their account and request deletion of personal data. It is designed to support Apple App Store and Google Play requirements for apps that allow users to create accounts.",
    },
    {
      type: "heading",
      text: "Account Deletion in the App",
    },
    {
      type: "paragraph",
      text: "Users can initiate account deletion inside the app through Profile > Danger Zone > Delete Account.",
    },
    {
      type: "paragraph",
      text: "The app asks for confirmation before deletion because account deletion is intended to be permanent.",
    },
    {
      type: "heading",
      text: "What We Delete",
    },
    {
      type: "paragraph",
      text: "When account deletion is completed, we delete or de-identify personal data associated with the account, including:",
    },
    {
      type: "bullets",
      items: [
        "Authentication account identifier where deletion is supported by the authentication provider",
        "Email address stored in the app database",
        "First name and last name stored in the app database",
        "Profile image URL stored in the app database",
        "Saved countries",
        "Saved documents or guides",
        "Account-linked app preferences where applicable",
      ],
    },
    {
      type: "heading",
      text: "What May Be Retained Temporarily",
    },
    {
      type: "paragraph",
      text: "Some information may remain for a limited period when necessary for:",
    },
    {
      type: "bullets",
      items: [
        "Backup restoration windows",
        "Security logs",
        "Fraud or abuse prevention",
        "Legal compliance",
        "Dispute resolution",
        "Debugging deletion failures",
      ],
    },
    {
      type: "paragraph",
      text: "Where retained, this information is limited to what is necessary and is not used for marketing.",
    },
    {
      type: "heading",
      text: "Expected Deletion Timeline",
    },
    {
      type: "paragraph",
      text: "In-app account deletion is designed to begin immediately after the user confirms deletion.",
    },
    {
      type: "paragraph",
      text: "Most active account records should be deleted or de-identified promptly. Backup copies, logs, and security records may take longer to expire from all systems. Unless a longer retention period is required for legal, security, or fraud-prevention reasons, we aim to complete deletion from active systems within 30 days.",
    },
    {
      type: "heading",
      text: "Manual Deletion Requests",
    },
    {
      type: "paragraph",
      text: "If a user cannot access the app or account deletion does not work, they may request deletion by contacting support@euworksupport.eu.",
    },
    {
      type: "paragraph",
      text: "The request should include the email address associated with the account. We may ask for reasonable verification before deleting data to protect the account from unauthorized deletion.",
    },
    {
      type: "heading",
      text: "Saved Items Deletion Without Account Deletion",
    },
    {
      type: "paragraph",
      text: "Users can delete saved countries and saved documents without deleting their entire account by using the saved or bookmark controls in the app. Removing a saved item deletes that saved relationship from the account.",
    },
    {
      type: "heading",
      text: "Support Requests",
    },
    {
      type: "paragraph",
      text: "Support emails or problem reports may be retained after account deletion if needed to handle the request, comply with law, prevent misuse, or maintain security records. Users may request deletion of support records by emailing support@euworksupport.eu.",
    },
    {
      type: "heading",
      text: "No Payment Data",
    },
    {
      type: "paragraph",
      text: "EU Work Support does not collect payment in the mobile app. Therefore, there is no in-app payment card data to delete.",
    },
    {
      type: "heading",
      text: "Third-Party Providers",
    },
    {
      type: "paragraph",
      text: "EU Work Support uses third-party providers such as Clerk for authentication and Supabase for backend data storage. Account deletion may require deletion or de-identification of data across these providers. We use these providers to operate core app features, not for selling user data.",
    },
    {
      type: "heading",
      text: "App Store and Play Store Account Deletion Alignment",
    },
    {
      type: "paragraph",
      text: "Apple requires apps that support account creation to let users initiate account deletion in the app. Google Play requires developers to provide users with a way to request account and data deletion and disclose those deletion practices. This policy and the in-app Danger Zone flow are intended to support those requirements.",
    },
    {
      type: "heading",
      text: "Contact",
    },
    {
      type: "paragraph",
      text: "For deletion questions or requests, contact support@euworksupport.eu.",
    },
  ],
} as const;
