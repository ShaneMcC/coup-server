Feature: Can a player claim Income without any challenges?

  Background: 
    Given the following players are in a game:
      | name    | Influence1 | Influence2 |
      | Alice   | Assassin   | Ambassador |
      | Bob     | Duke       | Duke       |
      | Charlie | Captain    | Contessa   |

  Scenario: Alice wants Income
    When Alice wants to claim INCOME
    Then the GameEvents contain the following:
      | __type            | player | coins |
      | playerGainedCoins | Alice  |     1 |
    And Alice has 3 coins remaining
    Then Bob is the current player
