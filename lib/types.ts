export type UserRole   = 'qa' | 'company' | 'admin'
export type VerifStatus = 'pending' | 'verified' | 'rejected'
export type ConnStatus  = 'pending' | 'accepted' | 'declined'
export type Availability = 'full-time' | 'part-time' | 'freelance' | 'not-available'

export interface QAProfile {
  id: string; user_id: string; full_name: string; photo_url: string | null
  title: string; bio: string; years_experience: number; skills: string[]
  availability: Availability; hourly_rate: number | null; location: string
  linkedin_url: string | null; github_url: string | null
  verification_status: VerifStatus; verification_note: string | null
  is_public: boolean; created_at: string; updated_at: string
}
export interface Certificate {
  id: string; qa_profile_id: string; name: string; issuer: string
  certificate_id: string; issued_date: string | null; description: string
  image_url: string | null; created_at: string
}
export interface CompanyProfile {
  id: string; user_id: string; company_name: string; logo_url: string | null
  website: string | null; description: string; industry: string
  company_size: string; location: string; contact_email: string
  created_at: string; updated_at: string
}

export const QA_SKILLS = [
  'Manual Testing','Automation Testing','Selenium','Cypress','Playwright',
  'Jest','Postman','API Testing','Performance Testing','Security Testing',
  'Mobile Testing','Agile/Scrum','JIRA','TestRail','Load Testing',
  'Regression Testing','Unit Testing','Integration Testing','CI/CD',
  'Python','JavaScript','Java','TypeScript','SQL','Docker',
]
export const INDUSTRIES = [
  'FinTech','HealthTech','E-commerce','SaaS','Gaming','EdTech',
  'Logistics','Marketing Tech','CyberSecurity','AI/ML','Blockchain','Other',
]
export const COMPANY_SIZES = ['1-10','11-50','51-200','201-500','500+']
export const AVAIL_LABELS: Record<string, string> = {
  'full-time':'Full-time','part-time':'Part-time',
  'freelance':'Freelance','not-available':'Not available',
}
