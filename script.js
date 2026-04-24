const TOPICS_STORAGE_KEY = "topics";
const PREDICTIONS_STORAGE_KEY = "distributionPredictions";

const DEFAULT_TOPICS = [
    {
        id: "compact-operators",
        name: "Compact Operators",
        type: "numeric",
        min: 0,
        max: 10,
        unit: "score"
    },
    {
        id: "spectral-theorem",
        name: "Spectral Theorem",
        type: "numeric",
        min: 0,
        max: 10,
        unit: "score"
    },
    {
        id: "fourier-series",
        name: "Fourier Series",
        type: "numeric",
        min: 0,
        max: 10,
        unit: "score"
    },
    {
        id: "lagrange-multipliers",
        name: "Lagrange Multipliers",
        type: "numeric",
        min: 0,
        max: 10,
        unit: "score"
    },
    {
        id: "heat-equation",
        name: "Heat Equation",
        type: "numeric",
        min: 0,
        max: 10,
        unit: "score"
    },
    {
        id: "pass-exam",
        name: "Will I pass the exam?",
        type: "binary"
    }
];

const GRID_SIZE = 201;

let topics = [];
let predictions = [];
let distributionChart = null;

function createIdFromName(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function normalizeTopic(topic) {
    if (typeof topic === "string") {
        return {
            id: createIdFromName(topic),
            name: topic,
            type: "numeric",
            min: 0,
            max: 10,
            unit: "score"
        };
    }

    return topic;
}

function loadTopics() {
    try {
        const data = localStorage.getItem(TOPICS_STORAGE_KEY);

        if (data === null) {
            topics = [...DEFAULT_TOPICS];
        } else {
            const parsed = JSON.parse(data);
            topics = Array.isArray(parsed)
                ? parsed.map(normalizeTopic)
                : [...DEFAULT_TOPICS];
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

function getSelectedTopic() {
    const selectedTopicId = document.getElementById("topicSelect").value;
    return topics.find(topic => topic.id === selectedTopicId);
}

function getTopicById(topicId) {
    return topics.find(topic => topic.id === topicId);
}

function savePredictions() {
    localStorage.setItem(PREDICTIONS_STORAGE_KEY, JSON.stringify(predictions));
}

function getGrid(topic) {
    const xs = [];

    for (let i = 0; i < GRID_SIZE; i++) {
        const x = topic.min + (i / (GRID_SIZE - 1)) * (topic.max - topic.min);
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

function distributionFromPrediction(prediction, topic) {
    const xs = getGrid(topic);
    const ys = xs.map(x => normalPDF(x, prediction.mu, prediction.sigma));

    return normalize(ys);
}

function aggregateDistribution(topicPredictions, topic) {
    if (topicPredictions.length === 0) {
        return null;
    }

    const result = new Array(GRID_SIZE).fill(0);
    let totalWeight = 0;

    topicPredictions.forEach(prediction => {
        const dist = distributionFromPrediction(prediction, topic);
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

function getQuantile(distribution, q, topic) {
    const xs = getGrid(topic);
    let cumulative = 0;

    for (let i = 0; i < distribution.length; i++) {
        cumulative += distribution[i];

        if (cumulative >= q) {
            return xs[i];
        }
    }

    return xs[xs.length - 1];
}

function getMean(distribution, topic) {
    const xs = getGrid(topic);

    return distribution.reduce((sum, value, i) => {
        return sum + value * xs[i];
    }, 0);
}

function buildPredictionFromInputs() {
    const topic = getSelectedTopic();
    const lower = parseFloat(document.getElementById("lowerInput").value);
    const median = parseFloat(document.getElementById("medianInput").value);
    const upper = parseFloat(document.getElementById("upperInput").value);
    const stake = parseFloat(document.getElementById("stakeInput").value);
    
    if (!topic) {
        throw new Error("Please add or select a question first.");
    }
    
    if (topic.type !== "numeric") {
        throw new Error("Binary questions will be added in the next step.");
    }

    if ([lower, median, upper, stake].some(Number.isNaN)) {
        throw new Error("Please fill in lower 25%, median, upper 75%, and stake.");
    }
    
    if (lower < topic.min || upper > topic.max || median < topic.min || median > topic.max) {
        throw new Error(`Values must be between ${topic.min} and ${topic.max}.`);
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
        topicId: topic.id,
        type: "numeric",
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
    
    topics.forEach(topic => {
        const p = document.createElement("p");
        
        const description =
            topic.type === "numeric"
                ? `${topic.name} (${topic.min} to ${topic.max} ${topic.unit})`
                : `${topic.name} (Yes/No)`;

        p.textContent = description;

        const btn = document.createElement("button");
        btn.textContent = "Delete";
        btn.style.marginLeft = "10px";
        btn.onclick = () => deleteTopic(topic.id);

        p.appendChild(btn);
        topicDiv.appendChild(p);

        const option = document.createElement("option");
        option.value = topic.id;
        option.textContent = topic.name;
        select.appendChild(option);
    });
}

function initChart() {
    const ctx = document.getElementById("distributionChart");

    distributionChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: []
        },
        
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        usePointStyle: true,
                        boxWidth: 10,
                        padding: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        title: items => `Outcome = ${items[0].label}`
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "Outcome"
                    },
                    ticks: {
                        maxTicksLimit: 12
                    },
                    grid: {
                        color: "rgba(0, 0, 0, 0.06)"
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Probability density"
                    },
                    beginAtZero: true,
                    ticks: {
                        maxTicksLimit: 6
                    },
                    grid: {
                        color: "rgba(0, 0, 0, 0.06)"
                    }
                }
            }
        }
    });
}

function getLatestPrediction(topicPredictions) {
    if (topicPredictions.length === 0) {
        return null;
    }

    return topicPredictions.reduce((latest, prediction) => {
        return prediction.createdAt > latest.createdAt ? prediction : latest;
    });
}

function updateChart() {
    if (!distributionChart) return;

    const selectedTopic = getSelectedTopic();
    const chartView = document.getElementById("chartView").value;

    if (!selectedTopic) return;

    if (selectedTopic.type === "binary") {
        distributionChart.data.labels = ["Yes", "No"];
        distributionChart.data.datasets = [];

        distributionChart.options.scales.x.title.text = "Outcome";
        distributionChart.options.scales.y.title.text = "Probability";

        distributionChart.update();
        return;
    }

    const topicPredictions = predictions.filter(p => p.topicId === selectedTopic.id);
    const marketDistribution = aggregateDistribution(topicPredictions, selectedTopic);

    const datasets = [];

    if (marketDistribution) {
        datasets.push({
            label: "Market distribution",
            data: marketDistribution,
            tension: 0.35,
            fill: true,
            borderWidth: 3,
            pointRadius: 0,
            backgroundColor: "rgba(54, 162, 235, 0.15)",
            borderColor: "rgba(54, 162, 235, 1)"
        });
    }

    if (chartView === "latest") {
        const latestPrediction = getLatestPrediction(topicPredictions);

        if (latestPrediction) {
            datasets.push({
                label: "Latest prediction",
                data: distributionFromPrediction(latestPrediction, selectedTopic),
                tension: 0.35,
                fill: false,
                borderDash: [6, 4],
                borderWidth: 2,
                pointRadius: 0,
                borderColor: "rgba(255, 99, 132, 1)"
            });
        }
    }

    if (chartView === "all") {
        topicPredictions.forEach((prediction, index) => {
            datasets.push({
                label: `Prediction ${index + 1}`,
                data: distributionFromPrediction(prediction, selectedTopic),
                tension: 0.35,
                fill: false,
                borderWidth: 1.5,
                pointRadius: 0,
                borderColor: `hsla(${(index * 70) % 360}, 75%, 55%, 0.55)`
            });
        });
    }

    distributionChart.data.datasets = datasets;

    distributionChart.data.labels = getGrid(selectedTopic).map(x => x.toFixed(2));
    distributionChart.options.scales.x.title.text = selectedTopic.unit
        ? `Outcome (${selectedTopic.unit})`
        : "Outcome";

    distributionChart.options.scales.y.title.text = "Probability density";

    distributionChart.update();
}

function updateNewTopicForm() {
    const type = document.getElementById("newTopicType").value;
    const numericFields = document.getElementById("numericTopicFields");

    numericFields.style.display = type === "numeric" ? "block" : "none";
}

function init() {
    loadTopics();
    loadPredictions();

    renderTopicsAndSelect();
    initChart();
    updateMarket();
    
    document.getElementById("topicSelect").addEventListener("change", updateMarket);
    document.getElementById("chartView").addEventListener("change", updateChart);
    document.getElementById("newTopicType").addEventListener("change", updateNewTopicForm);

    updateNewTopicForm();
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

    topics.forEach(topic => {
        const topicPredictions = predictions.filter(p => p.topicId === topic.id);
        const p = document.createElement("p");

        if (topic.type === "binary") {
            p.textContent = `${topic.name}: binary market coming next`;
            marketDiv.appendChild(p);
            return;
        }

        const distribution = aggregateDistribution(topicPredictions, topic);

        if (!distribution) {
            p.textContent = `${topic.name}: no predictions yet`;
        } else {
            const mean = getMean(distribution, topic);
            const q25 = getQuantile(distribution, 0.25, topic);
            const q50 = getQuantile(distribution, 0.50, topic);
            const q75 = getQuantile(distribution, 0.75, topic);

            const unit = topic.unit ? ` ${topic.unit}` : "";

            p.textContent =
                `${topic.name}: mean=${mean.toFixed(2)}${unit}, ` +
                `lower 25%=${q25.toFixed(2)}${unit}, ` +
                `median=${q50.toFixed(2)}${unit}, ` +
                `upper 75%=${q75.toFixed(2)}${unit} ` +
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
    const nameInput = document.getElementById("newTopic");
    const typeInput = document.getElementById("newTopicType");
    const minInput = document.getElementById("newTopicMin");
    const maxInput = document.getElementById("newTopicMax");
    const unitInput = document.getElementById("newTopicUnit");

    const name = nameInput.value.trim();
    const type = typeInput.value;

    if (!name) {
        alert("Please enter a question name.");
        return;
    }

    if (topics.some(topic => topic.name.toLowerCase() === name.toLowerCase())) {
        alert("Question already exists.");
        return;
    }

    let topic;

    if (type === "numeric") {
        const min = parseFloat(minInput.value);
        const max = parseFloat(maxInput.value);
        const unit = unitInput.value.trim() || "units";

        if (Number.isNaN(min) || Number.isNaN(max)) {
            alert("Please enter valid minimum and maximum values.");
            return;
        }

        if (!(min < max)) {
            alert("Minimum value must be less than maximum value.");
            return;
        }

        topic = {
            id: createIdFromName(name),
            name,
            type: "numeric",
            min,
            max,
            unit
        };
    } else {
        topic = {
            id: createIdFromName(name),
            name,
            type: "binary"
        };
    }

    topics.push(topic);
    saveTopics();

    renderTopicsAndSelect();
    updateMarket();

    nameInput.value = "";
    typeInput.value = "numeric";
    minInput.value = "0";
    maxInput.value = "10";
    unitInput.value = "score";

    updateNewTopicForm();
}

function deleteTopic(topicId) {
    topics = topics.filter(topic => topic.id !== topicId);
    saveTopics();

    predictions = predictions.filter(prediction => prediction.topicId !== topicId);
    savePredictions();

    renderTopicsAndSelect();
    updateMarket();
}

init();
