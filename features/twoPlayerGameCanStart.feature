Feature: Can a two player game start?
  Games should be startable.

  Background:
    Given the following players are in a lobby:
      | name    |
      | Alice   |
      | Bob     |

  Scenario: The game can not start until players are ready.
    When Alice wants to start the game
    Then the GameEvents do not contain the following:
      | __type    |
      | gameReady |

  Scenario: The game will start when all players are ready.
    Given Alice is ready
    And Bob is ready
    When Alice wants to start the game
    Then the GameEvents contain the following:
      | __type                | player | count |
      | playerExchangingCards | Alice  | 4     |
    When Alice wants to exchange card 0
     And Alice wants to exchange card 0
     And Alice wants to exchange card 0
     And Alice wants to exchange card 0
    Then the GameEvents contain the following:
      | __type                | player | count |
      | playerExchangingCards | Bob    | 4     |
    When Bob wants to exchange card 0
     And Bob wants to exchange card 0
     And Bob wants to exchange card 0
     And Bob wants to exchange card 0
    Then the GameEvents contain the following:
      | __type    |
      | gameReady |