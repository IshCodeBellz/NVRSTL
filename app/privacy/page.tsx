export default function PrivacyPage() {
  return (
    <div className="prose max-w-3xl p-8">
      <h1>Privacy Policy</h1>
      <p>
        This demo application stores minimal personal data required to operate
        (account email, addresses, orders). No data is sold or shared with third
        parties except payment processing and email delivery providers you
        configure.
      </p>
      <h2>Data Retention</h2>
      <p>
        Orders and transactional records are retained for auditing and tax
        purposes. You can request deletion of your account (which anonymizes
        order ownership).
      </p>
      <h2>Cookies</h2>
      <p>
        Essential cookies maintain session authentication and cart integrity.
      </p>
    </div>
  );
}
