#!/usr/bin/env node

import GameServer from './src/Server/GameServer.js';
import Crypto from 'crypto';
import process from 'process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
import { uniqueNamesGenerator, adjectives as adjectiveList, colors as colourList, animals as animalList } from 'unique-names-generator';

import dotenv from 'dotenv'
dotenv.config()

const $appConfig = {
    listenPort: parseInt(process.env.PORT) || 3000,
    adminAuthToken: process.env.ADMINAUTHTOKEN || Crypto.randomUUID(),
    publicGames: process.env.PUBLICGAMES?.toLowerCase().match(/^(yes|true|1|on)$/) || true,
    debugGames: process.env.DEBUGGAMES?.toLowerCase().match(/^(yes|true|1|on)$/) || false,
    persistGames: process.env.PERSISTGAMES?.toLowerCase().match(/^(yes|true|1|on)$/) || false,
    testGames: process.env.TESTGAMES?.toLowerCase().match(/^(yes|true|1|on)$/) || false,
    saveLocation: process.env.SAVELOCATION || __dirname + '/gamedata/',
}

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
        var game = gs.getGame(gameid);

        if (game.ended) {
            console.log(`\tGame ended. Removing.`);
            gs.removeGame(gameid);
        }
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