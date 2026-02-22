import {
  Body,
  Container,
  Head,
  Html,
  Heading,
  Img,
  Section,
  Text,
} from "@react-email/components";

type AppointmentBookedEmailProps = {
  customerName: string;
  organizationName: string;
  locationName: string;
  serviceNames: string[];
  addOnNames?: string[];
  startTime: string;
  endTime: string;
  timeZone?: string;
  supportEmail?: string;
  logoUrl?: string;
};

export default function AppointmentBookedEmail({
  customerName,
  organizationName,
  locationName,
  serviceNames,
  addOnNames = [],
  startTime,
  endTime,
  timeZone,
  supportEmail = "support@zenapt.com",
  logoUrl = "https://www.zenapt.com/logo.svg",
}: Readonly<AppointmentBookedEmailProps>) {
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
          <Section
            style={{
              textAlign: "center",
              backgroundColor: "oklch(0.9402 0.0302 83.6329)",
              padding: "24px 24px 20px",
              borderBottom: "1px solid oklch(0.8765 0.0295 82.5897)",
            }}
          >
            <Img
              src={logoUrl}
              alt="ZenApt Logo"
              width="130"
              height="36"
              style={{ margin: "0 auto 14px", display: "block" }}
            />
            <Text
              style={{
                margin: "0 0 10px",
                display: "inline-block",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "oklch(0.5212 0.0823 62.3839)",
                border: "1px solid oklch(0.8765 0.0295 82.5897)",
                borderRadius: "999px",
                padding: "4px 10px",
                backgroundColor: "oklch(98.066% 0.00211 14.279)",
              }}
            >
              Booking Successful
            </Text>
            <Heading
              style={{
                fontFamily: "Playfair Display, serif",
                fontSize: "26px",
                fontWeight: 600,
                margin: "0 0 6px",
                color: "oklch(0.5212 0.0823 62.3839)",
              }}
            >
              Appointment Confirmed
            </Heading>
            <Text
              style={{
                margin: 0,
                fontSize: "14px",
                lineHeight: "1.5",
                color: "oklch(0.5534 0.0116 58.0708)",
              }}
            >
              We’ve reserved your slot and everything is set.
            </Text>
          </Section>

          <Section style={{ padding: "30px 30px 8px", textAlign: "center" }}>
            <Text
              style={{
                margin: 0,
                fontSize: "15px",
                color: "oklch(0.5534 0.0116 58.0708)",
                lineHeight: "1.6",
              }}
            >
              Hi <strong>{customerName}</strong>, your appointment with{" "}
              <strong>{organizationName}</strong> has been booked successfully.
            </Text>
          </Section>

          <Section style={{ padding: "24px 30px 0" }}>
            <Section
              style={{
                backgroundColor: "oklch(0.9402 0.0302 83.6329)",
                borderRadius: "10px",
                padding: "20px",
                border: "1px solid oklch(0.8765 0.0295 82.5897)",
              }}
            >
              <Text
                style={{
                  margin: "0 0 12px",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "oklch(0.5212 0.0823 62.3839)",
                }}
              >
                Appointment Details
              </Text>
              <Text
                style={{
                  margin: "6px 0",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  color: "oklch(0.4015 0.0436 37.9587)",
                }}
              >
                <strong>Location:</strong> {locationName}
              </Text>
              <Text
                style={{
                  margin: "6px 0",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  color: "oklch(0.4015 0.0436 37.9587)",
                }}
              >
                <strong>Starts:</strong> {startTime}
              </Text>
              <Text
                style={{
                  margin: "6px 0",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  color: "oklch(0.4015 0.0436 37.9587)",
                }}
              >
                <strong>Ends:</strong> {endTime}
              </Text>
              {timeZone ? (
                <Text
                  style={{
                    margin: "6px 0",
                    fontSize: "14px",
                    lineHeight: "1.6",
                    color: "oklch(0.4015 0.0436 37.9587)",
                  }}
                >
                  <strong>Timezone:</strong> {timeZone}
                </Text>
              ) : null}
            </Section>
          </Section>

          <Section style={{ padding: "12px 30px 0" }}>
            <Section
              style={{
                backgroundColor: "oklch(0.9402 0.0302 83.6329)",
                borderRadius: "10px",
                padding: "20px",
                border: "1px solid oklch(0.8765 0.0295 82.5897)",
              }}
            >
              <Text
                style={{
                  margin: "0 0 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "oklch(0.5212 0.0823 62.3839)",
                }}
              >
                Services
              </Text>
              <Text
                style={{
                  margin: 0,
                  fontSize: "14px",
                  lineHeight: "1.7",
                  color: "oklch(0.4015 0.0436 37.9587)",
                }}
              >
                {serviceNames.length > 0 ? serviceNames.join(" • ") : "-"}
              </Text>
            </Section>
          </Section>

          {addOnNames.length > 0 ? (
            <Section style={{ padding: "12px 30px 0" }}>
              <Section
                style={{
                  backgroundColor: "oklch(0.9402 0.0302 83.6329)",
                  borderRadius: "10px",
                  padding: "20px",
                  border: "1px solid oklch(0.8765 0.0295 82.5897)",
                }}
              >
                <Text
                  style={{
                    margin: "0 0 10px",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "oklch(0.5212 0.0823 62.3839)",
                  }}
                >
                  Add-ons
                </Text>
                <Text
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    lineHeight: "1.7",
                    color: "oklch(0.4015 0.0436 37.9587)",
                  }}
                >
                  {addOnNames.join(" • ")}
                </Text>
              </Section>
            </Section>
          ) : null}

          <Section
            style={{
              textAlign: "center",
              padding: "8px 30px 22px",
            }}
          >
            <Text
              style={{
                margin: 0,
                fontSize: "14px",
                color: "oklch(0.5534 0.0116 58.0708)",
                lineHeight: "1.6",
              }}
            >
              Need to make changes? Contact us at{" "}
              <a
                href={`mailto:${supportEmail}`}
                style={{
                  color: "oklch(0.5212 0.0823 62.3839)",
                  textDecoration: "underline",
                }}
              >
                {supportEmail}
              </a>{" "}
              .
            </Text>
          </Section>

          <Section
            style={{
              marginTop: "20px",
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
              {organizationName} • We look forward to seeing you
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

AppointmentBookedEmail.PreviewProps = {
  customerName: "Jane Doe",
  organizationName: "ZenApt",
  locationName: "Downtown Studio",
  serviceNames: ["Haircut", "Styling"],
  addOnNames: ["Scalp Massage"],
  startTime: "Sunday, February 23, 2026 at 10:00 AM",
  endTime: "Sunday, February 23, 2026 at 11:00 AM",
  timeZone: "America/New_York",
  supportEmail: "support@zenapt.com",
  logoUrl: "https://www.zenapt.com/logo.svg",
};
