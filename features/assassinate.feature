Feature: Can a player assassinate correctly?

  Background:
    Given the following players are in a game:
      | name    | Influence1 | Influence2 | coins |
      | Alice   | Assassin   | Ambassador | 5     |
      | Bob     | Duke       | Duke       | 5     |
      | Charlie | Captain    | Contessa   | 5     |

  Scenario: Alice wants to Assassinate Bob unchallenged.
    When Alice wants to claim ASSASSINATE on Bob
    And all players pass
    Then Bob reveals Duke
    And Bob has 1 influence remaining
    And Alice has 2 influence remaining
    Then Bob is the current player

  Scenario: Alice wants to Assassinate Charlie and gets countered.
    When Alice wants to claim ASSASSINATE on Charlie
    And Charlie counters with BLOCK_ASSASSINATE
    And all players pass
    Then Bob is the current player
    And Charlie has 2 influence remaining
    And Alice has 2 influence remaining

  Scenario: Bob wants to Assassinate Charlie and gets challenged.
    When it is Bobs turn
    And Bob wants to claim ASSASSINATE on Charlie
    And Charlie challenges
    Then Bob reveals DUKE
    And Charlie has 2 influence remaining
    And Bob has 1 influence remaining
    And Charlie is the current player

  Scenario: Alice wants to Assassinate Charlie and gets countered.
    When Alice wants to claim ASSASSINATE on Charlie
    And Charlie counters with BLOCK_ASSASSINATE
    And all players pass
    Then Bob is the current player
    And Charlie has 2 influence remaining
    And Alice has 2 influence remaining

  Scenario: Alice wants to Assassinate Charlie and gets challenged by Charlie.
    When Alice wants to claim ASSASSINATE on Charlie
    And Charlie challenges
    Then Alice reveals Assassin
    Then Charlie reveals Contessa
    Then Charlie reveals Captain
    Then Bob is the current player
    And Charlie has 0 influence remaining
    And Bob has 2 influence remaining
    And Alice has 2 influence remaining

  Scenario: Alice wants to Assassinate Charlie and gets challenged by Bob.
    When Alice wants to claim ASSASSINATE on Charlie
    And Bob challenges
    Then Alice reveals Assassin
    Then Bob reveals Duke
    Then Charlie reveals Contessa
    Then Bob is the current player
    And Charlie has 1 influence remaining
    And Bob has 1 influence remaining
    And Alice has 2 influence remaining

  Scenario: Alice wants to Assassinate Charlie without her contessa and gets challenged by Bob.
    When Alice wants to claim ASSASSINATE on Charlie
    And Bob challenges
    Then Alice reveals Ambassador
    Then Bob is the current player
    And Charlie has 2 influence remaining
    And Bob has 2 influence remaining
    And Alice has 1 influence remaining

  Scenario: Alice wants to Assassinate Charlie and gets countered but and the counter is challenged successfully
    When Alice wants to claim ASSASSINATE on Charlie
    And Charlie counters with BLOCK_ASSASSINATE
    And Alice challenges
    And Charlie reveals Contessa
    And Alice reveals Assassin
    Then Bob is the current player
    And Charlie has 2 influence remaining
    And Bob has 2 influence remaining
    And Alice has 1 influence remaining

  Scenario: Alice wants to Assassinate Charlie and gets countered but and the counter is challenged unsuccessfully
    When Alice wants to claim ASSASSINATE on Charlie
    And Charlie counters with BLOCK_ASSASSINATE
    And Alice challenges
    And Charlie reveals Captain
    And Charlie reveals Contessa
    Then Bob is the current player
    And Charlie has 0 influence remaining
    And Bob has 2 influence remaining
    And Alice has 2 influence remaining