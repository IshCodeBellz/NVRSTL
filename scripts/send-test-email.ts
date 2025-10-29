import { getMailer } from "../lib/server/mailer";

async function main() {
  const to = process.argv[2] || process.env.MAIL_TO || "info@nvrstl.co.uk";
  const subject = process.argv[3] || "NVRSTL Test Email";
  const mailer = getMailer();

  await mailer.send({
    to,
    subject,
    text: "This is a test email from NVRSTL.",
    html: `<p>This is a <strong>test email</strong> from NVRSTL.</p>`,
  });

  console.log(`✅ Test email sent to ${to}`);
}

main().catch((err) => {
  console.error("❌ Failed to send test email:", err);
  process.exit(1);
});

