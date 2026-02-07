export function Privacy() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-serif mb-8">Privacy Policy</h1>
        <div className="prose prose-invert prose-neutral max-w-none space-y-6 text-neutral-300">
          <p>
            At IV, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your information.
          </p>
          <h2 className="text-xl font-semibold text-white">1. Information We Collect</h2>
          <p>
            We collect information you provide directly, including your name, email address, company information,
            and any other data you submit through our platform.
          </p>
          <h2 className="text-xl font-semibold text-white">2. How We Use Your Information</h2>
          <p>
            We use the collected information to operate and improve our platform, facilitate connections between
            startups and investors, and communicate with you about your account.
          </p>
          <h2 className="text-xl font-semibold text-white">3. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal data against
            unauthorized access, alteration, disclosure, or destruction.
          </p>
          <h2 className="text-xl font-semibold text-white">4. Third-Party Integrations</h2>
          <p>
            When you connect third-party services (such as Stripe or Google Analytics), we access only the data
            necessary to provide our services. We do not sell your data to third parties.
          </p>
          <h2 className="text-xl font-semibold text-white">5. Contact</h2>
          <p>
            For questions about this Privacy Policy, please contact us at contact@ivholdings.com.
          </p>
        </div>
      </div>
    </div>
  );
}
