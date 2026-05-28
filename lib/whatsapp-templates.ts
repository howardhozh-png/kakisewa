// WhatsApp template definitions + resolver.
// Templates use {{variableName}} placeholders replaced at send time.

export type TemplateKey =
  | "owner_outreach_initial"
  | "owner_outreach_followup"
  | "owner_intake_form"
  | "expiry_check_tenant"
  | "expiry_check_owner"
  | "rent_reminder";

export interface TemplateVar { key: string; description: string }

export interface TemplateSpec {
  key: TemplateKey;
  label: string;
  description: string;
  defaultBody: string;
  variables: TemplateVar[];
}

export const TEMPLATE_SPECS: TemplateSpec[] = [
  {
    key: "owner_outreach_initial",
    label: "Owner outreach — First contact",
    description: "Sent when you first reach out to a new owner lead.",
    defaultBody:
`Hi {{ownerName}}! I'm {{agentName}}{{agencyLine}}.

I'd love to help you find a quality tenant for {{propertyName}}. No charge until we close a deal.

Are you looking to rent it out?
— {{agentName}}`,
    variables: [
      { key: "ownerName",    description: "Owner's full name" },
      { key: "agentName",    description: "Your name" },
      { key: "agencyLine",   description: "' from Agency' or blank" },
      { key: "propertyName", description: "Property name + unit" },
    ],
  },
  {
    key: "owner_outreach_followup",
    label: "Owner outreach — Follow-up",
    description: "Sent as a follow-up when the owner hasn't responded.",
    defaultBody:
`Hi {{ownerName}}! Following up on {{propertyName}}.

Still looking to rent it out, or have you decided to keep it for own stay?

Just reply here so I can update my notes.
— {{agentName}}`,
    variables: [
      { key: "ownerName",    description: "Owner's full name" },
      { key: "agentName",    description: "Your name" },
      { key: "propertyName", description: "Property name + unit" },
    ],
  },
  {
    key: "owner_intake_form",
    label: "New Leads: Owner",
    description: "Sent to collect property details and list the unit.",
    defaultBody:
`Great day to you! I'm {{firstName}} from {{company}}. If you're looking to rent out {{propertyName}}, I have a few quality tenants in queue.

30 secs from you and I'll take care of the rest:
{{listingForm}}

Here's a sample of tenant package I put together for you:
{{tenantSamplePack}}`,
    variables: [
      { key: "firstName",        description: "Your first name" },
      { key: "company",          description: "Your agency / company name" },
      { key: "propertyName",     description: "Property name + unit" },
      { key: "tenantSamplePack", description: "Link to sample tenant pack" },
      { key: "listingForm",      description: "Owner intake form link" },
    ],
  },
  {
    key: "expiry_check_tenant",
    label: "Renewal: Tenant",
    description: "Sent to tenant when their lease is approaching expiry.",
    defaultBody:
`Hi {{tenantName}}! {{agentLine}}Your tenancy at *{{propertyName}}* is expiring {{expiryWhen}}. Just tap the link to let me know if you're planning to stay:

{{renewalForm}}`,
    variables: [
      { key: "tenantName",   description: "Tenant's full name" },
      { key: "agentLine",    description: "'I'm Name from Agency. ' or blank" },
      { key: "propertyName", description: "Property name" },
      { key: "expiryWhen",   description: "'in 5 days' / 'today' / '3 days ago'" },
      { key: "renewalForm",  description: "Renewal form link" },
    ],
  },
  {
    key: "expiry_check_owner",
    label: "Renewal: Owner",
    description: "Sent to owner when their tenant's lease is approaching expiry.",
    defaultBody:
`Hi {{ownerName}}! {{agentLine}}The tenancy at *{{propertyName}}* with {{tenantName}} is expiring {{expiryWhen}}. Just tap the link to let me know if you'd like to continue renting it out:

{{renewalForm}}`,
    variables: [
      { key: "ownerName",    description: "Owner's full name" },
      { key: "agentLine",    description: "'I'm Name from Agency. ' or blank" },
      { key: "propertyName", description: "Property name" },
      { key: "tenantName",   description: "Tenant's full name" },
      { key: "expiryWhen",   description: "'in 5 days' / 'today' / '3 days ago'" },
      { key: "renewalForm",  description: "Renewal form link" },
    ],
  },
  {
    key: "rent_reminder",
    label: "Rent reminder",
    description: "Monthly reminder to tenant that rent is due.",
    defaultBody:
`Hi {{tenantName}}, this is a friendly reminder that your rent of RM{{amount}} for *{{propertyName}}* is due.

Please upload your payment receipt here: {{uploadUrl}}

Thank you!`,
    variables: [
      { key: "tenantName",   description: "Tenant's full name" },
      { key: "amount",       description: "Rent amount e.g. 2500.00" },
      { key: "propertyName", description: "Property name" },
      { key: "uploadUrl",    description: "Receipt upload link" },
    ],
  },
];

export type TemplateOverrides = Partial<Record<TemplateKey, string>>;

/** Replace {{variable}} placeholders with runtime values. Falls back to defaultBody if no override stored. */
export function resolveTemplate(
  key: TemplateKey,
  overrides: TemplateOverrides,
  vars: Record<string, string>
): string {
  const spec = TEMPLATE_SPECS.find((t) => t.key === key)!;
  const body = overrides[key] ?? spec.defaultBody;
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

export function parseTemplateOverrides(raw: string | null | undefined): TemplateOverrides {
  if (!raw) return {};
  try { return JSON.parse(raw) as TemplateOverrides; } catch { return {}; }
}
