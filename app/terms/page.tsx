import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
export default function Terms() {
  const sections = [
    { title:'Early Access & Beta Disclaimer', body:'HHub is currently in early access (beta stage). The service is provided "as is" and may be unavailable, unstable, or subject to changes at any time without notice. We reserve the right to reset, modify, or discontinue any features during this period. By using HHub, you accept that features may change, data may be lost, and the service may be interrupted without prior notice or compensation.' },
    { title:'1. Acceptance', body:'By using HHub, you agree to these Terms. If you disagree, do not use the platform. We may update these terms at any time.' },
    { title:'2. Eligibility', body:'You must be at least 18 years old to use HHub.' },
    { title:'3. Account Registration', body:'Provide accurate information. You are responsible for your account security. Notify us immediately of unauthorized access.' },
    { title:'4. Platform Rules', body:'You must not post false information, impersonate others, spam users, upload malicious files, attempt to compromise security, or use the platform for any illegal purpose.' },
    { title:'5. QA Specialist Profiles', body:'All profile information must be accurate. False credentials will result in immediate account termination. HHub reserves the right to reject any profile at its discretion.' },
    { title:'6. Connections & Messaging', body:'HHub facilitates connections but is not responsible for their outcomes. All communications must be professional and lawful.' },
    { title:'7. Uploaded Content', body:'You retain ownership of content you upload. You are solely responsible for ensuring uploaded content does not violate any laws or third-party rights. We may remove content that violates these terms without notice.' },
    { title:'8. Data & Privacy During Early Access', body:'During the early access phase, we cannot guarantee complete data security or persistence. Users should maintain backups of important information. HHub is not liable for data loss occurring during this period.' },
    { title:'9. Limitation of Liability', body:'HHub is provided "as is" without warranties of any kind. We are not liable for indirect, incidental, or consequential damages. Our total liability shall not exceed the amount paid by you to HHub in the preceding 12 months, which during early access may be zero.' },
    { title:'10. Termination', body:'We may suspend or terminate accounts violating these terms at any time without notice. You may delete your account in settings at any time.' },
    { title:'11. Contact', body:'legal@hhub.com' },
  ]
  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#F5F4F1] pt-14">
        <div className="max-w-3xl mx-auto px-6 py-14">
          <p className="section-tag mb-3">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Terms of Service</h1>
          <p className="text-[#111]/40 text-sm font-mono mb-10">Last updated: April 2026</p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-10">
            <p className="text-sm font-semibold text-amber-800 mb-1">⚠ Early Access Platform</p>
            <p className="text-sm text-amber-700">HHub is in early access. Features may change, services may be interrupted, and data may be lost. By continuing to use the platform you accept these limitations.</p>
          </div>
          <div className="space-y-8 text-[#111]/70 leading-relaxed">
            {sections.map(({ title, body }) => (
              <div key={title}>
                <h2 className="text-lg font-bold text-[#111] mb-2">{title}</h2>
                <p className="text-sm">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer/>
    </>
  )
}
