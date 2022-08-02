Feature: Can a player exchange with the deck?

  Background:
    Given the following players are in a game:
      | name    | Influence1 | Influence2 | coins |
      | Alice   | Assassin   | Ambassador | 5     |
      | Bob     | Duke       | Duke       | 5     |
      | Charlie | Captain    | Contessa   | 5     |

  Scenario: Alice wants to exchange and is challenged but exposes her assassin.
    When Alice wants to claim EXCHANGE
    And Bob challenges the Action
    Then Alice reveals Assassin
    Then Bob is the current player
    And Alice has 1 influence remaining

  Scenario: Alice wants to exchange and is challenged.
    When Alice wants to claim EXCHANGE
    And Bob challenges the Action
    Then Alice reveals Ambassador
    And Bob reveals Duke
    Then Alice wants to claim EXCHANGE on ASSASSIN
    And Alice wants to exchange card 0
    Then Bob is the current player
    And Bob has 1 influence remaining
    And Alice has 2 influence remaining

  Scenario: Alice wants to exchange when she only has 1 influence.
    When it is Charlies turn
    And Charlie wants to claim ASSASSINATE on Alice
    And all players pass the Action
    And Alice reveals Assassin
    And Alice is the current player
    And Alice has 1 influence remaining
    When Alice wants to claim EXCHANGE
    And all players pass the Action
    And Alice wants to exchange card 0
    And Alice wants to exchange card 0
    Then Bob is the current player
    And Alice has 1 influence remaining
