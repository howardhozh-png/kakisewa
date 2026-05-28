// Mock LHDN e-Invois XML generator (UBL 2.1 / MyInvois format)
// Real submission requires MyInvois API credentials and digital signature

export interface LhdnInvoiceData {
  tenancyId: string;
  tenantName: string;
  tenantPhone: string;
  propertyName: string;
  amount: number;
  month: string;
}

export function buildLhdnXml(data: LhdnInvoiceData): string {
  const now = new Date();
  const invoiceDate = now.toISOString().split("T")[0];
  const invoiceId = `KAKISEWA-${data.tenancyId.toUpperCase()}-${now.getTime()}`;
  const amountStr = data.amount.toFixed(2);
  // Malaysia SST: residential rentals typically exempt, but template includes the field
  const taxAmount = "0.00";
  const total = data.amount.toFixed(2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">

  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ID>${invoiceId}</cbc:ID>
  <cbc:IssueDate>${invoiceDate}</cbc:IssueDate>
  <cbc:InvoiceTypeCode listID="1001">380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>MYR</cbc:DocumentCurrencyCode>
  <cbc:Note>${data.month} rental invoice — ${data.propertyName}</cbc:Note>

  <!-- Supplier (Landlord) -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:EndpointID schemeID="MY-TIN">KAKISEWA-LANDLORD</cbc:EndpointID>
      <cac:PartyName>
        <cbc:Name>kakisewa Property Management</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:CountrySubentity>Kuala Lumpur</cbc:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>MY</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Buyer (Tenant) -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cbc:EndpointID schemeID="MY-PHONE">${data.tenantPhone}</cbc:EndpointID>
      <cac:PartyName>
        <cbc:Name>${escapeXml(data.tenantName)}</cbc:Name>
      </cac:PartyName>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Tax total -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="MYR">${taxAmount}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="MYR">${amountStr}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="MYR">${taxAmount}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>E</cbc:ID>
        <cbc:Percent>0</cbc:Percent>
        <cbc:TaxExemptionReason>Residential rental — SST exempt</cbc:TaxExemptionReason>
        <cac:TaxScheme>
          <cbc:ID>SST</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <!-- Monetary totals -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="MYR">${amountStr}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="MYR">${amountStr}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="MYR">${total}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="MYR">${total}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Line item -->
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="MON">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="MYR">${amountStr}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>Monthly Rental — ${escapeXml(data.propertyName)} (${data.month})</cbc:Description>
      <cbc:Name>Residential Rental</cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="MYR">${amountStr}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>

</Invoice>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
