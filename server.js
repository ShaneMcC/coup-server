#!/usr/bin/env node

import GameServer from './src/Server/GameServer.js';
import TestGames from './src/Server/TestGames.js';
import Crypto from 'crypto';
import process from 'process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

import dotenv from 'dotenv'
dotenv.config()

const $appConfig = {
    listenPort: parseInt(process.env.PORT) || 3000,
    adminAuthToken: process.env.ADMINAUTHTOKEN || Crypto.randomUUID(),
    publicGames: process.env.PUBLICGAMES || true,
    debugGames: process.env.DEBUGGAMES || false,
    persistGames: process.env.PERSISTGAMES || false,
    testGames: process.env.TESTGAMES?.toLowerCase().match(/^(yes|true|1|on)$/) || false,
    saveLocation: process.env.SAVELOCATION || __dirname + '/gamedata/',
}

var gs = new GameServer($appConfig);

if ($appConfig.testGames) {
    new TestGames(gs);
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