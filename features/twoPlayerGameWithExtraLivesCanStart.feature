Feature: Can a two player game start with extra lives feature enabled?
    Games should be startable.

    Background:
        Given the following players are in a lobby:
            | name  |
            | Alice |
            | Bob   |

    Scenario: The game will start when all players are ready and will deal cards normally
        Given Alice is ready
        And Bob is ready
        When Alice wants to start the game with options:
            | option              | value |
            | TwoPlayerExtraLives | true  |
        Then the GameEvents do not contain the following:
            | __type                | player |
            | playerExchangingCards | Alice  |
        And the GameEvents contain the following:
            | __type    |
            | gameReady |