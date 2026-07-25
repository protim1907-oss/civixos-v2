// Check email-auth DNS records for the outreach sending domain.
// Run: npm run check:dns
import { promises as dns } from "node:dns";

const DOMAIN = process.argv[2] || "bidsprointernational.com";

function first(records, needle) {
  for (const r of records) {
    const joined = Array.isArray(r) ? r.join("") : String(r);
    if (joined.toLowerCase().includes(needle)) return joined;
  }
  return null;
}

async function txt(name) {
  try {
    return await dns.resolveTxt(name);
  } catch {
    return [];
  }
}

console.log(`\nEmail-auth DNS for ${DOMAIN}\n${"-".repeat(40)}`);

const spf = first(await txt(DOMAIN), "v=spf1");
console.log(spf ? `SPF    ✅  ${spf}` : "SPF    ❌  missing");

const dmarc = first(await txt(`_dmarc.${DOMAIN}`), "v=dmarc1");
console.log(dmarc ? `DMARC  ✅  ${dmarc}` : "DMARC  ❌  missing (add TXT at _dmarc)");

let dkim = null;
for (const sel of ["zmail", "zoho", "default", "s1"]) {
  const rec = first(await txt(`${sel}._domainkey.${DOMAIN}`), "v=dkim1");
  if (rec) {
    dkim = `${sel}`;
    break;
  }
}
console.log(dkim ? `DKIM   ✅  selector "${dkim}" present` : "DKIM   ❌  no known selector found");

let mx = [];
try {
  mx = await dns.resolveMx(DOMAIN);
} catch {}
console.log(`MX     ${mx.length ? "✅  " + mx.map((m) => m.exchange).join(", ") : "❌  none"}`);
console.log("");
