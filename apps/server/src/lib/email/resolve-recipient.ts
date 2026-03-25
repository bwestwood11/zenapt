type RecipientResolutionStrategy = "default" | "resend";

const resolveDevelopmentRecipient = (
  email: string,
) => {
  const overrideRecipient = process.env.EMAIL_DEV_RECIPIENT;
  if (overrideRecipient) {
    return overrideRecipient;
  }

  const sinkDomain = process.env.EMAIL_DEV_SINK_DOMAIN;
  if (sinkDomain) {
    return `delivered+${encodeURIComponent(email)}@${sinkDomain}`;
  }


  return email;
};

export const resolveRecipient = (
  recipient: string | string[],
) => {
  if (process.env.NODE_ENV !== "development") {
    return recipient;
  }

  if (Array.isArray(recipient)) {
    return recipient.map((email) =>
      resolveDevelopmentRecipient(email),
    );
  }

  return resolveDevelopmentRecipient(recipient);
};