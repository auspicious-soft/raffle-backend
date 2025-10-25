import * as React from "react";
import {
  Html,
  Head,
  Container,
  Section,
  Text,
  Img,
  Button,
} from "@react-email/components";

interface PhysicalRaffleStatusEmailProps {
  userName?: string;
  raffleTitle: string;
  status: "SHIPPED" | "DELIVERED" | "CANCELED";
  trackingLink?: string; // optional, only for SHIPPED
  companyName?: string;
}

const PhysicalRaffleStatusEmail: React.FC<
  Readonly<PhysicalRaffleStatusEmailProps>
> = ({
  userName = "Participant",
  raffleTitle,
  status,
  trackingLink,
  companyName = "Your Company",
}) => {
  const statusMessages: Record<string, string> = {
    SHIPPED: "Your raffle prize has been shipped!",
    DELIVERED: "Your raffle prize has been delivered!",
    CANCELED: "Unfortunately, your raffle prize delivery has been canceled.",
  };

  const bodyMessages: Record<string, string> = {
    SHIPPED: "You can track your shipment using the link below.",
    DELIVERED: "We hope you enjoy your prize!",
    CANCELED:
      "We apologize for the inconvenience. Please contact support for assistance.",
  };

  return (
    <Html lang="en">
      <Head>
        <title>{statusMessages[status]}</title>
      </Head>
      <Container
        style={{
          maxWidth: "500px",
          margin: "0 auto",
          padding: "24px",
          backgroundColor: "#f9f9f9",
          borderRadius: "8px",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        <Section style={{ textAlign: "center" }}>
          <Img
            src="https://your-logo-url.com/logo.png"
            alt={`${companyName} Logo`}
            width="120"
            style={{ marginBottom: "20px" }}
          />
          <h1 style={{ color: "#333", fontSize: "24px", margin: "10px 0" }}>
            {statusMessages[status]}
          </h1>
          <Text
            style={{ fontSize: "16px", color: "#555", marginBottom: "12px" }}
          >
            Hi {userName},<br />
            {bodyMessages[status]}
            <br />
            Raffle: <strong>{raffleTitle}</strong>
          </Text>

          {status === "SHIPPED" && trackingLink && (
            <Button
              style={{
                backgroundColor: "#007bff",
                color: "#fff",
                textDecoration: "none",
                borderRadius: "6px",
                display: "inline-block",
                margin: "20px 0",
                padding: "12px 20px",
              }}
              href={trackingLink}
              target="_blank"
            >
              Track Your Shipment
            </Button>
          )}

          <Text style={{ fontSize: "14px", color: "#aaa", marginTop: "20px" }}>
            {companyName} Team
          </Text>
        </Section>
      </Container>
    </Html>
  );
};

export default PhysicalRaffleStatusEmail;
