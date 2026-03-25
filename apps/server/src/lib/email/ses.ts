import {
  CreateEmailIdentityCommand,
  DeleteEmailIdentityCommand,
  GetEmailIdentityCommand,
  PutEmailIdentityMailFromAttributesCommand,
  SESv2Client,
  SendEmailCommand,
  type BehaviorOnMxFailure,
  type GetEmailIdentityCommandOutput,
} from "@aws-sdk/client-sesv2";
import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { resolveRecipient } from "./resolve-recipient";

const DEFAULT_FROM_EMAIL = "support@zenapt.studio";
const DEFAULT_CHARSET = "UTF-8";

export type EmailRecipient = string | string[];

export type SendSesEmailInput = {
  to: EmailRecipient;
  subject: string;
  from?: string;
  cc?: EmailRecipient;
  bcc?: EmailRecipient;
  replyTo?: EmailRecipient;
  html?: string;
  text?: string;
  react?: ReactElement;
  configurationSetName?: string;
  tags?: Record<string, string>;
};

export type SendSesEmailResult = {
  messageId?: string;
};

export type SesVerificationStatus =
  | "NOT_STARTED"
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "TEMPORARY_FAILURE";

export type SesIdentityType = "EMAIL_ADDRESS" | "DOMAIN" | "MANAGED_DOMAIN";

export type SesMailFromBehavior = "USE_DEFAULT_VALUE" | "REJECT_MESSAGE";

export type SesEmailIdentity = {
  IdentityType?: SesIdentityType;
  VerifiedForSendingStatus?: boolean;
  VerificationStatus?: SesVerificationStatus;
  DkimAttributes?: {
    SigningEnabled?: boolean;
    Status?: SesVerificationStatus;
    Tokens?: string[];
    SigningHostedZone?: string;
    CurrentSigningKeyLength?: "RSA_1024_BIT" | "RSA_2048_BIT";
    NextSigningKeyLength?: "RSA_1024_BIT" | "RSA_2048_BIT";
  };
  MailFromAttributes?: {
    MailFromDomain: string;
    MailFromDomainStatus: Exclude<SesVerificationStatus, "NOT_STARTED">;
    BehaviorOnMxFailure: SesMailFromBehavior;
  };
  VerificationInfo?: {
    LastCheckedTimestamp?: string;
    LastSuccessTimestamp?: string;
    ErrorType?: string;
  };
  ConfigurationSetName?: string;
  FeedbackForwardingStatus?: boolean;
  Tags?: Array<{
    Key: string;
    Value: string;
  }>;
};

export type CreateSesEmailIdentityInput = {
  emailIdentity: string;
  configurationSetName?: string;
  tags?: Record<string, string>;
};

export type PutSesMailFromAttributesInput = {
  emailIdentity: string;
  mailFromDomain: string;
  behaviorOnMxFailure?: SesMailFromBehavior;
};

type SesEmailServiceConfig = {
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  endpoint?: string;
  defaultFrom?: string;
};

type AwsCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

export class SesApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "SesApiError";
  }
}

export class SesEmailService {
  private client?: SESv2Client;

  constructor(private readonly config: SesEmailServiceConfig = {}) {}

  async send(input: SendSesEmailInput): Promise<SendSesEmailResult> {
    const from =
      input.from ??
      this.config.defaultFrom ??
      process.env.FROM_EMAIL ??
      DEFAULT_FROM_EMAIL;

    const html = input.react ? await renderReactEmail(input.react) : input.html?.trim();
    const text = input.text?.trim() || (html ? htmlToText(html) : undefined);

    if (!html && !text) {
      throw new Error("SES email requires html, text, or react content.");
    }

    try {
      const response = await this.getClient().send(
        new SendEmailCommand({
          FromEmailAddress: from,
          Destination: {
            ToAddresses: this.normalizeRecipients(input.to),
            ...(input.cc
              ? { CcAddresses: this.normalizeRecipients(input.cc) }
              : {}),
            ...(input.bcc
              ? { BccAddresses: this.normalizeRecipients(input.bcc) }
              : {}),
          },
          Content: {
            Simple: {
              Subject: {
                Data: input.subject,
                Charset: DEFAULT_CHARSET,
              },
              Body: {
                ...(html
                  ? {
                      Html: {
                        Data: html,
                        Charset: DEFAULT_CHARSET,
                      },
                    }
                  : {}),
                ...(text
                  ? {
                      Text: {
                        Data: text,
                        Charset: DEFAULT_CHARSET,
                      },
                    }
                  : {}),
              },
            },
          },
          ...(input.replyTo
            ? { ReplyToAddresses: this.normalizeRecipients(input.replyTo) }
            : {}),
          ...(input.configurationSetName
            ? { ConfigurationSetName: input.configurationSetName }
            : {}),
          ...(input.tags
            ? {
                EmailTags: Object.entries(input.tags).map(([Name, Value]) => ({
                  Name,
                  Value,
                })),
              }
            : {}),
        }),
      );

      return {
        messageId: response.MessageId,
      };
    } catch (error) {
      throw this.toApiError(error);
    }
  }

  async createIdentity(
    input: CreateSesEmailIdentityInput,
  ): Promise<SesEmailIdentity> {
    try {
      const response = await this.getClient().send(
        new CreateEmailIdentityCommand({
          EmailIdentity: input.emailIdentity,
          ...(input.configurationSetName
            ? { ConfigurationSetName: input.configurationSetName }
            : {}),
          ...(input.tags
            ? {
                Tags: Object.entries(input.tags).map(([Key, Value]) => ({
                  Key,
                  Value,
                })),
              }
            : {}),
        }),
      );

      return this.mapIdentityResponse(response, input.emailIdentity);
    } catch (error) {
      throw this.toApiError(error);
    }
  }

  async getIdentity(emailIdentity: string): Promise<SesEmailIdentity> {
    try {
      const response = await this.getClient().send(
        new GetEmailIdentityCommand({
          EmailIdentity: emailIdentity,
        }),
      );

      return this.mapIdentityResponse(response, emailIdentity);
    } catch (error) {
      throw this.toApiError(error);
    }
  }

  async deleteIdentity(emailIdentity: string): Promise<void> {
    try {
      await this.getClient().send(
        new DeleteEmailIdentityCommand({
          EmailIdentity: emailIdentity,
        }),
      );
    } catch (error) {
      throw this.toApiError(error);
    }
  }

  async putIdentityMailFromAttributes(
    input: PutSesMailFromAttributesInput,
  ): Promise<void> {
    try {
      await this.getClient().send(
        new PutEmailIdentityMailFromAttributesCommand({
          EmailIdentity: input.emailIdentity,
          MailFromDomain: input.mailFromDomain,
          BehaviorOnMxFailure: (input.behaviorOnMxFailure ??
            "REJECT_MESSAGE") as BehaviorOnMxFailure,
        }),
      );
    } catch (error) {
      throw this.toApiError(error);
    }
  }

  private getClient() {
    if (this.client) {
      return this.client;
    }

    const region =
      this.config.region ?? process.env.SES_REGION ?? process.env.AWS_REGION;

    if (!region) {
      throw new Error("SES region is not configured.");
    }

    const credentials = this.getCredentials();

    this.client = new SESv2Client({
      region,
      ...(credentials ? { credentials } : {}),
      ...(this.config.endpoint ? { endpoint: this.config.endpoint } : {}),
    });

    return this.client;
  }

  private getCredentials(): AwsCredentials | undefined {
    const accessKeyId =
      this.config.accessKeyId ??
      process.env.AWS_ACCESS_KEY_ID ??
      process.env.SES_ACCESS_KEY ??
      process.env.AWS_ACCESS_KEY;
    const secretAccessKey =
      this.config.secretAccessKey ??
      process.env.AWS_SECRET_ACCESS_KEY ??
      process.env.SES_SECRET_KEY ??
      process.env.AWS_SECRET;
    const sessionToken =
      this.config.sessionToken ??
      process.env.AWS_SESSION_TOKEN ??
      process.env.SES_SESSION_TOKEN;

    if (!accessKeyId && !secretAccessKey) {
      return undefined;
    }

    if (!accessKeyId || !secretAccessKey) {
      throw new Error("SES credentials are partially configured.");
    }

    return {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken ? { sessionToken } : {}),
    };
  }

  private normalizeRecipients(recipient: EmailRecipient): string[] {
    const resolved = resolveRecipient(recipient);
    return Array.isArray(resolved) ? resolved : [resolved];
  }

  private mapIdentityResponse(
    response: GetEmailIdentityCommandOutput,
    emailIdentity: string,
  ): SesEmailIdentity {
    return {
      IdentityType: (response.IdentityType ??
        inferIdentityType(emailIdentity)) as SesIdentityType,
      VerifiedForSendingStatus: response.VerifiedForSendingStatus,
      VerificationStatus: response.VerificationStatus as SesVerificationStatus | undefined,
      DkimAttributes: response.DkimAttributes
        ? {
            SigningEnabled: response.DkimAttributes.SigningEnabled,
            Status: response.DkimAttributes.Status as SesVerificationStatus | undefined,
            Tokens: response.DkimAttributes.Tokens,
            CurrentSigningKeyLength: response.DkimAttributes.CurrentSigningKeyLength as
              | "RSA_1024_BIT"
              | "RSA_2048_BIT"
              | undefined,
            NextSigningKeyLength: response.DkimAttributes.NextSigningKeyLength as
              | "RSA_1024_BIT"
              | "RSA_2048_BIT"
              | undefined,
          }
        : undefined,
      MailFromAttributes: response.MailFromAttributes?.MailFromDomain
        ? {
            MailFromDomain: response.MailFromAttributes.MailFromDomain,
            MailFromDomainStatus: response.MailFromAttributes.MailFromDomainStatus as Exclude<
              SesVerificationStatus,
              "NOT_STARTED"
            >,
            BehaviorOnMxFailure: response.MailFromAttributes
              .BehaviorOnMxFailure as SesMailFromBehavior,
          }
        : undefined,
      VerificationInfo: response.VerificationInfo
        ? {
            LastCheckedTimestamp: response.VerificationInfo.LastCheckedTimestamp?.toISOString(),
            LastSuccessTimestamp: response.VerificationInfo.LastSuccessTimestamp?.toISOString(),
            ErrorType: response.VerificationInfo.ErrorType,
          }
        : undefined,
      ConfigurationSetName: response.ConfigurationSetName,
      FeedbackForwardingStatus: response.FeedbackForwardingStatus,
      Tags: response.Tags?.flatMap((tag: { Key?: string; Value?: string }) => {
        if (!tag.Key || !tag.Value) {
          return [];
        }

        return [{
          Key: tag.Key,
          Value: tag.Value,
        }];
      }),
    };
  }

  private toApiError(error: unknown) {
    if (error instanceof SesApiError) {
      return error;
    }

    if (error instanceof Error) {
      return new SesApiError(
        error.message,
        getErrorStatus(error),
        getErrorCode(error),
      );
    }

    return new SesApiError("SES request failed.", 500);
  }
}

export const sesEmailService = new SesEmailService();

const renderReactEmail = (email: ReactElement) => {
  const html = render(email);
  return html;
};

const htmlToText = (html: string) => {
  return html
    .replaceAll(/<style[\s\S]*?<\/style>/gi, " ")
    .replaceAll(/<script[\s\S]*?<\/script>/gi, " ")
    .replaceAll(/<br\s*\/?>/gi, "\n")
    .replaceAll(/<\/p>/gi, "\n\n")
    .replaceAll(/<\/div>/gi, "\n")
    .replaceAll(/<[^>]+>/g, " ")
    .replaceAll(/&nbsp;/gi, " ")
    .replaceAll(/&amp;/gi, "&")
    .replaceAll(/&lt;/gi, "<")
    .replaceAll(/&gt;/gi, ">")
    .replaceAll("\r", "")
    .replaceAll(/\n{3,}/g, "\n\n")
    .replaceAll(/[ \t]{2,}/g, " ")
    .trim();
};

const inferIdentityType = (emailIdentity: string) => {
  return emailIdentity.includes("@") ? "EMAIL_ADDRESS" : "DOMAIN";
};

const getErrorStatus = (error: Error) => {
  const metadata = (error as Error & { $metadata?: { httpStatusCode?: number } }).$metadata;
  return metadata?.httpStatusCode ?? 500;
};

const getErrorCode = (error: Error) => {
  return (error as Error & { name?: string }).name;
};
