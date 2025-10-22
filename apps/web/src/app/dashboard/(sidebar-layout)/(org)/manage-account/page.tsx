import { AccountSettings } from "@/components/manage-account/account-settings";


export default function AccountPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground">Account Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage your account information and preferences</p>
        </div>
        <AccountSettings />
      </div>
    </div>
  )
}
