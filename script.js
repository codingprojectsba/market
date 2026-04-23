let topics = [];

let predictions = [];

function loadTopics() {
    try {
        const data = localStorage.getItem("topics");
        if (data) {
            topics = JSON.parse(data);
        } else {
            // default topics (first time)
            topics = [
                "Compact Operators",
                "Spectral Theorem",
                "Fourier Series",
                "Lagrange Multipliers",
                "Heat Equation"
            ];
        }
    } catch (e) {
        console.error("Error loading topics:", e);
        topics = [];
    }
}

function saveTopics() {
    localStorage.setItem("topics", JSON.stringify(topics));
}

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

function renderTopicsAndSelect() {
    const topicDiv = document.getElementById("topics");
    const select = document.getElementById("topicSelect");

    topicDiv.innerHTML = "";
    select.innerHTML = "";

    topics.forEach(t => {
        // topic list
        const p = document.createElement("p");
        p.textContent = t;

        const btn = document.createElement("button");
        btn.textContent = "Delete";
        btn.style.marginLeft = "10px";
        btn.onclick = () => deleteTopic(t);

        p.appendChild(btn);
        topicDiv.appendChild(p);

        // dropdown
        const option = document.createElement("option");
        option.value = t;
        option.textContent = t;
        select.appendChild(option);
    });
}

// Initialize UI
function init() {
    loadTopics();
    loadPredictions();

    renderTopicsAndSelect(); // 👈 NEW
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
    
    document.getElementById("probInput").value = "";
    document.getElementById("stakeInput").value = "10";
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

        const mp = document.createElement("p");
        mp.textContent = `${t}: ${marketProb.toFixed(2)} (n=${preds.length})`;
        marketDiv.appendChild(mp);
    });
}

function resetMarket() {
    const confirmReset = confirm("Are you sure you want to reset the market?");
    if (!confirmReset) return;

    predictions = [];
    localStorage.removeItem("predictions");

    renderTopicsAndSelect(); // optional but consistent
    updateMarket();
}

function addTopic() {
    const input = document.getElementById("newTopic");
    const value = input.value.trim();

    if (!value) return;

    if (topics.includes(value)) {
        alert("Topic already exists");
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

    // also remove related predictions
    predictions = predictions.filter(p => p.topic !== topic);
    savePredictions();
    
    renderTopicsAndSelect();
    updateMarket();
}

init();
