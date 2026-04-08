export type UserRole     = 'qa' | 'company' | 'admin'
export type VerifStatus  = 'pending' | 'verified' | 'rejected'
export type ConnStatus   = 'pending' | 'accepted' | 'declined'
export type Availability = 'full-time' | 'part-time' | 'freelance' | 'not-available'

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
export const AVAIL_LABELS: Record<string,string> = {
  'full-time':'Full-time','part-time':'Part-time',
  'freelance':'Freelance','not-available':'Not available',
}
export const EXPERIENCE_LEVELS = ['0-1 years','1-3 years','3-5 years','5-10 years','10+ years']
