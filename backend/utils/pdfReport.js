const PDFDocument = require("pdfkit");

function generateProjectPDF(project, res) {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${project.projectName.replace(/\s+/g, "_")}_genome_report.pdf"`
  );
  doc.pipe(res);

  doc.fontSize(22).fillColor("#1e293b").text("Circuit Genome AI - Project Report", { align: "center" });
  doc.moveDown();
  doc.fontSize(10).fillColor("#64748b").text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
  doc.moveDown(1.5);

  doc.fontSize(14).fillColor("#0f172a").text("Project Summary");
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#334155");
  doc.text(`Project Name: ${project.projectName}`);
  doc.text(`Description: ${project.description || "-"}`);
  doc.text(`Application: ${project.application || "-"}`);
  doc.text(`Voltage: ${project.voltage} V`);
  doc.text(`Current: ${project.current} mA`);
  doc.text(`Created: ${new Date(project.createdDate).toLocaleDateString()}`);
  doc.moveDown();

  doc.fontSize(14).fillColor("#0f172a").text("Circuit Information");
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#334155");
  doc.text(`Components (${project.components.length}): ${project.components.join(", ")}`);
  doc.moveDown();

  doc.fontSize(14).fillColor("#0f172a").text(`Genome Score: ${project.analysis.overallScore}%`);
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#334155");
  Object.entries(project.analysis.genome).forEach(([k, v]) => {
    doc.text(`${capitalize(k)}: ${v}%`);
  });
  doc.moveDown();

  if (project.mlComparison) {
    doc.fontSize(14).fillColor("#0f172a").text("Rule Engine vs. Hybrid ML Prediction");
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#334155");
    doc.text(`Rule-Based Overall Score: ${project.analysis.overallScore}%`);
    doc.text(`ML-Predicted Overall Score: ${project.mlComparison.predicted}% (${project.mlComparison.modelType})`);
    doc.moveDown();
  }

  doc.fontSize(14).fillColor("#0f172a").text("Risk Analysis");
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#334155");
  const r = project.analysis.risk;
  doc.text(`Thermal Risk: ${r.thermalRisk}%`);
  doc.text(`Electrical Risk: ${r.electricalRisk}%`);
  doc.text(`Cost Risk: ${r.costRisk}%`);
  doc.text(`Manufacturing Risk: ${r.manufacturingRisk}%`);
  doc.text(`Repair Risk: ${r.repairRisk}%`);
  doc.text(`Overall Risk: ${r.overallRisk}% (${r.status})`);
  doc.moveDown();

  doc.fontSize(14).fillColor("#0f172a").text("Improvement Suggestions");
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#334155");
  project.analysis.recommendations.forEach((rec, i) => {
    doc.text(`${i + 1}. [${rec.severity.toUpperCase()}] ${rec.issue}`);
    doc.text(`   -> ${rec.recommendation}`);
    doc.moveDown(0.2);
  });
  doc.moveDown();

  doc.fontSize(14).fillColor("#0f172a").text("Conclusion");
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#334155").text(
    `This design scored ${project.analysis.overallScore}% overall with a ${r.status} risk profile. ` +
      `Addressing the suggestions above should improve reliability, safety, and manufacturability.`
  );

  doc.end();
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

module.exports = { generateProjectPDF };
