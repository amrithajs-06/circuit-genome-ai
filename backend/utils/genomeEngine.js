const fs = require("fs");
const path = require("path");

const LIBRARY = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "componentLibrary.json"), "utf-8")
);

function findInLibrary(name) {
  const norm = name.trim().toLowerCase();
  // exact match first, then partial match (e.g. "LM7805 5V reg" -> "LM7805")
  let hit = LIBRARY.find((c) => c.name.toLowerCase() === norm);
  if (!hit) hit = LIBRARY.find((c) => norm.includes(c.name.toLowerCase()));
  if (!hit) hit = LIBRARY.find((c) => c.name.toLowerCase().includes(norm));
  return hit || null;
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function starsFromPercent(pct) {
  return Math.round(clamp(pct) / 20); // 0-5 stars
}

/**
 * Analyze a circuit definition and produce the "Circuit Genome":
 * per-category scores, an overall project score, risk breakdown,
 * and rule-based recommendations.
 */
function analyzeCircuit({ voltage = 0, current = 0, components = [], application = "" }) {
  voltage = Number(voltage) || 0;
  current = Number(current) || 0; // mA

  const classified = components.map((raw) => ({ raw, meta: findInLibrary(raw) }));

  const counts = {
    ic: 0,
    passive: 0,
    resistor: 0,
    capacitor: 0,
    protection: 0,
    regulatorLinear: 0,
    regulatorSwitching: 0,
    relay: 0,
    heatProducing: 0,
    thermalMitigation: 0,
    unknown: 0,
  };

  let estimatedCost = 0;

  classified.forEach(({ raw, meta }) => {
    if (!meta) {
      counts.unknown += 1;
      return;
    }
    estimatedCost += meta.avgCost || 0;
    if (meta.category === "IC") counts.ic += 1;
    if (meta.category === "passive") counts.passive += 1;
    if (meta.type === "resistor") counts.resistor += 1;
    if (meta.type && meta.type.includes("apacitor")) counts.capacitor += 1;
    if (meta.isProtection) counts.protection += 1;
    if (meta.type === "linear_regulator") counts.regulatorLinear += 1;
    if (meta.type === "switching_regulator") counts.regulatorSwitching += 1;
    if (raw.toLowerCase().includes("relay")) counts.relay += 1;
    if (meta.heatProducing) counts.heatProducing += 1;
    if (meta.category === "thermal") counts.thermalMitigation += 1;
  });

  const totalComponents = components.length || 1;
  const recommendations = [];

  // ---------- Power / thermal analysis ----------
  let power = 90;
  if (counts.regulatorLinear > 0 && current > 300) {
    power -= 30;
    recommendations.push({
      issue: "High power consumption detected through a linear regulator.",
      recommendation: "Replace the linear regulator (e.g. LM7805) with a switching Buck Converter to cut heat loss and improve efficiency.",
      severity: "high",
    });
  } else if (counts.regulatorLinear > 0) {
    power -= 10;
  }
  if (counts.heatProducing > 1) {
    power -= 10;
  }
  power = clamp(power);

  // ---------- Safety analysis ----------
  let safety = 80;
  if (counts.relay > 0 && counts.protection === 0) {
    safety -= 25;
    recommendations.push({
      issue: "Relay present without a flyback/protection diode.",
      recommendation: "Add a flyback diode (e.g. 1N4007) across the relay coil to protect switching components from inductive kickback.",
      severity: "high",
    });
  }
  if (counts.protection > 0) safety += 10;
  if (voltage > 24 && counts.protection === 0) {
    safety -= 10;
    recommendations.push({
      issue: "Elevated supply voltage without visible protection components.",
      recommendation: "Add fuse and/or TVS diode protection at the power input.",
      severity: "medium",
    });
  }
  safety = clamp(safety);

  // ---------- Thermal / heat ----------
  let thermalRisk = 10;
  if (counts.heatProducing > 0 && counts.thermalMitigation === 0) {
    thermalRisk += 30;
    recommendations.push({
      issue: "Heat-producing components detected with no heatsink/thermal relief.",
      recommendation: "Add a heatsink to the regulator/power devices, or move to a switching topology to reduce dissipated heat.",
      severity: "medium",
    });
  }
  if (current > 500) thermalRisk += 15;
  thermalRisk = clamp(thermalRisk);

  // ---------- Complexity ----------
  let complexityRaw = counts.ic * 8 + counts.passive * 2 + totalComponents * 1.5;
  let complexity = clamp(100 - complexityRaw); // higher = simpler = "better" score
  if (counts.resistor > 6) {
    recommendations.push({
      issue: "Large number of discrete resistors detected.",
      recommendation: "Consider a resistor network / array package to simplify the BOM and PCB layout.",
      severity: "low",
    });
  }

  // ---------- Repairability ----------
  let repairability = 90;
  if (counts.ic > 5) repairability -= 15;
  if (totalComponents > 15) repairability -= 10;
  repairability = clamp(repairability);

  // ---------- Manufacturability ----------
  let manufacturability = 88;
  if (counts.unknown > 0) {
    manufacturability -= counts.unknown * 4;
  }
  if (totalComponents > 20) manufacturability -= 10;
  manufacturability = clamp(manufacturability);

  // ---------- Cost ----------
  const costRiskRaw = clamp((estimatedCost / (totalComponents * 2)) * 100);
  let cost = clamp(100 - costRiskRaw * 0.5);

  // ---------- Reliability & scalability (aggregate) ----------
  let reliability = clamp((safety + power + manufacturability) / 3);
  let scalability = clamp((complexity + manufacturability) / 2);

  const genome = {
    power: Math.round(power),
    reliability: Math.round(reliability),
    safety: Math.round(safety),
    complexity: Math.round(complexity),
    repairability: Math.round(repairability),
    manufacturing: Math.round(manufacturability),
    cost: Math.round(cost),
    scalability: Math.round(scalability),
  };

  const overallScore = Math.round(
    genome.power * 0.18 +
      genome.reliability * 0.18 +
      genome.safety * 0.2 +
      genome.complexity * 0.1 +
      genome.repairability * 0.12 +
      genome.manufacturing * 0.12 +
      genome.cost * 0.1
  );

  // ---------- Risk block ----------
  const electricalRisk = clamp(100 - safety);
  const costRisk = clamp(costRiskRaw);
  const manufacturingRisk = clamp(100 - manufacturability);
  const repairRisk = clamp(100 - repairability);
  const overallRisk = Math.round(
    (thermalRisk + electricalRisk + costRisk + manufacturingRisk + repairRisk) / 5
  );

  let status = "LOW";
  if (overallRisk > 60) status = "HIGH";
  else if (overallRisk > 30) status = "MEDIUM";

  if (recommendations.length === 0) {
    recommendations.push({
      issue: "No major issues detected by the rule engine.",
      recommendation: "Design looks solid. Consider adding decoupling capacitors near ICs as best practice.",
      severity: "info",
    });
  }

  return {
    genome,
    stars: Object.fromEntries(Object.entries(genome).map(([k, v]) => [k, starsFromPercent(v)])),
    overallScore,
    risk: {
      thermalRisk: Math.round(thermalRisk),
      electricalRisk: Math.round(electricalRisk),
      costRisk: Math.round(costRisk),
      manufacturingRisk: Math.round(manufacturingRisk),
      repairRisk: Math.round(repairRisk),
      overallRisk,
      status,
    },
    recommendations,
    breakdown: {
      totalComponents,
      estimatedCost: Number(estimatedCost.toFixed(2)),
      ...counts,
    },
  };
}

module.exports = { analyzeCircuit, findInLibrary, LIBRARY };
