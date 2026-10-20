import { readFileSync, writeFileSync } from 'node:fs';
const directory = '.npm-cache/p12-r1';
const findings = new Map();
const images = [];
for (const image of ['postgres176', 'postgres1711', 'mailpit', 'mailpit-candidate']) {
  const sarif = JSON.parse(readFileSync(`${directory}/${image}.sarif.json`, 'utf8'));
  const local = new Set(), cves = new Set(), severity = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const run of sarif.runs) for (const rule of run.tool.driver.rules) {
    const properties = rule.properties, score = Number(properties['security-severity']);
    const band = score >= 9 ? 'critical' : score >= 7 ? 'high' : score >= 4 ? 'medium' : 'low';
    for (const component of properties.purls ?? []) {
      const key = `${rule.id}|${component}`;
      if (local.has(key)) continue;
      local.add(key); cves.add(rule.id); severity[band]++;
      const entry = findings.get(key) ?? { cve: rule.id, component, severity: band, fixedVersion: properties.fixed_version, images: [] };
      if (!entry.images.includes(image)) entry.images.push(image);
      findings.set(key, entry);
    }
  }
  images.push({ image, uniqueAdvisories: cves.size, uniqueCves: [...cves].filter(id=>id.startsWith('CVE-')).length, uniqueAdvisoryComponents: local.size, severity });
}
const audit = JSON.parse(readFileSync(`${directory}/audit-full-authorized.json`, 'utf8'));
const advisories = new Map();
for (const dependency of Object.values(audit.vulnerabilities)) for (const via of dependency.via) {
  if (typeof via !== 'object') continue;
  advisories.set(via.url, { url: via.url, package: via.name, severity: via.severity, affected: via.range });
}
const result = { generatedAt: new Date().toISOString(), images, uniqueImageAdvisories: new Set([...findings.values()].map(f => f.cve)).size, uniqueImageCves: new Set([...findings.values()].filter(f=>f.cve.startsWith('CVE-')).map(f => f.cve)).size,
  uniqueAdvisoryComponentVersionsAcrossImages: findings.size, npmPackageFindings: audit.metadata.vulnerabilities,
  npmUniqueAdvisories: [...advisories.values()], findings: [...findings.values()].sort((a,b) => a.cve.localeCompare(b.cve)) };
writeFileSync(`${directory}/security-deduplicated.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, findings: `${findings.size} detailed deduplicated rows retained in security-deduplicated.json` }, null, 2));
