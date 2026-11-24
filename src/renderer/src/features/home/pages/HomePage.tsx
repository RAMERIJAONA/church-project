import { useAppInfo } from '@renderer/lib/app-info.queries'
import { WelcomePanel } from '../components/WelcomePanel'

export function HomePage(): React.JSX.Element {
  const info = useAppInfo()
  return <WelcomePanel version={info.data?.version} />
}
