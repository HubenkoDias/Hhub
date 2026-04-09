import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
export default function Privacy() {
  const sections = [
    { title:'Early Access Notice', body:'HHub is currently in early access (beta). The platform may contain bugs, errors, or unexpected behavior. We cannot guarantee the availability, accuracy, or security of the service at all times. By using HHub during this period, you acknowledge and accept these limitations. We are not liable for any data loss, service interruptions, or damages resulting from the early access nature of the platform. Use it at your own risk.' },
    { title:'1. Introduction', body:'HHub operates this platform to connect QA specialists with companies. This Privacy Policy explains how we collect, use, and protect your information.' },
    { title:'2. Information We Collect', body:'We collect: account details (name, email), profile information (photo, bio, skills, certificates), company information, messages and uploaded files, and usage data (browser, pages visited).' },
    { title:'3. How We Use Your Information', body:'To provide and maintain the platform, verify QA profiles, facilitate connections, send notifications, improve services, comply with legal obligations, and prevent fraud.' },
    { title:'4. Information Sharing', body:'We do not sell your data. We share with: other users (your public profile), Supabase (infrastructure), Vercel (hosting), and law enforcement when legally required.' },
    { title:'5. Data Security & Limitations', body:'We implement security measures including encrypted connections and row-level database security. However, given the early access nature of HHub, we cannot guarantee complete data security. The platform may experience downtime, data inconsistencies, or loss. We strongly recommend not storing critical or irreplaceable information on the platform during this period.' },
    { title:'6. Data Retention', body:'We retain your data while your account is active. You can request deletion at any time by contacting us. Note that during early access, database resets or migrations may affect stored data.' },
    { title:'7. Your Rights', body:'You can access, correct, delete, or export your data. Contact privacy@hhub.com to exercise these rights.' },
    { title:'8. Cookies', body:'We use only essential cookies for authentication. We do not use advertising or tracking cookies.' },
    { title:'9. Children', body:'HHub is not directed at children under 18. We do not knowingly collect data from children.' },
    { title:'10. Changes', body:'We may update this policy. Users will be notified of significant changes via email.' },
    { title:'11. Contact', body:'privacy@hhub.com' },
  ]
  return (
    <>
      <Navbar/>
      <div className="min-h-screen bg-[#F5F4F1] pt-14">
        <div className="max-w-3xl mx-auto px-6 py-14">
          <p className="section-tag mb-3">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-[#111]/40 text-sm font-mono mb-10">Last updated: April 2026</p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-10">
            <p className="text-sm font-semibold text-amber-800 mb-1">⚠ Early Access Platform</p>
            <p className="text-sm text-amber-700">HHub is in early access. Data loss or service interruptions may occur. Do not store critical data on this platform during this period.</p>
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
