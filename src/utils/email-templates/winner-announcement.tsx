import * as React from "react";
import { Html, Head, Container, Section, Text, Img } from "@react-email/components";

interface RaffleAnnouncementEmailProps {
  raffleTitle: string;
  endDate: string | Date;
  companyName?: string;
}

export const RaffleAnnouncementEmail: React.FC<Readonly<RaffleAnnouncementEmailProps>> = ({
  raffleTitle,
  endDate,
  companyName,
}) => {
  const subject = `Raffle "${raffleTitle}" has concluded!`;
  const body = `The raffle you participated in has completed. The lucky winner has been selected. Check your profile to see the results and claim any rewards.`;

  return (
    <Html lang="en">
      <Head>
        <title>{subject}</title>
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
            alt="Company Logo"
            width="120"
            style={{ marginBottom: "20px" }}
          />
          <h1 style={{ color: "#333", fontSize: "24px", margin: "10px 0" }}>{subject}</h1>
          <Text style={{ fontSize: "16px", color: "#555", marginBottom: "12px" }}>{body}</Text>

          <Section
            style={{
              backgroundColor: "#ffffff",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #ddd",
              display: "inline-block",
              margin: "20px 0",
            }}
          >
            <Text
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "#111",
                marginBottom: "6px",
              }}
            >
              {companyName || "Your Company"}
            </Text>
            <Text style={{ fontSize: "16px", color: "#555" }}>
              Raffle Title: {raffleTitle}
            </Text>
            <Text style={{ fontSize: "14px", color: "#888", marginTop: "6px" }}>
              Ended on: {new Date(endDate).toDateString()}
            </Text>
          </Section>

          <Text style={{ fontSize: "14px", color: "#aaa", marginTop: "12px" }}>
            Thank you for participating! Keep an eye on your profile for rewards and future raffles.
          </Text>
        </Section>
      </Container>
    </Html>
  );
};

export default RaffleAnnouncementEmail;
