# coup-server
Game Server for running Coup Games, played using [coup-client](https://github.com/shanemcc/coup-client)

The latest version of this can be found running at https://coup.ds.df.vg/

# TODO: Installation and Running

It runs in docker (registry.shanemcc.net/coup/server:latest), you need to either expose the whole port, or you can expose it just under a `/socket.io` path prefix if your frontend proxy allows.

There are some env vars for config:

 - `PORT` (Default: 3000) - Port to run on
 - `ADMINAUTHTOKEN` (Default: Random UUID) - Admin panel access
 - `PUBLICGAMES` (Default: True) - Allow publicly created games
 - `DEBUGGAMES` (Default: False) - Output debugging info to stdout for all games
 - `TESTGAMES` (Default: False) - On startup, create a dummy test game.
 - `PERSISTGAMES` (Default: False) - Save games to disk on exit.
 - `SAVELOCATION` (Default: '<Location of server.js>/gamedata/') - Where to save game json files.

# How it works

The `GameServer` manages creating and interacting with `Game` objects, which host the main logic. `Game` is entirely Event driven.

Game-Related actions will emit events which are stored and processed by the client/server for state tracking, which allows any game to be able to be rewound to any point or replayed exactly to a point given the same event stream.

All events are sent to the client to display and maintain state as required.

`ClientMiddleware` within the `GameSever` augments the standard game state events by adding additional events for the client to know what to display, and to hide unneeded information (such as other player cards or userids to prevent cheating)

# Testing and Game Logic

This implementation aims to be feature-complete and fully rules-accurate.

All game-related interactions are (or should be!) fully tested using gherkin syntax in the `./features` directory.

Missing or additional logic tests are always welcome to ensure all rules are correctly interpeted, or descriptions of untested scenarios and expected outcomes. (Ideally in this instance a link to a game showing the scenario and a description of the expected outcome can help)

# Comments, Questions, Bugs, Feature Requests etc.
Bugs and Feature Requests should be raised on the [issue tracker on github](https://github.com/ShaneMcC/coup-server/issues), and I'm happy to recieve code pull requests via github, however I may not always accept every pull request if it does not meet my vision for the project.

Game-UI related bugs can be raised on the [coup-client issue tracker](https://github.com/ShaneMcC/coup-client/issues) instead. If in doubt, raise it here.

If reporting a bug with game logic, a link to a public game (on https://coup.ds.df.vg) where the bug occured can help with reproduction and fixing, or a complete event stream of the game from a private instance.

I can be found idling on various different IRC Networks, but the best way to get in touch would be to message "Dataforce" on Quakenet (or chat in #Dataforce), or drop me a mail (email address is in my github profile)