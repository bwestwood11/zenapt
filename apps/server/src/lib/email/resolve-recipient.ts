export const resolveRecipient = (recipient: string | string[]) => {
  if (process.env.NODE_ENV !== "development") {
    return recipient;
  }

  if (Array.isArray(recipient)) {
    return recipient.map(
      (email) => `delivered+${encodeURIComponent(email)}@resend.dev`,
    );
  }

  return `delivered+${encodeURIComponent(recipient)}@resend.dev`;
};