const topics = [
    "Compact Operators",
    "Spectral Theorem",
    "Fourier Series",
    "Lagrange Multipliers",
    "Heat Equation"
];

let predictions = [];

// Initialize UI
function init() {
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
        p.textContent = `${t}: ${marketProb.toFixed(2)}`;
        marketDiv.appendChild(p);
    });
}

init();
