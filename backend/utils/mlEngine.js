/**
 * Hybrid ML comparison layer.
 *
 * This is intentionally a small, dependency-free linear regression model
 * (trained via gradient descent on synthetically generated circuits) rather
 * than a black box — the goal is to demonstrate a learned scoring path
 * alongside the transparent rule engine, and let the two be compared, not
 * to replace the rule engine's explainability.
 *
 * "Ground truth" for the synthetic training data is generated from a
 * perturbed version of the same engineering heuristics the rule engine
 * uses, plus Gaussian-like noise, so the ML model has to learn an
 * approximation of the relationship rather than memorize the exact rules.
 */
const { extractFeatures } = require("./genomeEngine");

const FEATURE_NAMES = [
  "bias", "ic", "passive", "resistor", "protection", "regulatorLinear",
  "relay", "heatProducing", "thermalMitigation", "unknown",
  "totalComponents", "voltage", "current", "estimatedCost",
];

function toFeatureVector({ counts, totalComponents, voltage, current, estimatedCost }) {
  return [
    1,
    counts.ic, counts.passive, counts.resistor, counts.protection,
    counts.regulatorLinear, counts.relay, counts.heatProducing,
    counts.thermalMitigation, counts.unknown,
    totalComponents, voltage / 12, current / 500, estimatedCost,
  ];
}

function pseudoRandom(seed) {
  // Deterministic PRNG so training is reproducible across server restarts.
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function syntheticGroundTruth(counts, totalComponents, voltage, current, estimatedCost, rand) {
  let score = 85;
  if (counts.regulatorLinear > 0 && current > 300) score -= 22;
  if (counts.relay > 0 && counts.protection === 0) score -= 20;
  if (counts.heatProducing > 0 && counts.thermalMitigation === 0) score -= 12;
  if (counts.unknown > 0) score -= counts.unknown * 3;
  if (totalComponents > 15) score -= 8;
  if (voltage > 24 && counts.protection === 0) score -= 8;
  score -= estimatedCost * 0.4;
  score += (rand() - 0.5) * 10; // noise
  return Math.max(5, Math.min(98, score));
}

function generateSyntheticDataset(n = 400, seed = 42) {
  const rand = pseudoRandom(seed);
  const X = [];
  const y = [];
  for (let i = 0; i < n; i++) {
    const counts = {
      ic: Math.floor(rand() * 6),
      passive: Math.floor(rand() * 10),
      resistor: Math.floor(rand() * 10),
      protection: Math.floor(rand() * 2),
      regulatorLinear: rand() > 0.6 ? 1 : 0,
      relay: rand() > 0.7 ? 1 : 0,
      heatProducing: Math.floor(rand() * 2),
      thermalMitigation: rand() > 0.6 ? 1 : 0,
      unknown: Math.floor(rand() * 2),
    };
    const totalComponents = counts.ic + counts.passive + counts.resistor + 2;
    const voltage = 3 + rand() * 30;
    const current = 50 + rand() * 900;
    const estimatedCost = totalComponents * (0.1 + rand() * 0.8);

    X.push(toFeatureVector({ counts, totalComponents, voltage, current, estimatedCost }));
    y.push(syntheticGroundTruth(counts, totalComponents, voltage, current, estimatedCost, rand));
  }
  return { X, y };
}

/**
 * Ridge-regularized closed-form linear regression: w = (X^T X + λI)^-1 X^T y.
 * Chosen over plain gradient descent because it's numerically stable without
 * needing per-feature normalization or learning-rate tuning — appropriate
 * for the ~14-feature, few-hundred-row synthetic dataset used here.
 */
function trainLinearRegression(X, y, { lambda = 1.0 } = {}) {
  const n = X.length;
  const d = X[0].length;

  const XtX = Array.from({ length: d }, () => new Array(d).fill(0));
  const Xty = new Array(d).fill(0);

  for (let i = 0; i < n; i++) {
    for (let a = 0; a < d; a++) {
      Xty[a] += X[i][a] * y[i];
      for (let b = 0; b < d; b++) {
        XtX[a][b] += X[i][a] * X[i][b];
      }
    }
  }
  for (let a = 0; a < d; a++) XtX[a][a] += lambda; // ridge term

  return solveLinearSystem(XtX, Xty);
}

// Gaussian elimination with partial pivoting for a small dense d x d system.
function solveLinearSystem(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row;
    }
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const pivotVal = M[col][col] || 1e-9;
    for (let k = col; k <= n; k++) M[col][k] /= pivotVal;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col];
      for (let k = col; k <= n; k++) M[row][k] -= factor * M[col][k];
    }
  }
  return M.map((row) => row[n]);
}

function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

// Train once at module load (few hundred ms) and cache the weights.
let cachedModel = null;
function getModel() {
  if (cachedModel) return cachedModel;
  const { X, y } = generateSyntheticDataset(400, 42);
  const weights = trainLinearRegression(X, y);
  cachedModel = { weights, trainedOn: X.length, features: FEATURE_NAMES };
  return cachedModel;
}

/**
 * Predict a 0-100 overall score from the same circuit input the rule engine
 * receives, using the trained linear model, and return the top contributing
 * features so the comparison is not a black box either.
 */
function predictScore({ voltage, current, components }) {
  const model = getModel();
  const featureData = extractFeatures({ voltage, current, components });
  const vector = toFeatureVector(featureData);
  const raw = dot(model.weights, vector);
  const predicted = Math.max(0, Math.min(100, raw));

  const contributions = FEATURE_NAMES.map((name, i) => ({
    feature: name,
    contribution: Number((model.weights[i] * vector[i]).toFixed(2)),
  }))
    .filter((c) => Math.abs(c.contribution) > 0.5)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 5);

  return {
    predicted: Math.round(predicted),
    modelType: "Ridge Linear Regression (closed-form, trained on synthetic data)",
    trainedOn: model.trainedOn,
    topContributions: contributions,
  };
}

module.exports = { predictScore, generateSyntheticDataset, trainLinearRegression, getModel };
