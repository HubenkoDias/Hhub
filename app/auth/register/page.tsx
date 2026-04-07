import AuthPage from '@/components/AuthPage'
import { Suspense } from 'react'
export default function Register() {
  return <Suspense><AuthPage mode="register"/></Suspense>
}
