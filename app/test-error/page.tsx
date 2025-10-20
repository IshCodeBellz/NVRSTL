export const dynamic = "force-dynamic";

export default function TestErrorPage() {
  throw new Error("Test induced failure");
}
