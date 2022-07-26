#!/usr/bin/env node

import dotenv from 'dotenv'
dotenv.config()

var listenPort = parseInt(process.env.PORT);
if (!listenPort) { listenPort = 3000; }

import GameServer from './src/Server/GameServer.js';
import TestGames from './src/Server/TestGames.js';

var gs = new GameServer(listenPort);

var createTestGames = process.env.TESTGAMES?.toLowerCase();
createTestGames = (createTestGames == 'yes' || createTestGames == 'true' || createTestGames == '1');
if (createTestGames) { new TestGames(gs); }

gs.run();