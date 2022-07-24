Feature: Can a player win the game?

  Background: 
    Given the following players are in a game:
      | name    | Influence1 | Influence2 | coins |
      | Alice   | Assassin   | None       |    7 |
      | Bob     | Duke       | None       |    7 |
      | Charlie | Captain    | None       |    7 |

  Scenario: Charlie can win the game with a Coup
    When Alice wants to claim COUP on Bob
    And Bob reveals Duke
    When Charlie wants to claim COUP on Alice
    And Alice reveals Assassin
    Then Charlie is the current player
    And the GameEvents contain the following:
      | __type   | winner  |
      | gameOver | Charlie |


  @current
  Scenario: Alice can win the game with a challenged Assassination
    When Alice wants to claim COUP on Bob
    And Bob reveals Duke
    When Charlie wants to claim ASSASSINATE on Alice
     And Alice challenges
     And Charlie reveals Captain
    Then Alice is the current player
    And the GameEvents contain the following:
      | __type   | winner  |
      | gameOver | Alice   |
