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
                width="160"
                style={logo}
              />
            </Section>

            <Section style={badgeSection}>
              <Text style={badge}>EINLADUNG</Text>
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
              <Text style={featureItem}>
                <span style={featureDot}>✓</span>
                Arbeitszeiten erfassen
              </Text>

              <Text style={featureItem}>
                <span style={featureDot}>✓</span>
                Dienstpläne ansehen
              </Text>

              <Text style={featureItem}>
                <span style={featureDot}>✓</span>
                Urlaubsanträge stellen
              </Text>

              <Text style={featureItem}>
                <span style={featureDot}>✓</span>
                Korrekturanträge einreichen
              </Text>

              <Text style={featureItemLast}>
                <span style={featureDot}>✓</span>
                Arbeitszeitkonto und Urlaub einsehen
              </Text>
            </Section>

            <Section style={buttonSection}>
              <Button href={inviteUrl} style={button}>
                Jetzt Konto erstellen
              </Button>
            </Section>

            <Section style={infoBox}>
              <Text style={infoText}>
                Bitte kopiere den Einladungscode. Du benötigst ihn im
                nächsten Schritt, um dein Dipera-Konto mit deinem
                Mitarbeiterprofil zu verknüpfen.
              </Text>

              <Text style={codeLabel}>
                EINLADUNGSCODE
              </Text>

              <Text style={inviteCodeStyle}>
                {inviteCode}
              </Text>
            </Section>

            <Text style={fallbackText}>
              Falls der Button nicht funktioniert, kannst du diesen Link
              in deinem Browser öffnen:
            </Text>

            <Link href={inviteUrl} style={fallbackLink}>
              {inviteUrl}
            </Link>

            <Section style={securityBox}>
              <Text style={securityText}>
                Falls du diese Einladung nicht erwartet hast, kannst du
                diese E-Mail ignorieren.
              </Text>
            </Section>
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
  backgroundColor: "#F2F5F8",
  fontFamily:
    "'Be Vietnam Pro', Arial, Helvetica, sans-serif",
  color: "#323542",
};

const outerContainer = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "48px 20px",
};

const card = {
  backgroundColor: "#ffffff",
  borderRadius: "28px",
  padding: "44px 38px",
  textAlign: "left" as const,
};

const logoSection = {
  marginBottom: "34px",
  textAlign: "center" as const,
};

const logo = {
  width: "160px",
  height: "auto",
  margin: "0 auto",
};

const badgeSection = {
  textAlign: "center" as const,
  marginBottom: "16px",
};

const badge = {
  display: "inline-block",
  margin: "0",
  padding: "8px 14px",
  borderRadius: "999px",
  backgroundColor: "#F2F5F8",
  color: "#168FD0",
  fontSize: "11px",
  lineHeight: "1",
  fontWeight: "700",
  letterSpacing: "0.12em",
};

const heading = {
  margin: "0 auto 30px",
  maxWidth: "430px",
  fontSize: "34px",
  lineHeight: "1.15",
  fontWeight: "700",
  letterSpacing: "-1.2px",
  color: "#000000",
  textAlign: "center" as const,
};

const introText = {
  margin: "0 0 14px",
  fontSize: "15px",
  lineHeight: "1.7",
  color: "#323542",
};

const paragraph = {
  margin: "0 0 18px",
  fontSize: "15px",
  lineHeight: "1.7",
  color: "#667085",
};

const featureBox = {
  margin: "8px 0 30px",
  padding: "20px 22px",
  borderRadius: "18px",
  backgroundColor: "#F2F5F8",
};

const featureItem = {
  margin: "0 0 10px",
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#323542",
};

const featureItemLast = {
  margin: "0",
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#323542",
};

const featureDot = {
  display: "inline-block",
  marginRight: "10px",
  color: "#31AEF0",
  fontWeight: "700",
};

const buttonSection = {
  margin: "0 0 30px",
  textAlign: "center" as const,
};

const button = {
  display: "inline-block",
  backgroundColor: "#31AEF0",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "15px",
  fontWeight: "700",
  padding: "16px 30px",
  borderRadius: "14px",
};

const infoBox = {
  margin: "0 0 28px",
  padding: "20px 22px",
  borderRadius: "18px",
  backgroundColor: "#E7EDF1",
  textAlign: "center" as const,
};

const infoText = {
  margin: "0 0 18px",
  fontSize: "13px",
  lineHeight: "1.7",
  color: "#323542",
};

const codeLabel = {
  margin: "0 0 8px",
  fontSize: "10px",
  lineHeight: "1.4",
  fontWeight: "700",
  letterSpacing: "0.12em",
  color: "#667085",
};

const inviteCodeStyle = {
  display: "inline-block",
  margin: "0",
  padding: "10px 16px",
  borderRadius: "12px",
  backgroundColor: "#ffffff",
  fontSize: "17px",
  lineHeight: "1.5",
  fontWeight: "700",
  letterSpacing: "0.08em",
  color: "#000000",
  fontFamily: "'Courier New', monospace",
};

const fallbackText = {
  margin: "0 0 8px",
  fontSize: "13px",
  lineHeight: "1.7",
  color: "#8B93A1",
  textAlign: "center" as const,
};

const fallbackLink = {
  display: "block",
  margin: "0 auto",
  fontSize: "12px",
  lineHeight: "1.7",
  color: "#168FD0",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
  textAlign: "center" as const,
};

const securityBox = {
  marginTop: "30px",
  paddingTop: "22px",
  borderTop: "1px solid #E7EDF1",
};

const securityText = {
  margin: "0",
  fontSize: "13px",
  lineHeight: "1.7",
  color: "#8B93A1",
  textAlign: "center" as const,
};

const footer = {
  textAlign: "center" as const,
  margin: "26px 0 0",
  fontSize: "12px",
  lineHeight: "1.6",
  color: "#8B93A1",
};