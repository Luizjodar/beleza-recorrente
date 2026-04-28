import { TemaProvider } from '../lib/tema'
import Layout from '../components/Layout'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <TemaProvider>
      <Layout>{children}</Layout>
    </TemaProvider>
  )
}
