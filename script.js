const topics = [
    "Compact Operators",
    "Spectral Theorem",
    "Fourier Series",
    "Lagrange Multipliers",
    "Heat Equation"
];

let predictions = [];

// Load from browser storage
function loadPredictions() {
    try {
        const data = localStorage.getItem("predictions");
        if (data) {
            predictions = JSON.parse(data);
        }
    } catch (e) {
        console.error("Error loading predictions:", e);
        predictions = [];
    }
}

// Save to browser storage
function savePredictions() {
    localStorage.setItem("predictions", JSON.stringify(predictions));
}

// Initialize UI
function init() {
    loadPredictions();
    
    const topicDiv = document.getElementById("topics");
    const select = document.getElementById("topicSelect");

    topics.forEach(t => {
        const p = document.createElement("p");
        p.textContent = t;
        topicDiv.appendChild(p);

        const option = document.createElement("option");
        option.value = t;
        option.textContent = t;
        select.appendChild(option);
    });

    updateMarket();
}

function submitPrediction() {
    const topic = document.getElementById("topicSelect").value;
    const prob = parseFloat(document.getElementById("probInput").value);
    const stake = parseFloat(document.getElementById("stakeInput").value);

    if (isNaN(prob) || prob < 0 || prob > 1) {
        alert("Probability must be between 0 and 1");
        return;
    }

    predictions.push({ topic, prob, stake });

    savePredictions();

    updateMarket();
}

function updateMarket() {
    const marketDiv = document.getElementById("market");
    marketDiv.innerHTML = "";

    topics.forEach(t => {
        const preds = predictions.filter(p => p.topic === t);

        let totalWeight = 0;
        let weightedSum = 0;

        preds.forEach(p => {
            totalWeight += p.stake;
            weightedSum += p.prob * p.stake;
        });

        let marketProb = preds.length > 0 ? weightedSum / totalWeight : 0.5;

        const p = document.createElement("p");
        p.textContent = `${t}: ${marketProb.toFixed(2)} (n=${preds.length})`;
        marketDiv.appendChild(p);
    });
}

function resetMarket() {
    const confirmReset = confirm("Are you sure you want to reset the market?");
    if (!confirmReset) return;

    predictions = [];
    localStorage.removeItem("predictions");
    updateMarket();
}

init();
