import { ExtensionSetupGuide } from '@/features/social/components/ExtensionSetupGuide'
import { SocialAccountsSettings } from '@/features/social/components/SocialAccountsSettings'
import { SocialTargetsSettings } from '@/features/social/components/SocialTargetsSettings'
import { APITokenCard } from '@/features/social/components/APITokenCard'
import { ExtensionSettingsForm } from '@/features/social/components/ExtensionSettingsForm'
import { ExtensionConnector } from '@/features/social/components/ExtensionConnector'

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-app-muted">Cài đặt</p>
        <h1 className="mt-1 text-2xl text-midnight-ink md:text-3xl">Phân phối mạng xã hội</h1>
        <p className="mt-2 max-w-[760px] text-sm leading-6 text-dark-charcoal">
          Kết nối tài khoản để đăng sau khi đã duyệt bản nháp. Amplify luôn yêu cầu bạn xác nhận trước khi đăng.
        </p>
      </header>
      <APITokenCard />
      <ExtensionConnector />
      <ExtensionSetupGuide />
      <ExtensionSettingsForm />
      <SocialAccountsSettings />
      <SocialTargetsSettings />
    </div>
  )
}
