import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
export default function Privacy() {
  const sections = [
    { title:'1. Introduction', body:'HHub operates the HHub platform. This Privacy Policy explains how we collect, use, and safeguard your information. By using the platform, you agree to this policy.' },
    { title:'2. Information We Collect', body:'We collect: account details (name, email), profile information (photo, bio, skills, certificates), company information, messages and uploaded files, and usage data (IP, browser, pages visited).' },
    { title:'3. How We Use Your Information', body:'To provide and maintain the platform, verify QA profiles, facilitate connections, send notifications, improve services, comply with legal obligations, and prevent fraud.' },
    { title:'4. Information Sharing', body:'We do not sell your data. We share with: other users (your public profile), Supabase (infrastructure), Vercel (hosting), and law enforcement when legally required.' },
    { title:'5. Data Security', body:'Data is stored securely using Supabase with encryption in transit and at rest, row-level security, and regular security reviews.' },
    { title:'6. Your Rights', body:'You can access, correct, delete, or export your data. Contact privacy@hhub.com to exercise these rights.' },
    { title:'7. Cookies', body:'We use only essential cookies for authentication. We do not use advertising or tracking cookies.' },
    { title:'8. Children', body:'HHub is not directed at children under 18. We do not knowingly collect data from children.' },
    { title:'9. Changes', body:'We may update this policy and will notify users of significant changes by email.' },
    { title:'10. Contact', body:'privacy@hhub.com' },
  ]
  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#EAE7E0] pt-16">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <p className="section-tag mb-3">Legal</p>
          <h1 style={{ fontFamily:'var(--font-display)' }} className="text-4xl font-bold mb-2">Privacy Policy</h1>
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
