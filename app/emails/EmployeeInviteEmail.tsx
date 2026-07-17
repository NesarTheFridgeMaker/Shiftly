import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";

type EmployeeInviteEmailProps = {
  employeeName: string;
  businessName: string;
  inviteCode: string;
  inviteUrl: string;
};

export default function EmployeeInviteEmail({
  employeeName,
  businessName,
  inviteCode,
  inviteUrl,
}: EmployeeInviteEmailProps) {
  return (
    <Html lang="de">
      <Head />

      <Preview>
        {businessName} hat dich zu Dipera eingeladen.
      </Preview>

      <Body style={body}>
        <Container style={outerContainer}>
          <Section style={card}>
            <Section style={logoSection}>
              <Img
                src="https://app.dipera.de/logo/dipera-logo-dark.png"
                alt="Dipera"
                width="180"
                style={logo}
              />
            </Section>

            <Heading style={heading}>
              Du wurdest zu Dipera eingeladen
            </Heading>

            <Text style={introText}>
              Hallo <strong>{employeeName}</strong>,
            </Text>

            <Text style={paragraph}>
              <strong>{businessName}</strong> hat dich eingeladen, dein
              persönliches Dipera-Konto zu erstellen.
            </Text>

            <Text style={paragraph}>
              Über dein Mitarbeiterkonto kannst du künftig:
            </Text>

            <Section style={featureBox}>
              <Text style={featureItem}>• Arbeitszeiten erfassen</Text>
              <Text style={featureItem}>• Dienstpläne ansehen</Text>
              <Text style={featureItem}>• Urlaubsanträge stellen</Text>
              <Text style={featureItem}>• Korrekturanträge einreichen</Text>
              <Text style={featureItem}>
                • Arbeitszeitkonto und Urlaub einsehen
              </Text>
            </Section>

            <Section style={buttonSection}>
              <Button href={inviteUrl} style={button}>
                Jetzt Konto erstellen
              </Button>
            </Section>

            <Section style={infoBox}>
              <Text style={infoText}>
                Bitte kopiere den Einladungscode.
Du benötigst ihn im nächsten Schritt, um dein Dipera-Konto mit deinem Mitarbeiterprofil zu verknüpfen.
              </Text>

              <Text style={codeLabel}>Einladungscode</Text>

              <Text style={inviteCodeStyle}>{inviteCode}</Text>
            </Section>

            <Text style={fallbackText}>
              Falls der Button nicht funktioniert, kannst du diesen Link in
              deinem Browser öffnen:
            </Text>

            <Link href={inviteUrl} style={fallbackLink}>
              {inviteUrl}
            </Link>

            <Text style={securityText}>
              Falls du diese Einladung nicht erwartet hast, kannst du diese
              E-Mail ignorieren.
            </Text>
          </Section>

          <Text style={footer}>
            © 2026 Dipera · Arbeitszeiten digital. Schichtplanung einfach.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  margin: "0",
  padding: "0",
  backgroundColor: "#f7f7f8",
  fontFamily: "Arial, Helvetica, sans-serif",
  color: "#0b1220",
};

const outerContainer = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "48px 20px",
};

const card = {
  backgroundColor: "#ffffff",
  borderRadius: "28px",
  padding: "42px 36px",
  boxShadow: "0 20px 50px rgba(15, 23, 42, 0.12)",
  textAlign: "center" as const,
};

const logoSection = {
  marginBottom: "34px",
};

const logo = {
  width: "180px",
  height: "auto",
  margin: "0 auto",
};

const heading = {
  margin: "0 0 22px",
  fontSize: "34px",
  lineHeight: "1.15",
  fontWeight: "300",
  letterSpacing: "-1px",
  color: "#08245c",
};

const introText = {
  margin: "0 0 14px",
  fontSize: "15px",
  lineHeight: "1.7",
  color: "#334155",
  textAlign: "left" as const,
};

const paragraph = {
  margin: "0 0 18px",
  fontSize: "15px",
  lineHeight: "1.7",
  color: "#64748b",
  textAlign: "left" as const,
};

const featureBox = {
  margin: "8px 0 30px",
  padding: "20px 22px",
  borderRadius: "18px",
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  textAlign: "left" as const,
};

const featureItem = {
  margin: "0 0 8px",
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#334155",
};

const buttonSection = {
  margin: "0 0 30px",
};

const button = {
  display: "inline-block",
  backgroundColor: "#1d4ed8",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "16px",
  fontWeight: "600",
  padding: "15px 30px",
  borderRadius: "14px",
};

const infoBox = {
  margin: "0 0 28px",
  padding: "18px 20px",
  borderRadius: "18px",
  backgroundColor: "#eff6ff",
  border: "1px solid #dbeafe",
};

const infoText = {
  margin: "0 0 14px",
  fontSize: "13px",
  lineHeight: "1.7",
  color: "#475569",
};

const codeLabel = {
  margin: "0 0 6px",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "#64748b",
};

const inviteCodeStyle = {
  margin: "0",
  fontSize: "17px",
  lineHeight: "1.5",
  fontWeight: "700",
  letterSpacing: "0.08em",
  color: "#08245c",
  fontFamily: "Courier New, monospace",
};

const fallbackText = {
  margin: "0 0 8px",
  fontSize: "13px",
  lineHeight: "1.7",
  color: "#94a3b8",
};

const fallbackLink = {
  display: "block",
  margin: "0 auto",
  fontSize: "12px",
  lineHeight: "1.7",
  color: "#1d4ed8",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
};

const securityText = {
  margin: "30px 0 0",
  fontSize: "13px",
  lineHeight: "1.7",
  color: "#94a3b8",
};

const footer = {
  textAlign: "center" as const,
  margin: "26px 0 0",
  fontSize: "12px",
  lineHeight: "1.6",
  color: "#94a3b8",
};