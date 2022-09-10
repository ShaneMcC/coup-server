Feature: Does the extra-lives feature work.

  Background:
    Given the following players are in a game:
      | name    | Influence1 | Influence2 | coins | lives |
      | Alice   | Assassin   | Ambassador | 1     | 2     |
      | Bob     | Duke       | Duke       | 20    | 1     |
      | Charlie | Captain    | None       | 10    | 1     |

  Scenario: Bob can successfully coup Alice who will still have 2 influence remaining.
    Given it is Bobs turn
    When Bob wants to claim COUP on Alice
    Then the GameEvents contain the following:
      | __type      |
      | coupSuccess |
    Then Alice reveals Assassin
    And Alice has 2 influence remaining
    And Bob has 2 influence remaining
    Then Charlie is the current player

  Scenario: It takes 3 COUPs on Alice for her to only have 1 life remaining.
    Given it is Bobs turn
    When Bob wants to claim COUP on Alice
    Then the GameEvents contain the following:
      | __type      |
      | coupSuccess |
    Then Alice reveals Assassin
    And Alice has 2 influence remaining
    And Bob has 2 influence remaining
    Then Charlie is the current player
    When Charlie wants to claim COUP on Alice
    Then the GameEvents contain the following:
      | __type      |
      | coupSuccess |
    Then Alice reveals Ambassador
    And Alice has 2 influence remaining
    Then Alice is the current player
    And Alice wants to claim INCOME
    When Bob wants to claim COUP on Alice
    Then the GameEvents contain the following:
      | __type      |
      | coupSuccess |
    Then Alice reveals card 0
    And Alice has 1 influence remaining
    And Bob has 2 influence remaining
    Then Charlie is the current player