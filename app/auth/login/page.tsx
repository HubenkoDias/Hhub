import AuthPage from '@/components/AuthPage'
import { Suspense } from 'react'
export default function Login() {
  return <Suspense><AuthPage mode="login"/></Suspense>
}
