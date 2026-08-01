import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Radar } from "react-chartjs-2";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function GenomeRadarChart({ genome }) {
  const labels = Object.keys(genome).map((k) => k.charAt(0).toUpperCase() + k.slice(1));
  const values = Object.values(genome);

  const data = {
    labels,
    datasets: [
      {
        label: "Circuit Genome",
        data: values,
        backgroundColor: "rgba(99, 102, 241, 0.25)",
        borderColor: "rgba(79, 70, 229, 1)",
        pointBackgroundColor: "rgba(79, 70, 229, 1)",
      },
    ],
  };

  const options = {
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: { stepSize: 20, showLabelBackdrop: false },
      },
    },
    plugins: {
      legend: { display: false },
    },
  };

  return <Radar data={data} options={options} />;
}
