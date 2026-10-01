export const KCC_PAYMENT_CONFIG = {
  payeeName: process.env.KCC_PAYEE_NAME || "KCC Cricket Ground",
  upiId: process.env.KCC_UPI_ID || "kccground@upi",
  paymentPhone: process.env.KCC_PAYMENT_PHONE || "9676601113",
  senderName: process.env.KCC_SENDER_NAME || "KCC Ground",
  senderEmail: process.env.GMAIL_USER || "kingsclubcricket@gmail.com",
  businessAddress: process.env.KCC_BUSINESS_ADDRESS || "KCC Ground address pending",
};

export function createUpiUrl(amount: number, reference: string) {
  const params = new URLSearchParams({
    pa: KCC_PAYMENT_CONFIG.upiId,
    pn: KCC_PAYMENT_CONFIG.payeeName,
    am: amount.toFixed(2),
    cu: "INR",
    tr: reference,
    tn: `KCC booking ${reference}`,
  });
  return `upi://pay?${params.toString()}`;
}

