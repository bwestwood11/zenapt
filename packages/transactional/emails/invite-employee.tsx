import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Img,
} from "@react-email/components";

type InvitationEmailProps = {
  userEmail: string;
  password: string;
  inviteLink: string;
  organization: string;
  role: string;
  logoUrl: string;
  supportEmail?: string;
};

export default function InvitationEmail({
  userEmail,
  password,
  inviteLink,
  organization,
  role,
  logoUrl,
  supportEmail = "support@example.com",
}: Readonly<InvitationEmailProps>) {
  return (
    <Html>
      <Head />
      <Body
        style={{
          backgroundColor: "oklch(.985 0 0)",
          color: "oklch(0.4015 0.0436 37.9587)",
          fontFamily: "Lato, Helvetica, Arial, sans-serif",
          margin: 0,
          padding: "20px",
        }}
      >
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: "oklch(98.066% 0.00211 14.279)",
            border: "1px solid oklch(0.8765 0.0295 82.5897)",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 4px 18px rgba(0,0,0,0.05)",
          }}
        >
          {/* Header / Logo */}
          <Section
            style={{
              textAlign: "center",
              backgroundColor: "oklch(0.9402 0.0302 83.6329)",
              padding: "24px",
              borderBottom: "1px solid oklch(0.8765 0.0295 82.5897)",
            }}
          >
            <Img
              src={logoUrl}
              alt={`${organization} Logo`}
              width="120"
              height="40"
              style={{ margin: "0 auto", display: "block" }}
            />
          </Section>

          {/* Intro */}
          <Section style={{ padding: "36px 30px 20px", textAlign: "center" }}>
            <Heading
              style={{
                fontFamily: "Playfair Display, serif",
                fontSize: "26px",
                fontWeight: 600,
                margin: "0 0 12px",
                color: "oklch(0.5212 0.0823 62.3839)",
              }}
            >
              Welcome to {organization}!
            </Heading>
            <Text
              style={{
                margin: 0,
                fontSize: "15px",
                color: "oklch(0.5534 0.0116 58.0708)",
                lineHeight: "1.6",
              }}
            >
              You’ve been invited to join <strong>{organization}</strong> as a{" "}
              <strong>{role}</strong>. We’re excited to have you onboard!
            </Text>
          </Section>

          {/* User Info Card */}
          <Section
            style={{
              backgroundColor: "oklch(0.9402 0.0302 83.6329)",
              borderRadius: "10px",
              padding: "20px",
              margin: "24px 30px",
              border: "1px solid oklch(0.8765 0.0295 82.5897)",
            }}
          >
            <Text
              style={{
                fontSize: "14px",
                margin: "6px 0",
                color: "oklch(0.4015 0.0436 37.9587)",
              }}
            >
              <strong>Email:</strong> {userEmail}
            </Text>
            <Text
              style={{
                fontSize: "14px",
                margin: "6px 0",
                color: "oklch(0.4015 0.0436 37.9587)",
              }}
            >
              <strong>Password:</strong> {password}
            </Text>
            <Text
              style={{
                fontSize: "14px",
                margin: "6px 0",
                color: "oklch(0.4015 0.0436 37.9587)",
              }}
            >
              <strong>Role:</strong> {role}
            </Text>
          </Section>

          {/* CTA */}
          <Section style={{ textAlign: "center" }}>
            <Button
              href={inviteLink}
              style={{
                backgroundColor: "oklch(0.5212 0.0823 62.3839)",
                color: "oklch(0.9735 0.0261 90.0953)",
                fontWeight: 600,
                fontSize: "14px",
                padding: "14px 32px",
                borderRadius: "6px",
                textDecoration: "none",
                fontFamily: "Lato, Helvetica, Arial, sans-serif",
                display: "inline-block",
              }}
            >
              Accept Invitation
            </Button>
          </Section>

          {/* Footer */}
          <Section
            style={{
              marginTop: "40px",
              textAlign: "center",
              padding: "20px 30px",
              borderTop: "1px solid oklch(0.8765 0.0295 82.5897)",
            }}
          >
            <Text
              style={{
                fontSize: "13px",
                color: "oklch(0.5534 0.0116 58.0708)",
                marginBottom: "6px",
              }}
            >
              {organization} • Building the future together
            </Text>
            <Text
              style={{
                fontSize: "12px",
                color: "oklch(0.5534 0.0116 58.0708)",
                lineHeight: "1.4",
              }}
            >
              For help, contact us at{" "}
              <a
                href={`mailto:${supportEmail}`}
                style={{
                  color: "oklch(0.5212 0.0823 62.3839)",
                  textDecoration: "underline",
                }}
              >
                {supportEmail}
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

InvitationEmail.PreviewProps = {
  userEmail: "brett@gmail.com",
  password: "asada5sd3",
  inviteLink: "https://react.email/docs/components/preview#preview",
  organization: "The Brett Industries",
  role: "ANALYST",
  logoUrl: "https://react.email/static/icons/gmail.svg",
  supportEmail: "support@zenapt.studio",
};
