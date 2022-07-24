Feature: Can a player claim Tax correctly?

  Background: 
    Given the following players are in a game:
      | name    | Influence1 | Influence2 |
      | Alice   | Assassin   | Ambassador |
      | Bob     | Duke       | Duke       |
      | Charlie | Captain    | Contessa   |

  Scenario: Alice wants Tax.
    When Alice wants to claim TAX
    Then the GameEvents contain the following:
      | __type                    | player | action |
      | challengeablePlayerAction | Alice  | TAX    |
    When all players pass
    Then the GameEvents contain the following:
      | __type            | player | coins |
      | playerGainedCoins | Alice  |     3 |
    And Alice has 5 coins remaining
    And Bob is the current player

  Scenario: Bob wants tax and gets challenged
    When it is Bobs turn
    And Bob wants to claim TAX
    When Charlie challenges
    Then Bob reveals DUKE
    Then the GameEvents contain the following:
      | __type                | player |
      | playerPassedChallenge | Bob    |
    Then Charlie reveals CAPTAIN
    And the GameEvents contain the following:
      | __type            | player | coins |
      | playerGainedCoins | Bob    |     3 |
    And Bob has 5 coins remaining
    And Charlie has 1 influence remaining
    And Bob has 2 influence remaining
    And Charlie is the current player

  Scenario: Alice wants tax and gets challenged
    When Alice wants to claim TAX
    And Charlie challenges
    Then Alice reveals ASSASSIN
    Then the GameEvents contain the following:
      | __type                | player |
      | playerFailedChallenge | Alice  |
    And the GameEvents do not contain the following:
      | __type            | player | coins |
      | playerGainedCoins | Alice  |     3 |
    And Alice has 2 coins remaining
    And Alice has 1 influence remaining
    And Charlie has 2 influence remaining
    And Bob is the current player
