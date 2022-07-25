#!/usr/bin/env node

"use strict";

import GameServer from './src/Server/GameServer.js';

var gs = new GameServer();
gs.run();