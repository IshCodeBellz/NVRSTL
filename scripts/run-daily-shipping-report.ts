import { sendDailyOrderShippingReport } from "../lib/server/reports/orderShippingReport";

async function main() {
  const arg = process.argv[2];
  const date = arg ? new Date(arg) : new Date();
  const { count } = await sendDailyOrderShippingReport(date);
  console.log(
    `Daily shipping report sent for ${
      date.toISOString().split("T")[0]
    } (orders: ${count})`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
