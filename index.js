const electron = require("electron");
const { ipcRenderer } = electron;
const app = require("electron").remote;
const dialog = app.dialog;
const moment = require("moment");
const domains = document.querySelector("#domains");
const number = document.querySelector(".number");
const error = document.querySelector(".error");
const completion = document.querySelector(".completion");
const markedText = document.querySelector(".marked-text");
const progressBar = document.querySelector(".progress-bar");
const scrapeButton = document.querySelector(".boxes__button");
const saveButton = document.querySelector(".save");
const resetButton = document.querySelector(".reset");
const stopButton = document.querySelector(".stop");
const labels = document.querySelectorAll("label");
const inputs = document.querySelectorAll("input");
const yearsFrom = document.querySelector(".years-from");
const yearsTo = document.querySelector(".years-to");
const speed = document.querySelector(".speed");
const limit = document.querySelector(".limit");
const timestamp = document.querySelector(".timestamp");
const inputState = document.querySelector("#inputState");
const proxies = document.querySelector("#proxies");
const proxyCheckBox = document.querySelector(".proxy-checkbox");
const totalDomain = document.querySelector(".total-domain-number");
let numOfErrors = 0;

yearsFrom.defaultValue = 2015;
yearsTo.defaultValue = 2019;
speed.defaultValue = 200;
limit.defaultValue = 15;
timestamp.defaultValue = 6;

let arrayLength = 0;

domains.placeholder = domains.placeholder.replace(/\\n/g, "\n");
proxies.placeholder = proxies.placeholder.replace(/\\n/g, "\n");
labels.forEach((cur) => {
	cur.style.color = "white";
});
inputs.forEach((cur) => {
	cur.style.backgroundColor = "#40485a";
	cur.style.color = "white";
});

scrapeButton.addEventListener("click", function (e) {
	arrayLength = 0;
	numOfErrors = 0;
	progressBar.textContent = "0%";
	progressBar.style.width = "0%";
	error.textContent = `Total Number of Errors: ${numOfErrors}`;
	markedText.classList.remove("marked-text--idle");
	markedText.classList.remove("marked-text--green");
	markedText.classList.remove("marked-text--yellow");
	markedText.classList.add("marked-text--red");
	completion.textContent = "No";
	stopButton.disabled = false;
	stopButton.classList.remove("stop--disabled");
	const domainLis = domains.value;
	const formValues = {
		yearsFrom: yearsFrom.value,
		yearsTo: yearsTo.value,
		speed: speed.value,
		limit: limit.value,
		timestamp: timestamp.value,
		inputState: inputState.value,
		domainLis
	};
	if (proxyCheckBox.checked) {
		formValues.proxyChecked = true;
		formValues.proxyList = proxies.value;
	} else {
		formValues.proxyChecked = false;
	}
	ipcRenderer.send("domain:send", formValues);
	progressBar.classList.add("progress-bar-animated");
});

saveButton.addEventListener("click", function (e) {
	dialog.showSaveDialog(
		{
			title: "Choose A Location to Save",
			defaultPath: `*/${moment().format("YYYY-MM-DD-hh-mm")}`,
			filters: [
				{
					name: "Text File(.txt)",
					extensions: [ "txt" ]
				}
			]
		},
		(fileName) => {
			if (fileName) {
				ipcRenderer.send("domain:save", fileName);
			}
		}
	);
});

resetButton.addEventListener("click", function (e) {
	ipcRenderer.send("page:reload");
});

stopButton.addEventListener("click", function (e) {
	if (completion.textContent === "No") {
		completion.textContent = "Stopping";
		ipcRenderer.send("scrape:stop");
		progressBar.classList.remove("progress-bar-animated");
		stopButton.disabled = true;
		stopButton.classList.add("stop--disabled");
	}
});

ipcRenderer.on("list:length", function (e, length) {
	arrayLength = length;
});

ipcRenderer.on("result:number", function (e, numberText) {
	const ratio = Math.ceil(numberText / arrayLength * 100);
	progressBar.textContent = `${ratio}%`;
	progressBar.style.width = `${ratio}%`;
	number.textContent = `Total Number of Domains Completed: ${numberText}`;
	if (ratio === 100) {
		progressBar.textContent = "Completed";
		progressBar.classList.remove("progress-bar-animated");
		markedText.classList.remove("marked-text--red");
		markedText.classList.add("marked-text--green");
		completion.textContent = "Yes";
		stopButton.disabled = "yes";
		stopButton.classList.add("stop--disabled");
	}
});

ipcRenderer.on("file:save", function (e) {
	alert("File Saved to Disk Successfully");
});

ipcRenderer.on("domain:number", function (e, totalDomainNumber) {
	totalDomain.textContent = `Total Number of Domains : ${totalDomainNumber}`;
});

ipcRenderer.on("file:notSaved", function (e) {
	alert("File could not be saved. Please try saving again.");
});

ipcRenderer.on("list:error", function (e) {
	alert("Domain List is Empty");
});

ipcRenderer.on("result:error", function (e) {
	numOfErrors++;
	error.textContent = `Total Number of Errors: ${numOfErrors}`;
});

ipcRenderer.on("scrape:stopped", function (e) {
	markedText.classList.remove("marked-text--red");
	markedText.classList.remove("marked-text--green");
	markedText.classList.add("marked-text--yellow");
	completion.textContent = "Stopped";
});
