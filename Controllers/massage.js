const twilio = require("twilio");
require("dotenv").config();

// Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

exports.sendWhatsAppMessage = async (req, res) => {
  const { phoneNumber, vehicleId, maintenanceData } = req.body;

  if (!phoneNumber || !vehicleId || !maintenanceData) {
    return res.status(400).json({ message: "phoneNumber, vehicleId, and maintenanceData required" });
  }

  const messageBody = maintenanceData
    .map(
      (m) =>
        `🔧 ${m.maintenanceItem} - Status: ${m.status}${
          m.nextMaintenanceDays ? ` (Next in ${m.nextMaintenanceDays} days)` : ""
        }`
    )
    .join("\n");

  try {
    const message = await client.messages.create({
      from: "whatsapp:+14155238886", // Twilio sandbox WhatsApp number
      to: `whatsapp:${phoneNumber}`,
      body: `Vehicle ID: ${vehicleId}\n${messageBody}`,
    });

    res.json({ message: "WhatsApp message sent!", sid: message.sid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send message", error: err.message });
  }
};
