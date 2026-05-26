// Whitepages Pro API - Phone intelligence
// Docs: https://pro.whitepages.com/developer/documentation/identity-check-api/

export interface WhitepagesPhoneResult {
  carrier: string;
  lineType: 'mobile' | 'voip' | 'landline';
  voipFlag?: string;
  numberAge: string;
  origin: string;
  active: boolean;
}

export async function lookupPhone(phone: string): Promise<WhitepagesPhoneResult> {
  const apiKey = process.env.WHITEPAGES_API_KEY;

  if (!apiKey || apiKey === 'YOUR_WHITEPAGES_PRO_KEY') {
    return getMockPhoneData(phone);
  }

  const cleaned = phone.replace(/\D/g, '');
  const url = `https://proapi.whitepages.com/3.3/phone?phone_number=${cleaned}&api_key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Whitepages API error: ${res.status}`);

  const data = await res.json();
  const result = data.results?.[0];

  return {
    carrier: result?.carrier?.name ?? 'Unknown',
    lineType: result?.line_type === 'NonFixedVOIP' ? 'voip' : result?.line_type === 'Mobile' ? 'mobile' : 'landline',
    voipFlag: result?.line_type === 'NonFixedVOIP' ? 'Number registered to a VoIP service. May indicate a secondary or temporary line.' : undefined,
    numberAge: result?.subscriber_age_months ? `${Math.round(result.subscriber_age_months / 12)} years` : '—',
    origin: result?.country_calling_code === '1' ? 'United States' : result?.country_calling_code ?? '—',
    active: result?.is_active ?? true,
  };
}

function getMockPhoneData(phone: string): WhitepagesPhoneResult {
  return {
    carrier: 'T-Mobile',
    lineType: 'mobile',
    numberAge: '4 years',
    origin: 'United States',
    active: true,
  };
}
