#!/usr/bin/env node

import GameServer from './src/Server/GameServer.js';
import Crypto from 'crypto';
import fs from 'fs';
import process from 'process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
import { uniqueNamesGenerator, adjectives as adjectiveList, colors as colourList, animals as animalList } from 'unique-names-generator';

import dotenv from 'dotenv'
dotenv.config()

function getBoolOrDefault(value, defaultValue) {
    if (value == undefined || value == null) { return defaultValue; }
    return (value.toLowerCase().match(/^(yes|true|1|on)$/) != null);
}

const $appConfig = {
    listenPort: parseInt(process.env.PORT) || 3000,
    adminAuthToken: process.env.ADMINAUTHTOKEN || Crypto.randomUUID(),
    publicGames: getBoolOrDefault(process.env.PUBLICGAMES, true),
    debugGames: getBoolOrDefault(process.env.DEBUGGAMES, false),
    persistGames: getBoolOrDefault(process.env.PERSISTGAMES, false),
    testGames: getBoolOrDefault(process.env.TESTGAMES, false),
    saveLocation: process.env.SAVELOCATION || __dirname + '/gamedata/',
    buildConfig: { gitVersion: "Unknown" },
}

if (fs.existsSync(__dirname + '/buildConfig.json')) {
    $appConfig.buildConfig = JSON.parse(fs.readFileSync(__dirname + '/buildConfig.json'));
}

console.log('App Config: ', $appConfig);

var gs = new GameServer($appConfig);

if ($appConfig.testGames) {
    gs.createTestGame('TestGame', ['Alice', 'Bob', 'Charlie']);

    const nameConfig = { dictionaries: [[...adjectiveList, ...colourList], animalList], length: 2, separator: '', style: 'capital' };
    const player1 = uniqueNamesGenerator(nameConfig);
    const player2 = uniqueNamesGenerator(nameConfig);
    const player3 = uniqueNamesGenerator(nameConfig);
    gs.createTestGame(undefined, [player1, player2, player3]);
}

if ($appConfig.persistGames) {
    // Load all the saved games...
    for (const gameid in gs.getSavedGames()) {
        console.log(`Loading saved game: ${gameid}`);
        gs.loadGame(gameid);
    }

    // Add handler for when we're exiting to try and save the games...
    function saveAllGames() {
        for (const gameid in gs.getAvailableGames()) {
            console.log(`Saving game: ${gameid}`);
            gs.saveGame(gameid);
        }
    }

    process.on('exit', saveAllGames);
}

function exitHandler(code) {
    console.log(`Exiting: ${code}`);
    process.exit(code);
}

process.on('SIGQUIT', exitHandler);
process.on('SIGINT', exitHandler);
process.on('SIGTERM', exitHandler);

gs.run();