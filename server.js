#!/usr/bin/env node

import GameServer from './src/Server/GameServer.js';
import TestGames from './src/Server/TestGames.js';
import Crypto from 'crypto';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

import dotenv from 'dotenv'
dotenv.config()

const $appConfig = {
    listenPort: parseInt(process.env.PORT) || 3000,
    adminAuthToken: process.env.ADMINAUTHTOKEN || Crypto.randomUUID(),
    debugGames: process.env.DEBUGGAMES || false,
    testGames: process.env.TESTGAMES?.toLowerCase().match(/^(yes|true|1|on)$/) || false,
    saveLocation: process.env.SAVELOCATION || __dirname + '/gamedata/',
}

var gs = new GameServer($appConfig);

if ($appConfig.testGames) {
    new TestGames(gs);
}

gs.run();