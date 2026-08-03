const fs = require("fs");
const path = require("path");

const LIBRARY = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "componentLibrary.json"), "utf-8")
);

function findInLibrary(name) {
  const norm = name.trim().toLowerCase();
  let hit = LIBRARY.find((c) => c.name.toLowerCase() === norm);
  if (!hit) hit = LIBRARY.find((c) => norm.includes(c.name.toLowerCase()));
  if (!hit) hit = LIBRARY.find((c) => c.name.toLowerCase().includes(norm));
  return hit || null;
}

function findByName(name) {
  return LIBRARY.find((c) => c.name.toLowerCase() === name.toLowerCase()) || null;
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function starsFromPercent(pct) {
  return Math.round(clamp(pct) / 20);
}

/**
 * Extract the numeric feature vector used by both the rule engine and the
 * ML comparison layer, so the two scoring paths see exactly the same inputs.
 */
function extractFeatures({ voltage = 0, current = 0, components = [] }) {
  voltage = Number(voltage) || 0;
  current = Number(current) || 0;

  const classified = components.map((raw) => ({ raw, meta: findInLibrary(raw) }));
  const counts = {
    ic: 0, passive: 0, resistor: 0, capacitor: 0, protection: 0,
    regulatorLinear: 0, regulatorSwitching: 0, relay: 0,
    heatProducing: 0, thermalMitigation: 0, unknown: 0,
  };
  let estimatedCost = 0;

  classified.forEach(({ raw, meta }) => {
    if (!meta) { counts.unknown += 1; return; }
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
  return { voltage, current, counts, estimatedCost, totalComponents, classified };
}

/**
 * Analyze a circuit definition and produce the "Circuit Genome": per-category
 * scores, an overall project score, risk breakdown, rule-based recommendations
 * (with concrete component substitutions where applicable), and a full
 * explainability trace of every rule that touched a score.
 */
function analyzeCircuit({ voltage = 0, current = 0, components = [], application = "" }) {
  const { counts, estimatedCost, totalComponents } = extractFeatures({ voltage, current, components });
  voltage = Number(voltage) || 0;
  current = Number(current) || 0;

  const recommendations = [];
  const trace = { power: [], reliability: [], safety: [], complexity: [], repairability: [], manufacturing: [], cost: [], scalability: [] };
  const log = (dim, delta, reason) => trace[dim].push({ delta, reason });

  // ---------- Power / thermal analysis ----------
  let power = 90;
  log("power", 90, "Baseline power-efficiency score.");
  if (counts.regulatorLinear > 0 && current > 300) {
    power -= 30;
    log("power", -30, "Linear regulator detected with current draw above 300 mA — significant efficiency loss as heat.");
    recommendations.push({
      dimension: "power",
      issue: "High power consumption detected through a linear regulator.",
      recommendation: "Replace the linear regulator (e.g. LM7805) with a switching Buck Converter to cut heat loss and improve efficiency.",
      severity: "high",
      substitutes: [findByName("Buck Converter")].filter(Boolean),
    });
  } else if (counts.regulatorLinear > 0) {
    power -= 10;
    log("power", -10, "Linear regulator present; efficiency loss modest at this current level.");
  }
  if (counts.heatProducing > 1) {
    power -= 10;
    log("power", -10, "Multiple heat-producing components increase overall power dissipation.");
  }
  power = clamp(power);

  // ---------- Safety analysis ----------
  let safety = 80;
  log("safety", 80, "Baseline safety score.");
  if (counts.relay > 0 && counts.protection === 0) {
    safety -= 25;
    log("safety", -25, "Inductive relay load present without a flyback/protection diode.");
    recommendations.push({
      dimension: "safety",
      issue: "Relay present without a flyback/protection diode.",
      recommendation: "Add a flyback diode (e.g. 1N4007) across the relay coil to protect switching components from inductive kickback.",
      severity: "high",
      substitutes: [findByName("1N4007"), findByName("TVS Diode")].filter(Boolean),
    });
  }
  if (counts.protection > 0) {
    safety += 10;
    log("safety", 10, "Protection component(s) present, reducing electrical risk.");
  }
  if (voltage > 24 && counts.protection === 0) {
    safety -= 10;
    log("safety", -10, "Elevated supply voltage (>24V) with no protection components detected.");
    recommendations.push({
      dimension: "safety",
      issue: "Elevated supply voltage without visible protection components.",
      recommendation: "Add fuse and/or TVS diode protection at the power input.",
      severity: "medium",
      substitutes: [findByName("Fuse"), findByName("TVS Diode")].filter(Boolean),
    });
  }
  safety = clamp(safety);

  // ---------- Thermal / heat ----------
  let thermalRisk = 10;
  if (counts.heatProducing > 0 && counts.thermalMitigation === 0) {
    thermalRisk += 30;
    recommendations.push({
      dimension: "power",
      issue: "Heat-producing components detected with no heatsink/thermal relief.",
      recommendation: "Add a heatsink to the regulator/power devices, or move to a switching topology to reduce dissipated heat.",
      severity: "medium",
      substitutes: [findByName("Heatsink")].filter(Boolean),
    });
  }
  if (current > 500) thermalRisk += 15;
  thermalRisk = clamp(thermalRisk);

  // ---------- Complexity ----------
  let complexityRaw = counts.ic * 8 + counts.passive * 2 + totalComponents * 1.5;
  let complexity = clamp(100 - complexityRaw);
  log("complexity", Math.round(100 - complexityRaw) - 100, `${counts.ic} IC(s) and ${counts.passive} passive(s) across ${totalComponents} total components.`);
  if (counts.resistor > 6) {
    recommendations.push({
      dimension: "complexity",
      issue: "Large number of discrete resistors detected.",
      recommendation: "Consider a resistor network / array package to simplify the BOM and PCB layout.",
      severity: "low",
      substitutes: [],
    });
  }

  // ---------- Repairability ----------
  let repairability = 90;
  log("repairability", 90, "Baseline repairability score.");
  if (counts.ic > 5) {
    repairability -= 15;
    log("repairability", -15, "More than 5 ICs increases field-repair difficulty.");
  }
  if (totalComponents > 15) {
    repairability -= 10;
    log("repairability", -10, "Component count above 15 increases troubleshooting time.");
  }
  repairability = clamp(repairability);

  // ---------- Manufacturability ----------
  let manufacturability = 88;
  log("manufacturing", 88, "Baseline manufacturability score.");
  if (counts.unknown > 0) {
    manufacturability -= counts.unknown * 4;
    log("manufacturing", -(counts.unknown * 4), `${counts.unknown} component(s) not recognized in the component library.`);
  }
  if (totalComponents > 20) {
    manufacturability -= 10;
    log("manufacturing", -10, "High component count increases assembly complexity.");
  }
  manufacturability = clamp(manufacturability);

  // ---------- Cost ----------
  const costRiskRaw = clamp((estimatedCost / (totalComponents * 2)) * 100);
  let cost = clamp(100 - costRiskRaw * 0.5);
  log("cost", Math.round(cost) - 100, `Estimated BOM cost ~$${estimatedCost.toFixed(2)} across ${totalComponents} component(s).`);

  // ---------- Reliability & scalability (aggregate) ----------
  let reliability = clamp((safety + power + manufacturability) / 3);
  let scalability = clamp((complexity + manufacturability) / 2);
  log("reliability", 0, "Aggregate of safety, power, and manufacturability scores.");
  log("scalability", 0, "Aggregate of complexity and manufacturability scores.");

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
      dimension: "reliability",
      issue: "No major issues detected by the rule engine.",
      recommendation: "Design looks solid. Consider adding decoupling capacitors near ICs as best practice.",
      severity: "info",
      substitutes: [],
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
    trace,
    breakdown: {
      totalComponents,
      estimatedCost: Number(estimatedCost.toFixed(2)),
      ...counts,
    },
  };
}

module.exports = { analyzeCircuit, findInLibrary, findByName, extractFeatures, LIBRARY };
