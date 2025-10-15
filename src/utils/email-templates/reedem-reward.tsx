import * as React from "react";
import { Html, Head, Container, Section, Text, Img } from "@react-email/components";

interface RedeemRewardEmailProps {
  redemptionCode: string;
  expiryDate: string | Date;
  price?: number;
  companyName?: string;
}

export const RedeemRewardEmail: React.FC<Readonly<RedeemRewardEmailProps>> = ({
  redemptionCode,
  expiryDate,
  price,
  companyName,
}) => {
  const subject = "Your Reward Gift Card is Ready!";
  const body = "Congratulations! You have successfully redeemed your reward. Use the details below to claim it.";

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
                fontSize: "20px",
                fontWeight: "bold",
                color: "#111",
                marginBottom: "6px",
              }}
            >
              {companyName || "Your Reward"}
            </Text>
            <Text
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#111",
                letterSpacing: "4px",
              }}
            >
              {redemptionCode}
            </Text>
            {price && (
              <Text style={{ fontSize: "16px", color: "#555", marginTop: "4px" }}>
                Value: ${price}
              </Text>
            )}
            <Text style={{ fontSize: "14px", color: "#888", marginTop: "6px" }}>
              Valid till: {new Date(expiryDate).toDateString()}
            </Text>
          </Section>

          <Text style={{ fontSize: "14px", color: "#aaa", marginTop: "12px" }}>
            Please redeem it before the expiry date. After that, it will no longer be valid.
          </Text>
        </Section>
      </Container>
    </Html>
  );
};

export default RedeemRewardEmail;
