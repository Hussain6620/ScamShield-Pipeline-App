async function checkMessage() {
    const message = document.getElementById("message").value;
    const resultBox = document.getElementById("result");

    try {
        const response = await fetch("/api/check", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: message })
        });

        const data = await response.json();

        if (!response.ok) {
            resultBox.className = "result high";
            resultBox.style.display = "block";
            resultBox.innerHTML = "<strong>Error:</strong> " + data.error;
            return;
        }

        const riskClass = data.risk.toLowerCase();

        resultBox.className = "result " + riskClass;
        resultBox.style.display = "block";

        let reasons = "No common warning words detected.";

        if (data.reasons.length > 0) {
            reasons = data.reasons.join(", ");
        }

        resultBox.innerHTML =
            "<h3>Risk Level: " + data.risk + "</h3>" +
            "<p><strong>Detected warning words:</strong> " + reasons + "</p>" +
            "<p><strong>Contains a link:</strong> " + (data.hasLink ? "Yes" : "No") + "</p>";
    } catch (error) {
        resultBox.className = "result high";
        resultBox.style.display = "block";
        resultBox.innerHTML =
            "<strong>Error:</strong> Unable to check the message. Please try again.";
    }
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("checkButton").addEventListener("click", checkMessage);
});