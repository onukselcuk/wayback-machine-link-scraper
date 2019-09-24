"use strict";

const electron = require("electron");
const url = require("url");
const path = require("path");
const axios = require("axios");
const fs = require("fs");

const { app, BrowserWindow, Menu, ipcMain } = electron;

require("electron-reload")(__dirname);

let mainWindow;
let addWindow;
let domainList;
let resultsArr = [];
let yearsFrom, yearsTo, speed, limit, timestamp, inputState;
let idx = 0;
let timeOutIds = [];

//Listen for the app to be ready

app.on("ready", function () {
	//create new window
	mainWindow = new BrowserWindow({
		width: 1100,
		height: 800,
		webPreferences: {
			nodeIntegration: true
		}
	});
	//Load html into window
	mainWindow.loadURL(
		url.format({
			pathname: path.join(__dirname, "mainWindow.html"),
			protocol: "file:",
			slashes: true
		})
	);
	//Quit app when closed
	mainWindow.on("closed", function () {
		app.quit();
	});

	//Build menu from template
	const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
	//Insert the menu
	Menu.setApplicationMenu(mainMenu);
});

//Handle add window

function createAddWindow () {
	//create new window
	addWindow = new BrowserWindow({
		width: 300,
		height: 200,
		title: "Add Shopping List Item",
		webPreferences: {
			nodeIntegration: true
		}
	});
	//Load html into window
	addWindow.loadURL(
		url.format({
			pathname: path.join(__dirname, "addWindow.html"),
			protocol: "file:",
			slashes: true
		})
	);
	//Garbage Collection handle
	addWindow.on("close", function () {
		addWindow = null;
	});
}

//Catch item:add

ipcMain.on("item:add", function (e, item) {
	mainWindow.webContents.send("item:add", item);
	addWindow.close();
});

ipcMain.on("domain:send", function (e, formValues) {
	idx = 0;
	yearsFrom = formValues.yearsFrom;
	yearsTo = formValues.yearsTo;
	speed = formValues.speed;
	limit = formValues.limit;
	timestamp = formValues.timestamp;
	inputState = formValues.inputState;
	domainList = formValues.domainLis;
	if (domainList.length > 0) {
		domainList = domainList.split("\n");
		mainWindow.webContents.send("list:length", domainList.length);
		scrape();
	} else {
		mainWindow.webContents.send("list:error");
	}
});

ipcMain.on("page:reload", function (e) {
	mainWindow.reload();
	stopScraping();
});

ipcMain.on("domain:save", function (e, fileName) {
	if (fileName === undefined) {
		mainWindow.webContents.send("file:notSaved");
		return;
	}
	const arranged = resultsArr.join("\n");

	fs.writeFile(fileName, arranged, function (err) {
		if (err) {
			mainWindow.webContents.send("file:notSaved");
			return;
		} else {
			mainWindow.webContents.send("file:save");
		}
	});
});

ipcMain.on("scrape:stop", function (e) {
	stopScraping();
});

function test (i) {
	let urlString = `http://web.archive.org/cdx/search/cdx?url=${domainList[
		i
	]}&output=json&from=${yearsFrom}&to=${yearsTo}&fl=timestamp,original&collapse=timestamp:${timestamp}&filter=statuscode:200&limit=${inputState ==
	"-"
		? "-"
		: ""}${limit}`;
	axios
		.get(urlString)
		.then((res) => {
			res.data.forEach((cur, index) => {
				if (index !== 0 && res.data.length > 0) {
					const result = `https://web.archive.org/web/${cur[0]}/${cur[1]}`;
					resultsArr.push(result);
				}
			});
		})
		.then(() => {
			idx++;
			const numberText = idx;
			mainWindow.webContents.send("result:number", numberText);
		})
		.catch((e) => {
			mainWindow.webContents.send("result:error");
		});
}

function scrape () {
	resultsArr = [];
	timeOutIds = [];
	for (let i = 0; i < domainList.length; i++) {
		(function (i) {
			const timeOutId = setTimeout(function () {
				test(i);
			}, speed * i);
			timeOutIds.push(timeOutId);
		})(i);
	}
}

function stopScraping () {
	timeOutIds.forEach((cur) => {
		clearTimeout(cur);
	});
}

//Create menu template
const mainMenuTemplate = [
	{
		label: "File",
		submenu: [
			{
				label: "Quit",
				accelerator: process.platform == "darwin" ? "Command+Q" : "Ctrl+Q",
				click () {
					app.quit();
				}
			}
		]
	}
];

// If mac, add empty object to menu

if (process.platform == "darwin") {
	mainMenuTemplate.unshift({});
}

// Add developer tools item if not in prod
if (process.env.NODE_ENV !== "production") {
	mainMenuTemplate.push({
		label: "Developer Tools",
		submenu: [
			{
				label: "Toggle DevTools",
				accelerator: process.platform == "darwin" ? "Command+I" : "Ctrl+I",
				click (item, focusedWindow) {
					focusedWindow.toggleDevTools();
				}
			},
			{
				role: "reload"
			}
		]
	});
}