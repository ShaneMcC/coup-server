Feature: Can a player coup another player

  Background:
    Given the following players are in a game:
      | name    | Influence1 | Influence2 | coins |
      | Alice   | Assassin   | Ambassador | 8     |
      | Bob     | Duke       | Duke       | 10    |
      | Charlie | Captain    | None       | 10    |

  Scenario: Alice can coup but chooses not to.
    When Alice wants to claim INCOME
    Then the GameEvents contain the following:
      | __type            | player | coins |
      | playerGainedCoins | Alice  | 1     |
    And Alice has 9 coins remaining
    Then Bob is the current player

  Scenario: Bob can not take income because they have over 10 coins.
    Given it is Bobs turn
    When Bob wants to claim INCOME
    Then the ClientEvents for Bob contain the following:
      | __type      |
      | actionError |
    Then the GameEvents do not contain the following:
      | __type            | player | coins |
      | playerGainedCoins | Bob    | 1     |

  Scenario: Bob can successfully coup Alice
    Given it is Bobs turn
    When Bob wants to claim COUP on Alice
    Then the GameEvents contain the following:
      | __type      |
      | coupSuccess |
    Then Alice reveals Assassin
    And Alice has 1 influence remaining
    And Bob has 2 influence remaining
    Then Charlie is the current player
    And Bob has 3 coins remaining

  Scenario: Bob can successfully coup Charlie
    Given it is Bobs turn
    When Bob wants to claim COUP on Charlie
    Then the GameEvents contain the following:
      | __type      |
      | coupSuccess |
    Then Charlie reveals Captain
    And Charlie has 0 influence remaining
    And Bob has 2 influence remaining
    Then Alice is the current player


  Scenario: Bob can successfully coup Alice's Assassin with CallTheCoup enabled
    Given The variant CallTheCoup is enabled
    And it is Bobs turn
    When Bob wants to claim COUP on Alice
    Then the GameEvents do not contain the following:
      | __type      |
      | coupSuccess |
    When Bob wants to claim COUP on ASSASSIN
    Then the GameEvents contain the following:
      | __type      |
      | coupSuccess |
    And Alice has 1 influence remaining
    And Bob has 2 influence remaining
    Then Charlie is the current player
    And Bob has 3 coins remaining

  Scenario: Bob can not successfully coup Alice's Duke with CallTheCoup enabled
    Given The variant CallTheCoup is enabled
    And it is Bobs turn
    When Bob wants to claim COUP on Alice
    Then the GameEvents do not contain the following:
      | __type      |
      | coupSuccess |
    When Bob wants to claim COUP on DUKE
    Then the GameEvents contain the following:
      | __type      |
      | coupFailed  |
    And Alice has 2 influence remaining
    And Bob has 2 influence remaining
    Then Charlie is the current player
    And Bob has 3 coins remaining

  Scenario: Bob can successfully coup Charlie with CallTheCoup enabled
    Given The variant CallTheCoup is enabled
    And it is Bobs turn
    When Bob wants to claim COUP on Charlie
    When Bob wants to claim COUP on CAPTAIN
    Then the GameEvents contain the following:
      | __type      |
      | coupSuccess |
    Then Charlie reveals Captain
    And Charlie has 0 influence remaining
    And Bob has 2 influence remaining
    Then Alice is the current player
