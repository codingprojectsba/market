const TOPICS_STORAGE_KEY = "topics";
const PREDICTIONS_STORAGE_KEY = "distributionPredictions";

const DEFAULT_TOPICS = [
    "Compact Operators",
    "Spectral Theorem",
    "Fourier Series",
    "Lagrange Multipliers",
    "Heat Equation"
];

const X_MIN = 0;
const X_MAX = 10;
const GRID_SIZE = 201;

let topics = [];
let predictions = [];
let distributionChart = null;

function loadTopics() {
    try {
        const data = localStorage.getItem(TOPICS_STORAGE_KEY);

        if (data === null) {
            topics = [...DEFAULT_TOPICS];
        } else {
            const parsed = JSON.parse(data);
            topics = Array.isArray(parsed) ? parsed : [...DEFAULT_TOPICS];
        }
    } catch (e) {
        console.error("Error loading topics:", e);
        topics = [...DEFAULT_TOPICS];
    }
}

function saveTopics() {
    localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(topics));
}

function loadPredictions() {
    try {
        const data = localStorage.getItem(PREDICTIONS_STORAGE_KEY);
        predictions = data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Error loading predictions:", e);
        predictions = [];
    }
}

function savePredictions() {
    localStorage.setItem(PREDICTIONS_STORAGE_KEY, JSON.stringify(predictions));
}

function getGrid() {
    const xs = [];

    for (let i = 0; i < GRID_SIZE; i++) {
        const x = X_MIN + (i / (GRID_SIZE - 1)) * (X_MAX - X_MIN);
        xs.push(x);
    }

    return xs;
}

function normalPDF(x, mu, sigma) {
    return Math.exp(-0.5 * ((x - mu) / sigma) ** 2);
}

function normalize(values) {
    const total = values.reduce((a, b) => a + b, 0);

    if (total === 0) {
        return values;
    }

    return values.map(v => v / total);
}

function distributionFromPrediction(prediction) {
    const xs = getGrid();
    const ys = xs.map(x => normalPDF(x, prediction.mu, prediction.sigma));

    return normalize(ys);
}

function aggregateDistribution(topicPredictions) {
    if (topicPredictions.length === 0) {
        return null;
    }

    const result = new Array(GRID_SIZE).fill(0);
    let totalWeight = 0;

    topicPredictions.forEach(prediction => {
        const dist = distributionFromPrediction(prediction);
        const weight = prediction.stake;

        totalWeight += weight;

        dist.forEach((value, i) => {
            result[i] += value * weight;
        });
    });

    if (totalWeight === 0) {
        return null;
    }

    return result.map(v => v / totalWeight);
}

function getQuantile(distribution, q) {
    const xs = getGrid();
    let cumulative = 0;

    for (let i = 0; i < distribution.length; i++) {
        cumulative += distribution[i];

        if (cumulative >= q) {
            return xs[i];
        }
    }

    return xs[xs.length - 1];
}

function getMean(distribution) {
    const xs = getGrid();

    return distribution.reduce((sum, value, i) => {
        return sum + value * xs[i];
    }, 0);
}

function buildPredictionFromInputs() {
    const topic = document.getElementById("topicSelect").value;
    const lower = parseFloat(document.getElementById("lowerInput").value);
    const median = parseFloat(document.getElementById("medianInput").value);
    const upper = parseFloat(document.getElementById("upperInput").value);
    const stake = parseFloat(document.getElementById("stakeInput").value);

    if (!topic) {
        throw new Error("Please add or select a question first.");
    }

    if ([lower, median, upper, stake].some(Number.isNaN)) {
        throw new Error("Please fill in lower 25%, median, upper 75%, and stake.");
    }

    if (lower < X_MIN || upper > X_MAX || median < X_MIN || median > X_MAX) {
        throw new Error(`Values must be between ${X_MIN} and ${X_MAX}.`);
    }

    if (!(lower < median && median < upper)) {
        throw new Error("You need lower 25% < median < upper 75%.");
    }

    if (stake <= 0) {
        throw new Error("Stake must be positive.");
    }

    const mu = median;
    const sigma = Math.max((upper - lower) / 1.349, 0.05);

    return {
        topic,
        lower,
        median,
        upper,
        mu,
        sigma,
        stake,
        createdAt: Date.now()
    };
}

function renderTopicsAndSelect() {
    const topicDiv = document.getElementById("topics");
    const select = document.getElementById("topicSelect");

    topicDiv.innerHTML = "";
    select.innerHTML = "";

    topics.forEach(t => {
        const p = document.createElement("p");
        p.textContent = t;

        const btn = document.createElement("button");
        btn.textContent = "Delete";
        btn.style.marginLeft = "10px";
        btn.onclick = () => deleteTopic(t);

        p.appendChild(btn);
        topicDiv.appendChild(p);

        const option = document.createElement("option");
        option.value = t;
        option.textContent = t;
        select.appendChild(option);
    });
}

function initChart() {
    const ctx = document.getElementById("distributionChart");

    distributionChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: getGrid().map(x => x.toFixed(2)),
            datasets: [
                {
                    label: "Market distribution",
                    data: [],
                    tension: 0.25,
                    fill: false
                },
                {
                    label: "Your draft prediction",
                    data: [],
                    tension: 0.25,
                    fill: false,
                    borderDash: [5, 5]
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        title: items => `x = ${items[0].label}`
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Outcome"
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Probability density"
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

function updateChart() {
    if (!distributionChart) return;

    const selectedTopic = document.getElementById("topicSelect").value;
    const topicPredictions = predictions.filter(p => p.topic === selectedTopic);
    const marketDistribution = aggregateDistribution(topicPredictions);

    distributionChart.data.datasets[0].data = marketDistribution ?? [];

    try {
        const draftPrediction = buildPredictionFromInputs();
        const draftDistribution = distributionFromPrediction(draftPrediction);
        distributionChart.data.datasets[1].data = draftDistribution;
    } catch {
        distributionChart.data.datasets[1].data = [];
    }

    distributionChart.update();
}

function init() {
    loadTopics();
    loadPredictions();

    renderTopicsAndSelect();
    initChart();
    updateMarket();

    document.getElementById("topicSelect").addEventListener("change", updateMarket);

    ["lowerInput", "medianInput", "upperInput"].forEach(id => {
        document.getElementById(id).addEventListener("input", updateChart);
    });
}

function submitPrediction() {
    let prediction;

    try {
        prediction = buildPredictionFromInputs();
    } catch (e) {
        alert(e.message);
        return;
    }

    predictions.push(prediction);
    savePredictions();

    updateMarket();

    document.getElementById("lowerInput").value = "";
    document.getElementById("medianInput").value = "";
    document.getElementById("upperInput").value = "";
    document.getElementById("stakeInput").value = "10";
}

function updateMarket() {
    const marketDiv = document.getElementById("market");

    marketDiv.innerHTML = "";

    topics.forEach(t => {
        const topicPredictions = predictions.filter(p => p.topic === t);
        const distribution = aggregateDistribution(topicPredictions);

        const p = document.createElement("p");

        if (!distribution) {
            p.textContent = `${t}: no predictions yet`;
        } else {
            const mean = getMean(distribution);
            const q25 = getQuantile(distribution, 0.25);
            const q50 = getQuantile(distribution, 0.50);
            const q75 = getQuantile(distribution, 0.75);

            p.textContent =
                `${t}: mean=${mean.toFixed(2)}, ` +
                `lower 25%=${q25.toFixed(2)}, ` +
                `median=${q50.toFixed(2)}, ` +
                `upper 75%=${q75.toFixed(2)} ` +
                `(n=${topicPredictions.length})`;
        }

        marketDiv.appendChild(p);
    });

    updateChart();
}

function resetMarket() {
    const confirmReset = confirm("Are you sure you want to reset all predictions?");
    if (!confirmReset) return;

    predictions = [];
    localStorage.removeItem(PREDICTIONS_STORAGE_KEY);

    updateMarket();
}

function resetAll() {
    const confirmReset = confirm("Reset EVERYTHING, including questions and predictions?");
    if (!confirmReset) return;

    localStorage.removeItem(TOPICS_STORAGE_KEY);
    localStorage.removeItem(PREDICTIONS_STORAGE_KEY);

    location.reload();
}

function addTopic() {
    const input = document.getElementById("newTopic");
    const value = input.value.trim();

    if (!value) return;

    if (topics.includes(value)) {
        alert("Question already exists");
        return;
    }

    topics.push(value);
    saveTopics();

    renderTopicsAndSelect();
    updateMarket();

    input.value = "";
}

function deleteTopic(topic) {
    topics = topics.filter(t => t !== topic);
    saveTopics();

    predictions = predictions.filter(p => p.topic !== topic);
    savePredictions();

    renderTopicsAndSelect();
    updateMarket();
}

init();
