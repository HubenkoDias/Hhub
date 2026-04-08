import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
export default function Terms() {
  const sections = [
    { title:'1. Acceptance', body:'By using HHub, you agree to these Terms. If you disagree, do not use the platform.' },
    { title:'2. Eligibility', body:'You must be 18 or older to use HHub.' },
    { title:'3. Account Registration', body:'Provide accurate information. You are responsible for your account security. Notify us of unauthorized access immediately.' },
    { title:'4. Platform Rules', body:'Do not post false information, impersonate others, spam, upload malware, scrape data, circumvent security, or use the platform illegally.' },
    { title:'5. QA Specialist Profiles', body:'All profile information must be accurate. False credentials may result in immediate termination. HHub reserves the right to reject any profile.' },
    { title:'6. Connections & Messaging', body:'HHub facilitates connections but is not responsible for outcomes. All communications must comply with community guidelines.' },
    { title:'7. Intellectual Property', body:'You retain ownership of uploaded content. By uploading, you grant HHub a license to display it as part of the service.' },
    { title:'8. Verification', body:'Verification indicates we reviewed the profile but does not guarantee skills. Companies should conduct their own due diligence.' },
    { title:'9. Limitation of Liability', body:'HHub is provided "as is". We are not liable for indirect or consequential damages.' },
    { title:'10. Termination', body:'We may suspend accounts violating these terms. You may delete your account at any time in settings.' },
    { title:'11. Contact', body:'legal@hhub.com' },
  ]
  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#EAE7E0] pt-16">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <p className="section-tag mb-3">Legal</p>
          <h1 style={{ fontFamily:'var(--font-display)' }} className="text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-[#0F0F0F]/40 text-sm font-mono mb-10">Last updated: April 2025</p>
          <div className="space-y-8 text-[#0F0F0F]/70 leading-relaxed">
            {sections.map(({ title, body }) => (
              <div key={title}>
                <h2 style={{ fontFamily:'var(--font-display)' }} className="text-xl font-bold text-[#0F0F0F] mb-3">{title}</h2>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer/>
    </>
  )
}
