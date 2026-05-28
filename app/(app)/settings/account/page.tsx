import { getAgentProfile } from "@/lib/db";
import { AccountSettingsForm } from "@/components/account-settings-form";

export const metadata = { title: "Account settings — kakisewa" };

export default async function AccountSettingsPage() {
  const agent = await getAgentProfile();
  return (
    <div className="mx-auto max-w-[1440px] px-4 lg:px-8 py-10">
      <div className="mb-8">
        <p className="kk-overline mb-1">Settings</p>
        <h1 className="kk-h1" style={{ letterSpacing: "-0.02em" }}>Account settings</h1>
      </div>
      <AccountSettingsForm agent={agent} />
    </div>
  );
}
