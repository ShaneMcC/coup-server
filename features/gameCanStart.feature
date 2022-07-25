Feature: Can a game start?
  Games should be startable.

  Background:
    Given the following players are in a lobby:
      | name    |
      | Alice   |
      | Bob     |
      | Charlie |

  Scenario: The game can not start until players are ready.
    When Alice wants to start the game
    Then the GameEvents do not contain the following:
      | __type    |
      | gameReady |

  Scenario: The game will start when all players are ready.
    Given Alice is ready
    And Bob is ready
    And Charlie is ready
    When Alice wants to start the game
    Then the GameEvents contain the following:
      | __type    |
      | gameReady |
