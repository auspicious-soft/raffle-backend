import React from "react";

interface IWinnerEmailProps {
  userName: string;
  raffleTitle: string;
  promoCode?: string;
  companyName?: string;
}

const WinnerRewardEmail: React.FC<IWinnerEmailProps> = ({
  userName,
  raffleTitle,
  promoCode,
  companyName = "Your Company",
}) => {
  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        lineHeight: 1.6,
        color: "#333",
        padding: "20px",
      }}
    >
      <h2 style={{ color: "#007bff" }}>Congratulations, {userName}!</h2>
      <p>
        You have successfully redeemed your reward for the raffle:{" "}
        <strong>{raffleTitle}</strong>.
      </p>

      {promoCode && (
        <p>
          Your exclusive promo code:{" "}
          <span
            style={{
              backgroundColor: "#f0f0f0",
              padding: "5px 10px",
              borderRadius: "5px",
              fontWeight: "bold",
            }}
          >
            {promoCode}
          </span>
        </p>
      )}

      <p>
        {companyName} thanks you for participating and we hope you enjoy your
        reward!
      </p>

      <p>Best regards,</p>
      <p>{companyName} Team</p>
    </div>
  );
};

export default WinnerRewardEmail;
